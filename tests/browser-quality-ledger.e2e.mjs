import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {mkdir} from 'node:fs/promises';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
async function verify(mode){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mode==='phone'?{...devices['Pixel 7']}:{viewport:{width:1240,height:860}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(BASE+'/?m3-quality='+mode,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   const key='supply-lab-v90',s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable',quality:'slow'};
   s.skuPolicy='service';s.skuRecovery='emergency';s.skuUrgentArrival=1;
   s.skuPurchaseCoverage=100;s.skuReservePercent=0;s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  const quality=page.locator('#canonicalAreaView [data-area-id="quality"]');
  const receiving=page.locator('#canonicalAreaView [data-area-id="receiving"]');
  assert.equal(await quality.isVisible(),true);
  await quality.locator('summary').click();
  const text=await quality.innerText();
  assert.match(text,/unidades liberadas/);
  assert.match(text,/retenidas en Calidad/);
  assert.match(text,/Liberación diaria/);
  assert.match(text,/lotes con saldo/);
  assert.match(text,/no es merma ni rechazo/);
  assert.match(text,/qualityLedger\.daily/);
  assert.match(text,/liberación fechada/);
  assert.match(await receiving.locator('summary').innerText(),/ingresadas al CD/);
  const daily=page.locator('#canonicalAreaView .canonical-day-detail');
  await daily.locator('summary').click();
  const rows=await daily.locator('.canonical-day-row').allInnerTexts();
  assert.equal(rows.length,13);
  assert.ok(rows.every(x=>/Calidad liberó \d/.test(x)));
  assert.ok(rows.every(x=>/retenido \d/.test(x)));
  assert.ok(rows.some(x=>/retenido [1-9]/.test(x)),'75% daily Quality release must show held units after intake');
  const oldSummary=await quality.locator('summary').innerText();
  const oldMetrics=await page.locator('#primarySkuMetrics strong').allInnerTexts();
  await page.locator('#recoveryTab').click();
  await page.locator('#dashboardTab').click();
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.equal(await quality.locator('summary').innerText(),oldSummary);
  assert.deepEqual(await page.locator('#primarySkuMetrics strong').allInnerTexts(),oldMetrics);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.equal(await quality.locator('summary').innerText(),oldSummary);
  assert.deepEqual(await page.locator('#primarySkuMetrics strong').allInnerTexts(),oldMetrics);
  if(mode==='phone'){
   for(const width of [360,412]){
    await page.setViewportSize({width,height:810});
    const d=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(d.scroll<=d.client+2,'Unexpected horizontal overflow: '+JSON.stringify(d));
    const rect=await quality.locator('summary').boundingBox();
    assert.ok(rect&&rect.height>=44,'Quality touch target too small');
   }
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m3-quality-'+mode+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M3-09 dated Quality stock and lots are visible on desktop',{timeout:150000},()=>verify('desktop'));
test('M3-09 dated Quality stock and lots remain legible on phone',{timeout:150000},()=>verify('phone'));
