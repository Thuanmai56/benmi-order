// Browser QA: requires Playwright and Chromium (or PLAYWRIGHT_CHROMIUM_EXECUTABLE).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const id = '0c60236b-0f8a-4698-9bd9-cc98e17d91ff';
test('tablet/mobile cancellation UX, translations, held actions, draft preservation and two-POS conflict', async t => {
  const server = http.createServer((request,response) => {
    const pathname = new URL(request.url,'http://localhost').pathname;
    const file=path.resolve(root,'.'+pathname);
    if (!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {response.writeHead(404);response.end();return;}
    const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png'};
    response.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});t.after(()=>browser.close());
  for (const viewport of [{width:1024,height:768},{width:768,height:1024},{width:390,height:844}]) {
    const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const order={key:'order-1',orderId:'order-1',displayKey:'1014-T001',customer:'Khách A',time:'2026-10-14 18:30',status:'NEW',createdAt:Date.now(),content:'1 × Bánh mì\n1 × Trà',total:150,diningOption:'takeaway'};
    let record={id,order_key:order.key,display_key:order.displayKey,customer_name:order.customer,pickup_time:order.time,total_amount:150,order_status:'NEW',status:'PENDING',version:1,clarity:'review',selected_latest:1,created_at:Date.now(),messages:[{message_text:'Mình không qua lấy nữa được rồi',event_at:Date.now()}]};
    let revision=1,updates=0,decisions=[],alerts=[{id:'7d818697-a2ef-4cae-b099-3c3e6bd0c501',display_key:'1014-T002',created_at:Date.now()}];
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());if(url.hostname==='127.0.0.1'){await route.continue();return;}
      if (!url.pathname.startsWith('/api/')) {await route.abort();return;}
      let body={};
      if (url.pathname==='/api/orders') body=[order];
      else if(url.pathname==='/api/order-cancellation-requests') body={revision,requests:[record],technicalAlerts:alerts};
      else if(url.pathname.endsWith('/acknowledge')) {alerts=[];revision++;body={success:true};}
      else if(url.pathname.endsWith('/resolve')) {
        decisions.push(route.request().postDataJSON());record={...record,status:'DECLINED',version:record.version+1};revision++;
        await route.fulfill({status:409,json:{code:'CANCELLATION_CONFLICT'}});return;
      }
      else if(url.pathname==='/api/update'){updates++;body={success:true};}
      else if(url.pathname==='/api/config')body={cancellationDetection:{enabled:true,review:.6,clear:.9},cancellationDetectionAvailable:true,features:[],operatingHours:{}};
      else if(url.pathname.includes('bootstrap'))body={tenant:{id:'shop-a',brandName:'Shop A',features:[],allowDineIn:false},categories:[],catalog:[],modifiers:[]};
      else if(url.pathname==='/api/menu')body={categories:[]};
      await route.fulfill({status:200,json:body,headers:{ETag:'"cancel-'+revision+'"'}});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/orders.html?tenant_id=shop-a&env=staging`);
    await page.evaluate(()=>setLanguage('vi'));
    await page.waitForSelector('#cancellation-banner:not([hidden])');
    await page.evaluate(()=>updateStatus('order-1','ACCEPTED'));
    await page.waitForSelector('#cancellationModal', {state:'visible'});assert.equal(updates,0);
    const orderBox=await page.locator('.cancel-order-context').boundingBox(),messageBox=await page.locator('.cancel-decision-panel').boundingBox();
    assert.equal(messageBox.x>orderBox.x,viewport.width>640);
    for(const button of await page.locator('[data-cancel-decision]').all()) {
      const box=await button.boundingBox();assert(box.width>=48 && box.height>=48);assert(box.y+box.height<=viewport.height);
    }
    assert.match(await page.locator('#cancellation-body').innerText(),/Khách chưa nêu mã/);
    await page.locator('#cancellation-reason').fill('Đã bắt đầu làm món');
    record={...record,version:2,customer_withdrew:1,messages:[...record.messages,{message_text:'Nhờ quán kiểm tra giúp mình',event_at:Date.now()}]};revision++;
    await page.evaluate(()=>window.fetchCancellationRequests(true));
    assert.equal(await page.locator('#cancellation-reason').inputValue(),'Đã bắt đầu làm món');
    assert.match(await page.locator('#cancellation-body').innerText(),/Khách thay đổi ý định/);
    if(process.env.CANCELLATION_QA_OUTPUT){fs.mkdirSync(process.env.CANCELLATION_QA_OUTPUT,{recursive:true});await page.locator('#cancellation-body').evaluate(node=>{node.scrollTop=0;});await page.screenshot({path:path.join(process.env.CANCELLATION_QA_OUTPUT,`pending-${viewport.width}x${viewport.height}.png`)});}
    await page.locator('[data-cancel-decision="DECLINED"]').click();
    await page.waitForFunction(()=>document.getElementById('cancellation-error')?.textContent.includes('POS khác'));
    assert.equal(decisions[0].expected_version,2);
    await page.evaluate(()=>setLanguage('zh-TW'));
    assert.match(await page.locator('#cancellation-title').innerText(),/取消申請/);
    if(process.env.CANCELLATION_QA_OUTPUT){fs.mkdirSync(process.env.CANCELLATION_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.CANCELLATION_QA_OUTPUT,`pos-${viewport.width}x${viewport.height}.png`)});}
    await page.evaluate(()=>window.openCancellationRequests());
    assert.match(await page.locator('#cancellation-body').innerText(),/尚未完成訊息辨識/);
    assert.equal(await page.locator('.cancel-technical-alert [data-cancel-decision]').count(),0);
    const ack=page.locator('[data-cancel-alert]'),ackBox=await ack.boundingBox();assert(ackBox.height>=48);
    await ack.click();await page.waitForFunction(()=>!document.querySelector('[data-cancel-alert]'));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);assert.equal(overflow,false);
    assert.deepEqual(errors,[]);await context.close();
  }
});
