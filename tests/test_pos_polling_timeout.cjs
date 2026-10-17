const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('a stalled orders request aborts, releases polling and allows the next refresh',async()=>{
  const source=fs.readFileSync('js/orders-core.js','utf8');
  const start=source.indexOf('async function fetchOrders()');
  const end=source.indexOf('\n}',start)+2;
  let deadline,requests=0,cleared=0;
  const context={AbortController,WORKER_BASE:'https://example.invalid',lastOrdersETag:'',
    getTenantIdFromUrl:()=> 'fixture',console:{warn(){},error(){}},
    setTimeout(callback,delay){assert.equal(delay,8000);deadline=callback;return 1;},
    clearTimeout(){cleared++;},
    fetch:async(_url,{signal})=>{requests++;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}))));}
  };
  vm.runInNewContext('let isFetchingOrders=false;'+source.slice(start,end)+';this.refresh=fetchOrders;',context);
  const stalled=context.refresh();await context.refresh();assert.equal(requests,1);
  deadline();await stalled;assert.equal(cleared,1);
  context.fetch=async()=>{requests++;return{status:304};};
  await context.refresh();assert.equal(requests,2);assert.equal(cleared,2);
});
