import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000',KEY='supply-lab-v90';
async function verify(phone,staging){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(phone?{...devices['Pixel 7']}:{viewport:{width:1240,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/?m6-28='+(phone?'phone':'desktop'),{waitUntil:'networkidle'});
  await page.evaluate(({key,staging})=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery='combined';s.skuUrgentArrival=2;
   s.skuPurchaseCoverage=100;s.skuReservePercent=0;s.skuSeparateTransport=staging;s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  },{key:KEY,staging});
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  const diag=page.locator('#skuLab .sku-constraint-diagnosis');
  assert.equal(await diag.count(),1);
  assert.equal(await diag.getAttribute('data-constraint-scope'),'sku-cohort');
  assert.equal(await diag.getAttribute('open'),null,'Details start collapsed');
  await diag.locator('summary').first().click();
  assert.equal(await diag.locator('[data-constraint-area]').count(),5);
  assert.deepEqual(await diag.locator('[data-constraint-area]').evaluateAll(ns=>ns.map(n=>n.dataset.constraintArea)),
   ['receiving','quality','inventory','picking','transport']);
  assert.match(await diag.textContent(),/Una cola no prueba la causa principal/);
  assert.match(await diag.textContent(),/Las unidades SKU y los pedidos no se suman/);
  const t=await diag.locator('[data-constraint-area="transport"]').textContent();
  if(staging)assert.match(t,/pedidos al corte/);
  else assert.match(t,/Sin cola independiente observable/);
  const dayDetail=diag.locator('details').first();
  await dayDetail.locator('summary').click();
  assert.equal(await diag.locator('[data-constraint-day]').count(),13);
  assert.match(await diag.locator('[data-constraint-day="12"]').textContent(),/expedidos/);
  if(phone)for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const d=await page.evaluate(()=>({w:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(d.scroll<=d.w+2,'Horizontal scroll on '+width+'px '+JSON.stringify(d));
   assert.equal(await page.locator('#resetAnytime').isVisible(),true);
  }
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  assert.equal(await page.locator('#skuLab .sku-constraint-diagnosis').count(),1);
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m6-28-'+(phone?'phone':'desktop')+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M6-28 mobile: five observed areas and 360/412px details',{timeout:150000},()=>verify(true,true));
test('M6-28 desktop: coupled Picking/Transport not falsely separated',{timeout:150000},()=>verify(false,false));
