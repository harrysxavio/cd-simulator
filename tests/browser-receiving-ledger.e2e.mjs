import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {mkdir} from 'node:fs/promises';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
async function exercise(mode){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const ctx=await browser.newContext(mode==='phone'?{...devices['Pixel 7']}:{viewport:{width:1240,height:850}});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/?m3-08-receiving='+mode,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   const key='supply-lab-v90',s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable',receiving:'low'};
   s.skuPolicy='service';s.skuRecovery='combined';s.skuUrgentArrival=1;
   s.skuPurchaseCoverage=100;s.skuReservePercent=0;s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  const purchasing=page.locator('#canonicalAreaView [data-area-id="purchasing"]');
  const receiving=page.locator('#canonicalAreaView [data-area-id="receiving"]');
  assert.equal(await receiving.isVisible(),true);
  await receiving.locator('summary').click();
  const text=await receiving.innerText();
  assert.match(text,/unidades ingresadas al CD/);
  assert.match(text,/en cola del muelle/);
  assert.match(text,/Capacidad/);
  assert.match(text,/máxima cola/);
  assert.match(text,/mayor espera/);
  assert.match(text,/orden de llegada/);
  assert.match(text,/receivingLedger\.daily/);
  await purchasing.locator('summary').click();
  assert.match(await purchasing.innerText(),/en cola de Recepción/);
  const daily=page.locator('#canonicalAreaView .canonical-day-detail');
  await daily.locator('summary').click();
  assert.equal(await daily.locator('.canonical-day-row').count(),13);
  const texts=await daily.locator('.canonical-day-row').allInnerTexts();
  assert.ok(texts.every(x=>/Muelle \+\d/.test(x)), 'daily physical dock arrivals missing');
  assert.ok(texts.every(x=>/recibido \d/.test(x)), 'daily physical warehouse intake missing');
  assert.ok(texts.every(x=>/cola \d/.test(x)), 'daily Receiving queue missing');
  assert.ok(texts.some(x=>/cola [1-9]/.test(x)), 'scenario should exercise Receiving backlog');
  const summary=await receiving.locator('summary').innerText();
  const metrics=await page.locator('#primarySkuMetrics strong').allInnerTexts();
  await page.locator('#recoveryTab').click();
  await page.locator('#dashboardTab').click();
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.equal(await receiving.locator('summary').innerText(),summary);
  assert.deepEqual(await page.locator('#primarySkuMetrics strong').allInnerTexts(),metrics);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.equal(await receiving.locator('summary').innerText(),summary,'Receiving read-model changed on saved campaign reload');
  assert.deepEqual(await page.locator('#primarySkuMetrics strong').allInnerTexts(),metrics);
  if(mode==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:810});
   const d=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(d.scroll<=d.client+2,'Unexpected horizontal scrolling on phone: '+JSON.stringify(d));
   const rect=await receiving.locator('summary').boundingBox();
   assert.ok(rect&&rect.height>=44,'Receiving tap target too small');
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m3-08-receiving-'+mode+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await ctx.close();await browser.close()}
}
test('M3-08 Receiving FIFO and daily dock evidence on desktop',{timeout:150000},()=>exercise('desktop'));
test('M3-08 Receiving FIFO and daily dock evidence on phone',{timeout:150000},()=>exercise('phone'));
