import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {mkdir} from 'node:fs/promises';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-v90';
async function browserSession(mode){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mode==='mobile'?{...devices['Pixel 7']}:{viewport:{width:1240,height:850}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/?session-migrate='+mode,{waitUntil:'networkidle'});
  const original=await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).campaignId,KEY);
  // Use a persisted v2 payload exactly as prior versions wrote it; retain
  // the same browser key so users lose no completed campaign.
  await page.evaluate(KEY=>{
   const previous=JSON.parse(localStorage.getItem(KEY));
   localStorage.setItem(KEY,JSON.stringify({
    ...previous,schemaVersion:2,campaignId:'CD-MIGRATION-2026',
    revealed:true,shockDirection:1,currentSection:'dashboard',
    scenario:{...previous.scenario,demand:1000,demandShockPercent:40},
    decisions:{...previous.decisions,commercial:'under',planning:'partial',purchasing:'reliable'},
    skuPolicy:'service',skuRecovery:'emergency',
    skuUrgentArrival:1,skuPurchaseCoverage:100,skuReservePercent:0,
    skuDecisions:[{version:1,campaignId:'CD-OTHER',status:'confirmed-in-simulator',option:'wait'}]
   }));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  const after=await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
  assert.equal(after.schemaVersion,3,'old session should be migrated in-place');
  assert.equal(after.campaignId,'CD-MIGRATION-2026');
  assert.notEqual(after.campaignId,original);
  assert.equal(after.currentSection,'dashboard');
  assert.equal(after.revealed,true);
  assert.equal(after.skuRecovery,'emergency');
  assert.equal(after.scenario.demand,1000);
  assert.deepEqual(after.skuDecisions,[],'cross-campaign decisions must be rejected');
  assert.equal(await page.locator('#dashboardSection').isVisible(),true);
  const initial=await page.locator('#primarySkuMetrics strong').allInnerTexts();
  assert.deepEqual(initial,['280','279','1']);
  const sig=await page.locator('#primarySkuSummary').getAttribute('data-campaign-id');
  assert.equal(sig,'CD-MIGRATION-2026');
  await page.locator('#preliminaryTab').click();
  assert.deepEqual(await page.locator('#directorEvidence .director-stat strong').allInnerTexts(),initial);
  await page.locator('#dashboardTab').click();
  await page.reload({waitUntil:'networkidle'});
  assert.deepEqual(await page.locator('#primarySkuMetrics strong').allInnerTexts(),initial);
  assert.equal(await page.locator('#primarySkuSummary').getAttribute('data-campaign-id'),sig);
  // Corrupted local state cannot poison the UI or recreate arbitrary events.
  await page.evaluate(KEY=>localStorage.setItem(KEY,'{"schemaVersion":3,"campaignId":'),KEY);
  await page.reload({waitUntil:'networkidle'});
  const repaired=await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
  assert.equal(repaired.schemaVersion,3);
  assert.notEqual(repaired.campaignId,sig,'new safe campaign should replace unreadable record');
  assert.equal(repaired.revealed,false);
  assert.equal(repaired.currentSection,'operations');
  assert.equal(await page.locator('#operationsSection').isVisible(),true);
  if(mode==='mobile'){
   for(const width of [360,412]){
    await page.setViewportSize({width,height:820});
    const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
    assert.ok(dimensions.scroll<=dimensions.width+2,'mobile overflow '+JSON.stringify(dimensions));
   }
  }
  page.once('dialog',d=>d.accept());
  await page.locator('#resetAnytime').click();
  const reset=await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
  assert.equal(reset.schemaVersion,3);
  assert.notEqual(reset.campaignId,repaired.campaignId);
  assert.equal(reset.revealed,false);
  assert.deepEqual(reset.skuDecisions,[]);
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/session-migration-'+mode+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M2-05 desktop: v2 saved state migrates and remains deterministic',{timeout:150000},()=>browserSession('desktop'));
test('M2-05 phone: migration, corrupt JSON safety, and reset',{timeout:150000},()=>browserSession('mobile'));
