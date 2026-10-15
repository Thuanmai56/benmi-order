// Calls the real Workers AI model through the already configured cf auth profile.
// Synthetic evaluation data only; no customer messages or secrets are printed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const ts = require('../benmi-worker-official/node_modules/typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
}).outputText, file);
const { CLASSIFIER_VERSION, clefState, clefQuestions, regexDecision, cancellationRegex, readClefDecision } = require('../benmi-worker-official/src/modules/cancellation-intent.ts');
const run=promisify(execFile),backend=path.resolve(__dirname,'../benmi-worker-official');
const fixturePath=path.resolve(process.env.CANCELLATION_EVAL_FIXTURE || path.resolve(__dirname,'../tests/fixtures/cancellation-intents.json'));
const fixtureBytes=fs.readFileSync(fixturePath), fixture=JSON.parse(fixtureBytes);
const fixtureSha256=crypto.createHash('sha256').update(fixtureBytes).digest('hex');
const locks={'cancellation-holdout.json':'holdout-lock.json','cancellation-taiwan-holdout.json':'taiwan-holdout-lock.json'};
const lockFile=locks[path.basename(fixturePath)];
if(lockFile) {
  const lock=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../docs/proposals/order-cancellation-improvements',lockFile)));
  if(lock.sha256!==fixtureSha256)throw new Error('Locked holdout was modified');
}
const mode=process.env.CANCELLATION_EVAL_MODE || 'test';
if(!['dev','test','production'].includes(mode))throw new Error('Invalid evaluation mode');
const output=process.env.CANCELLATION_EVAL_OUTPUT || '/tmp/benmi-cancellation-eval.json';
const review=Number(process.env.CANCELLATION_REVIEW_THRESHOLD || '.60'),clear=Number(process.env.CANCELLATION_CLEAR_THRESHOLD || '.90');
async function evaluate(example,index){
  const hard=cancellationRegex(example.text),start=Date.now();
  if(hard!=='unknown') {
    const decision=regexDecision(hard,!!example.pending);
    return {...example,index,engine:'regex',p:decision.probability,...decision,latencyMs:Date.now()-start};
  }
  const evalModel = process.env.CANCELLATION_EVAL_MODEL || '@cf/cloudflare/clef-flash';
  const modelShort = evalModel.includes('clef') && !evalModel.includes('flash') ? 'clef' : 'clef-flash';
  const body={model:modelShort,state:clefState(example.text,example.status || 'ACCEPTED',
    {pending:!!example.pending,history:example.history || []}),questions:clefQuestions()};
  let stdout;
  for(let attempt=0;attempt<3;attempt++) {
    try {
      ({stdout}=await run(process.execPath,[path.join(backend,'node_modules/cf/bin/cf'),'ai','run',evalModel,'--mode',mode,'--body',JSON.stringify(body)],{cwd:backend,timeout:30000,maxBuffer:1024*1024}));
      break;
    } catch(error) {
      if(attempt===2)throw new Error(`Inference CLI failed for case ${index}: ${error.code || 'unknown'}`);
      await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));
    }
  }
  const result=JSON.parse(stdout);
  const decision=readClefDecision(result.result || result,{review,clear},!!example.pending,modelShort);
  return {...example,index,engine:modelShort,p:decision.probability,...decision,latencyMs:Date.now()-start};
}
(async()=>{
  const results=[];let cursor=0;
  // First call is a smoke check; stop instead of repeating an auth/model error 200 times.
  const first=fixture.findIndex(example=>cancellationRegex(example.text)==='unknown');
  if(first>=0)results.push(await evaluate(fixture[first],first));
  await Promise.all(Array.from({length:4},async()=>{while(cursor<fixture.length){const index=cursor++;if(index===first)continue;results.push(await evaluate(fixture[index],index));if(results.length%20===0)process.stdout.write(`Evaluated ${results.length}/${fixture.length}\n`);}}));
  results.sort((a,b)=>a.index-b.index);
  const positives=results.filter(r=>r.expectedCancel),clearHits=results.filter(r=>r.intent==='cancel'&&r.clarity==='clear'),detected=results.filter(r=>r.intent==='cancel'||r.intent==='possible_cancel');
  const precision=clearHits.length?clearHits.filter(r=>r.expectedCancel).length/clearHits.length:0;
  const recall=positives.length?detected.filter(r=>r.expectedCancel).length/positives.length:0;
  const hardNegativeFailures=detected.filter(r=>!r.expectedCancel&&r.hardNegative);
  const intentFailures=results.filter(r=>r.expectedIntent && r.intent!==r.expectedIntent);
  const pendingFailures=results.filter(r=>r.pending && r.expectedIntent && r.intent!==r.expectedIntent);
  const indirectClearFailures=results.filter(r=>r.expectedIntent==='possible_cancel' && r.clarity==='clear');
  const knownTexts=['我訂錯店了，請取消全部','Chào quán, Mình đặt trùng đơn, bỏ đơn mới nhất nhé','您好，重複下單了，最新那筆幫我取消'];
  const knownFailures=results.filter(r=>knownTexts.includes(r.text) && !['cancel','possible_cancel'].includes(r.intent));
  const screenshotFailures=results.filter(r=>r.text==='Tôi nghĩ tôi không thể lấy món' && r.clarity!=='review');
  const byLocale={};
  for(const row of results){
    const locale=row.locale || (/\p{Script=Han}/u.test(row.text)?'zh-TW':/[àáảãạăâđêôơư]/iu.test(row.text)?'vi':'und');
    (byLocale[locale] ||= []).push(row);
  }
  const localeMetrics=Object.fromEntries(Object.entries(byLocale).map(([locale,rows])=>{
    const positive=rows.filter(r=>r.expectedCancel),clear=rows.filter(r=>r.intent==='cancel'&&r.clarity==='clear');
    const falsePositives=rows.filter(r=>!r.expectedCancel&&['cancel','possible_cancel'].includes(r.intent));
    return [locale,{cases:rows.length,positives:positive.length,clearPrecision:clear.length?clear.filter(r=>r.expectedCancel).length/clear.length:null,
      combinedRecall:positive.length?positive.filter(r=>['cancel','possible_cancel'].includes(r.intent)).length/positive.length:null,
      falsePositives:falsePositives.length,hardNegativeFailures:falsePositives.filter(r=>r.hardNegative).length}];
  }));
  const zh=localeMetrics['zh-TW'];
  // Taiwan quality must not be hidden by a larger Vietnamese/English corpus.
  const primaryMarketPassed=!zh || zh.positives<10 || ((zh.clearPrecision===null || zh.clearPrecision>=.98) && zh.combinedRecall>=.95 && zh.hardNegativeFailures===0);
  const summary={classifierVersion:CLASSIFIER_VERSION,promptSha256:crypto.createHash('sha256').update(JSON.stringify(clefQuestions())).digest('hex'),fixtureSha256,fixture:path.basename(fixturePath),primaryMarket:'zh-TW',primaryMarketPassed,localeMetrics,intentFailures:intentFailures.length,pendingFailures:pendingFailures.length,indirectClearFailures:indirectClearFailures.length,knownFailures:knownFailures.length,screenshotFailures:screenshotFailures.length,cases:results.length,realModelCalls:results.filter(r=>r.engine==='clef-flash').length,review,clear,clearPrecision:precision,combinedRecall:recall,hardNegativeFailures:hardNegativeFailures.length,totalFalsePositives:detected.filter(r=>!r.expectedCancel).length,
    passed:primaryMarketPassed&&precision>=.98&&recall>=.95&&hardNegativeFailures.length===0&&knownFailures.length===0&&screenshotFailures.length===0&&pendingFailures.length===0&&indirectClearFailures.length===0};
  fs.writeFileSync(output,JSON.stringify({summary,results},null,2));console.log(JSON.stringify(summary,null,2));
  if(!summary.passed)process.exitCode=1;
})().catch(error=>{console.error('Clef evaluation failed:',error.message.split('\n')[0]);process.exitCode=1;});
