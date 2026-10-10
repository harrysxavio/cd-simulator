import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
for(const mode of ['desktop','phone'])test('M3-12b canonical staged campaign survives browser module loading '+mode,{timeout:160000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const ctx=await browser.newContext(mode==='phone'?{...devices['Pixel 7']}:{viewport:{width:1250,height:900}});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(BASE+'/?staging-integration='+mode,{waitUntil:'networkidle'});
  const report=await page.evaluate(async()=>{
   const [{recoveryComparison},{campaignSnapshot},{campaignAreaReadModel}]=await Promise.all([
    import('./src/recovery.js'),import('./src/campaign.js'),import('./src/area-ledger.js')]);
   const comparison=recoveryComparison({policy:'service',plannedOrders:200,actualOrders:280,
    option:'wait',pickingUnitCapacity:12,transportUnitCapacity:0,separateTransport:true});
   const campaign=campaignSnapshot({comparison,campaignId:'M3-12B-BROWSER',plannedOrders:200});
   const area=campaignAreaReadModel({comparison,campaign,campaignId:'M3-12B-BROWSER',plannedOrders:200});
   return {passed:campaign.passed&&area.passed,stage:campaign.pickingLedger.stage,
    picks:campaign.picks.length,shipped:campaign.shipments.length,staged:area.metrics.stagedOrders,
    stocked:campaign.inventoryLedger.totals.stagingSkuUnits,
    physical:area.checks.physicalConservation,
    dayCount:area.days.length,areaCount:area.stages.length,
    transport:area.stages[7].causal,
    inventory:area.stages[5].detail,
    visibleAppUsesStaging:false};
  });
  assert.equal(report.passed,true);
  assert.equal(report.stage,'independent-staging');
  assert.ok(report.picks>0);assert.equal(report.shipped,0);
  assert.equal(report.staged,report.picks);assert.ok(report.stocked>0);
  assert.equal(report.physical,true);assert.equal(report.dayCount,13);
  assert.equal(report.areaCount,8);
  assert.match(report.transport,/FIFO/);
  assert.match(report.inventory,/STAGING-CD/);
  // The experimental source is NOT injected into UI by this microphase.
  // This microphase audits the optional data model only. Opening a completed
  // campaign's UI requires advancing the user session, deferred to M3-12c.
  assert.equal(await page.locator('body').isVisible(),true);
  if(mode==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:800});
   const over=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(over<=2,'unexpected phone horizontal overflow '+over);
  }
  assert.deepEqual(errors,[]);
 }finally{await ctx.close();await browser.close()}
});
