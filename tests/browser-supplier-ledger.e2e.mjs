import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {mkdir} from 'node:fs/promises';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
async function verify(mode){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mode==='phone'?{...devices['Pixel 7']}:{viewport:{width:1250,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/?supplier-ledger='+mode,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   const key='supply-lab-v90',s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable',receiving:'low'};
   s.skuPolicy='service';s.skuRecovery='emergency';s.skuUrgentArrival=1;
   s.skuPurchaseCoverage=100;s.skuReservePercent=0;s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  const purchase=page.locator('#canonicalAreaView [data-area-id="purchasing"]');
  const receiving=page.locator('#canonicalAreaView [data-area-id="receiving"]');
  assert.match(await purchase.locator('summary').innerText(),/unidades SKU pedidas originalmente/);
  await purchase.locator('summary').click();
  await receiving.locator('summary').click();
  const detail=await purchase.innerText(),received=await receiving.innerText();
  assert.match(detail,/Cumplimiento de proveedor/);
  assert.match(detail,/en cola de Recepción/);
  assert.match(detail,/ya ingresadas al CD/);
  assert.match(detail,/llegada modelada/);
  assert.match(detail,/compra extraordinaria urgente/);
  assert.match(received,/ingresadas al CD/);
  assert.match(received,/en cola del muelle/);
  assert.ok(!detail.includes('unidades confirmadas por proveedor original'),
   'modeled supplier fill is not a proven real supplier confirmation');
  const poTitle=await purchase.locator('summary').innerText();
  const receivingTitle=await receiving.locator('summary').innerText();
  const stats=await page.locator('#primarySkuMetrics strong').allInnerTexts();
  assert.equal(stats[0],'280');
  await page.locator('#recoveryTab').click();
  await page.locator('#dashboardTab').click();
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.equal(await purchase.locator('summary').innerText(),poTitle);
  assert.equal(await receiving.locator('summary').innerText(),receivingTitle);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.equal(await purchase.locator('summary').innerText(),poTitle);
  assert.equal(await receiving.locator('summary').innerText(),receivingTitle);
  assert.deepEqual(await page.locator('#primarySkuMetrics strong').allInnerTexts(),stats);
  if(mode==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:800});
   const d=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
   assert.ok(d.s<=d.w+2,'horizontal overflow '+JSON.stringify(d));
   const box=await purchase.locator('summary').boundingBox();
   assert.ok(box?.height>=44,'Procurement tap target too small');
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/supplier-ledger-'+mode+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M3-07 supplier and Receiving are separate on desktop',{timeout:150000},()=>verify('desktop'));
test('M3-07 supplier and Receiving remain auditable on phone',{timeout:150000},()=>verify('phone'));
