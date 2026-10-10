import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
async function check(mode){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const ctx=await browser.newContext(mode==='mobile'?{...devices['Pixel 7']}:{viewport:{width:1240,height:860}});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/?picking-events='+mode,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   const key='supply-lab-v90',s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery='combined';s.skuUrgentArrival=1;
   s.skuPurchaseCoverage=100;s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  const pick=page.locator('#canonicalAreaView [data-area-id="picking"]');
  const transport=page.locator('#canonicalAreaView [data-area-id="transport"]');
  await pick.locator('summary').click();
  await transport.locator('summary').click();
  const pickingText=await pick.innerText();
  assert.match(pickingText,/pedidos completos preparados/);
  assert.match(pickingText,/mezcla de productos/);
  assert.match(pickingText,/preparación/);
  assert.match(pickingText,/no hay staging/);
  assert.match(pickingText,/pickingLedger\.daily/);
  assert.match(await transport.innerText(),/expedición vinculada a Picking/);
  assert.match(await transport.innerText(),/no se modela staging/);
  const timeline=page.locator('#canonicalAreaView .canonical-day-detail');
  await timeline.locator('summary').click();
  const rows=await timeline.locator('.canonical-day-row').allInnerTexts();
  assert.equal(rows.length,13);
  assert.ok(rows.every(s=>/Picking \d+ pedidos/.test(s)));
  assert.ok(rows.every(s=>/SKU preparados/.test(s)));
  assert.ok(rows.every(s=>/expedidos \d+ pedidos/.test(s)));
  const previous=await pick.locator('summary').innerText();
  const indicators=await page.locator('#primarySkuMetrics strong').allInnerTexts();
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.equal(await pick.locator('summary').innerText(),previous);
  assert.deepEqual(await page.locator('#primarySkuMetrics strong').allInnerTexts(),indicators);
  if(mode==='mobile')for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const dim=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(dim.scroll<=dim.client+2,'horizontal overflow '+JSON.stringify(dim));
   const box=await pick.locator('summary').boundingBox();
   assert.ok(box?.height>=44,'Picking tap target must remain accessible');
  }
  assert.deepEqual(errors,[]);
 }finally{await ctx.close();await browser.close()}
}
test('M3-11 picking prep evidence on desktop',{timeout:150000},()=>check('desktop'));
test('M3-11 picking prep evidence on Pixel 7',{timeout:150000},()=>check('mobile'));
