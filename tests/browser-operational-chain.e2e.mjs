import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
for(const device of ['desktop','phone'])test('M3-13a audited eight-area SKU handoffs in Chromium '+device,{timeout:160000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const ctx=await browser.newContext(device==='phone'?{...devices['Pixel 7']}:{viewport:{width:1250,height:900}});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/?m3-13a-audit='+device,{waitUntil:'networkidle'});
  const evidence=await page.evaluate(async()=>{
   const [{recoveryComparison},{campaignSnapshot},{campaignAreaReadModel}]=await Promise.all([
    import('./src/recovery.js'),import('./src/campaign.js'),import('./src/area-ledger.js')
   ]);
   return [false,true].map(separateTransport=>{
    const comparison=recoveryComparison({policy:'service',plannedOrders:200,actualOrders:280,
     option:'combined',urgentArrivalDay:2,separateTransport,
     receivingUnitCapacity:40,qualityReleasePercent:55,
     pickingUnitCapacity:18,transportUnitCapacity:4});
    const campaign=campaignSnapshot({comparison,campaignId:'M3-13A-BROWSER',plannedOrders:200});
    const view=campaignAreaReadModel({comparison,campaign,campaignId:'M3-13A-BROWSER',plannedOrders:200});
    const proof=view.chainAudit;
    return {passed:view.passed&&campaign.passed&&view.checks.chainAudit&&proof.passed,
     mode:proof.mode,days:proof.days.length,areas:proof.areaIds.length,
     orders:proof.totals.orders,staged:proof.totals.stagedOrders,shipped:proof.totals.shippedOrders,
     allDays:proof.days.every(d=>d.unpickedOrders+d.stagedOrders+d.shippedOrders===280),
     physical:proof.days.every(d=>d.onHandSkuUnits===d.pickFaceSkuUnits+d.reserveSkuUnits+d.stagingSkuUnits+d.qualityHeldSkuUnits),
     noDelivery:view.metrics.customerDeliveries===null};
   });
  });
  assert.equal(evidence.length,2);
  assert.equal(evidence[0].mode,'same-day');
  assert.equal(evidence[1].mode,'independent-staging');
  for(const data of evidence){
   assert.equal(data.passed,true);
   assert.equal(data.days,13);
   assert.equal(data.areas,8);
   assert.equal(data.orders,280);
   assert.equal(data.allDays,true);
   assert.equal(data.physical,true);
   assert.equal(data.noDelivery,true);
  }
  assert.equal(evidence[0].staged,0);
  assert.ok(evidence[1].staged>0);
  if(device==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:810});
   const d=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(d.scroll<=d.client+2,'horizontal overflow '+JSON.stringify(d));
  }
  assert.deepEqual(errors,[]);
 }finally{await ctx.close();await browser.close()}
});
