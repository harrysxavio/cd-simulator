import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {mkdir} from 'node:fs/promises';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

async function verify(mode){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mode==='phone'?{...devices['Pixel 7']}:{viewport:{width:1240,height:850}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  await page.goto(BASE+'/?session-cache='+mode,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   const key='supply-lab-v90',s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='preliminary';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery='emergency';s.skuUrgentArrival=1;
   s.skuPurchaseCoverage=100;s.skuReservePercent=0;s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  const evidence=page.locator('#directorEvidence');
  assert.equal(await evidence.getAttribute('data-scope'),'sku-cohort');
  const stamp=await evidence.getAttribute('data-projection-stamp');
  const id=await evidence.getAttribute('data-campaign-id');
  const before=await evidence.locator('.director-stat strong').allInnerTexts();
  assert.ok(stamp?.startsWith('SKU-VIEW-')&&id?.startsWith('CD-'));
  assert.deepEqual(before,['280','279','1']);
  await page.locator('#dashboardTab').click();
  assert.equal(await page.locator('#primarySkuSummary').getAttribute('data-projection-stamp'),stamp);
  assert.equal(await page.locator('#canonicalAreaView').getAttribute('data-projection-stamp'),stamp);
  assert.equal(await page.locator('#primarySkuSummary').getAttribute('data-campaign-id'),id);
  assert.deepEqual(await page.locator('#primarySkuMetrics strong').allInnerTexts(),before);
  for(const view of ['areas','inventory','overview','areas']){
   await page.locator('#resultTabs button[data-result-target="'+view+'"]').click();
   assert.equal(await page.locator('#canonicalAreaView').getAttribute('data-projection-stamp'),stamp);
  }
  await page.locator('#recoveryTab').click();
  assert.equal(await page.locator('#canonicalAreaView').getAttribute('data-projection-stamp'),stamp);
  await page.locator('#preliminaryTab').click();
  assert.equal(await evidence.getAttribute('data-projection-stamp'),stamp,'navigation must not replay identical campaign');
  assert.deepEqual(await evidence.locator('.director-stat strong').allInnerTexts(),before);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await evidence.getAttribute('data-campaign-id'),id,'saved campaign must survive reload');
  assert.deepEqual(await evidence.locator('.director-stat strong').allInnerTexts(),before);
  await page.locator('#dashboardTab').click();
  await page.locator('#resultTabs button[data-result-target="inventory"]').click();
  await page.locator('#skuPolicyControls button').filter({hasText:'Ajustada'}).click();
  const next=await page.locator('#canonicalAreaView').getAttribute('data-projection-stamp');
  assert.notEqual(next,stamp,'changing SKU policy must generate a new projection');
  if(mode==='phone'){
   for(const width of [360,412]){
    await page.setViewportSize({width,height:800});
    const d=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(d.scroll<=d.width+2,'horizontal overflow '+JSON.stringify(d));
   }
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/sku-session-'+mode+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{
  await context.close();await browser.close();
 }
}
test('M2-04b desktop: one SKU projection through diagnosis, tabs, reload',{timeout:150000},()=>verify('desktop'));
test('M2-04b Pixel 7: one SKU projection, reload and change invalidation',{timeout:150000},()=>verify('phone'));
