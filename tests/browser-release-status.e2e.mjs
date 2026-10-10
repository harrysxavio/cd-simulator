import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {mkdir} from 'node:fs/promises';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
async function verify(mode){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mode==='mobile'?{...devices['Pixel 7']}:{viewport:{width:1250,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  await page.goto(BASE+'/?release=11.30-r139&test='+mode,{waitUntil:'networkidle'});
  assert.equal(await page.locator('#releaseCurrentVersion').innerText(),'V11.30');
  await page.waitForFunction(()=>document.getElementById('releaseStatus')?.textContent.includes('verificada'));
  assert.match(await page.locator('#releaseStatus').innerText(),/v11\.30 verificada en servidor/);
  assert.match(await page.locator('#forceCurrentRelease').getAttribute('href'),/release=11\.29-r138/);
  await page.locator('#checkRelease').click();
  await page.waitForFunction(()=>document.getElementById('releaseStatus')?.textContent.includes('verificada'));
  await page.evaluate(()=>{
   const key='supply-lab-v90',s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery='emergency';s.skuReservePercent=0;s.skuUrgentArrival=1;s.skuPurchaseCoverage=100;
   s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#dashboardSection').isVisible(),true);
  assert.equal(await page.locator('#primarySkuSummary').isVisible(),true);
  assert.match(await page.locator('#primarySkuSummary').innerText(),/12 días/);
  const numbers=await page.locator('#primarySkuMetrics').innerText();
  assert.match(numbers,/280/);
  assert.match(numbers,/279/);
  assert.match(numbers,/1/);
  assert.equal(await page.locator('#legacyAggregateDetails').getAttribute('open'),null);
  assert.equal(await page.locator('#completed').isVisible(),false,'Legacy aggregate result must be folded');
  const original=await page.locator('#primarySkuMetrics strong').allInnerTexts();
  await page.locator('#primaryToAreas').click();
  assert.equal(await page.locator('#canonicalAreaView').isVisible(),true);
  assert.deepEqual(await page.locator('#canonicalAreaView .canonical-area-numbers strong').allInnerTexts(),original);
  await page.locator('#resultTabs [data-result-target="overview"]').click();
  await page.locator('#legacyAggregateDetails summary').click();
  assert.equal(await page.locator('#completed').isVisible(),true);
  assert.match(await page.locator('#legacyAggregateDetails').innerText(),/no representa los pedidos completos/i);
  if(mode==='mobile')for(const width of [360,412]){
   await page.setViewportSize({width,height:800});
   const data=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
   assert.ok(data.scroll<=data.width+2,'horizontal overflow '+JSON.stringify(data));
   for(const id of ['#checkRelease','#forceCurrentRelease','#primaryToAreas']){
    const dims=await page.locator(id).boundingBox();
    assert.ok(dims?.height>=44,'small tap target '+id);
   }
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/release-status-'+mode+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('Pages release status + canonical SKU summary on desktop',{timeout:150000},()=>verify('desktop'));
test('Pages release status + canonical SKU summary at 360/412px phone',{timeout:150000},()=>verify('mobile'));

test('browser warns when public manifest is newer than cached HTML', {timeout:90000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage();
 try{
  await page.goto(BASE+'/?release-check=newer',{waitUntil:'networkidle'});
  await page.route('**/release.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({version:'11.31',assetRevision:140})}));
  await page.locator('#checkRelease').click();
  await page.waitForFunction(()=>document.getElementById('releaseStatus').textContent.includes('versión nueva'));
  assert.match(await page.locator('#forceCurrentRelease').getAttribute('href'),/11\.31-r140/);
 }finally{await browser.close()}
});
