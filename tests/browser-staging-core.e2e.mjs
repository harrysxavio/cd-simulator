import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

for(const device of ['desktop','phone'])test('M3-12a experimental physical staging engine in Chromium '+device,{timeout:150000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const ctx=await browser.newContext(device==='phone'?{...devices['Pixel 7']}:{viewport:{width:1250,height:900}});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/?staging-core='+device,{waitUntil:'networkidle'});
  const state=await page.evaluate(async()=>{
   const {eventSimulation}=await import('./src/events.js');
   const staged=eventSimulation({separateTransport:true,policy:'service',
    orders:100,days:6,pickingUnitCapacity:12,transportUnitCapacity:0});
   const current=eventSimulation({policy:'service',
    orders:100,days:6,pickingUnitCapacity:12,transportUnitCapacity:0});
   return {
    audit:staged.stagingAudit.passed,
    prepared:staged.stagingAudit.totals.preparedOrders,
    staging:staged.stagingAudit.totals.stagingOrders,
    shipped:staged.stagingAudit.totals.shippedOrders,
    originalShipped:current.completed,originalPicked:current.ledger.reduce((n,d)=>n+d.pickedOrders,0),
    balances:Object.keys(staged.initial).every(id=>
     staged.initial[id]+staged.ledger.reduce((n,d)=>n+d.received[id],0)===
     staged.endingStock[id]+staged.endingReserveStock[id]+staged.heldQuality[id]+staged.endingStagingStock[id]+staged.consumed[id])
   };
  });
  assert.equal(state.audit,true);
  assert.ok(state.prepared>0);
  assert.equal(state.prepared,state.staging);
  assert.equal(state.shipped,0);
  assert.equal(state.originalShipped,0);
  assert.equal(state.originalPicked,0);
  assert.equal(state.balances,true);
  if(device==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:800});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(overflow<=2,'phone overflow '+overflow);
  }
  assert.deepEqual(errors,[]);
 }finally{await ctx.close();await browser.close()}
});
