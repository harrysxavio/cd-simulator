import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000',KEY='supply-lab-v90';
async function verify(phone){
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(phone?{...devices['Pixel 7']}:
  {viewport:{width:1220,height:880}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)
  errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/?m7-37='+(phone?'phone':'desktop'),{waitUntil:'networkidle'});
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery='combined';s.skuUrgentArrival=2;
   s.skuPurchaseCoverage=100;s.skuReservePercent=20;s.skuSeparateTransport=true;
   s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  const overview=page.locator('#skuLab .sku-consolidated-compare');
  const signals=overview.locator('.sku-outcome-insights');
  assert.equal(await signals.count(),1);
  assert.equal(await signals.getAttribute('data-outcome-scope'),'sku-cohort');
  assert.equal(await signals.getAttribute('data-outcome-option'),'combined');
  assert.deepEqual(await signals.locator('[data-outcome-signal]').evaluateAll(ns=>
   ns.map(n=>n.dataset.outcomeSignal)),['service','waiting','cost']);
  assert.equal(await signals.locator('[data-outcome-caution="qualified"]').count(),1);
  assert.match(await signals.textContent(),/¿Qué mejoró y qué empeoró/);
  assert.match(await signals.textContent(),/pedidos completos|mismos pedidos/i);
  assert.match(await signals.textContent(),/días-pedido/);
  assert.match(await signals.textContent(),/compromisos/i);
  const original=await page.evaluate(key=>localStorage.getItem(key),KEY);
  const limits=signals.locator('.sku-outcome-boundaries');
  assert.equal(await limits.getAttribute('open'),null);
  await limits.locator('summary').click();
  assert.match(await limits.textContent(),/entrega confirmada al cliente/);
  assert.match(await limits.textContent(),/costo total/);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),original,
   'Reading outcomes must not write into the campaign');
  // Replace only selected recovery as a fresh, unconfirmed exploration.
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));s.skuRecovery='reserve';
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  const reserve=page.locator('#skuLab .sku-consolidated-compare .sku-outcome-insights');
  assert.equal(await reserve.getAttribute('data-outcome-option'),'reserve');
  assert.equal(await reserve.locator('[data-outcome-signal="cost"]').getAttribute('data-outcome-status'),'unknown');
  assert.match(await reserve.locator('[data-outcome-signal="cost"]').textContent(),/sin tarifa/);
  assert.match(await reserve.locator('[data-outcome-caution="qualified"]').textContent(),/tarifar el traslado/);
  if(phone)for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const dims=await page.evaluate(()=>({
    w:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
   }));
   assert.ok(dims.scroll<=dims.w+2,'Mobile overflow '+JSON.stringify({width,dims}));
   const rows=await reserve.locator('[data-outcome-signal]').evaluateAll(nodes=>nodes.map(el=>{
    const root=el.getBoundingClientRect(),txt=el.querySelector('p').getBoundingClientRect();
    return {width:root.width,textWidth:txt.width,inside:txt.right<=root.right+2};
   }));
   assert.ok(rows.every(r=>r.inside&&r.width>0&&r.textWidth>0),
    'Readable signal cards '+JSON.stringify({width,rows}));
   const hit=await reserve.locator('.sku-outcome-boundaries summary').boundingBox();
   assert.ok(hit?.height>=44,'Limit disclosure touch target');
   assert.equal(await page.locator('#resetAnytime').isVisible(),true);
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m7-37-'+(phone?'phone':'desktop')+'.png',
   fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M7-37 phone: outcomes explained without overflows or unpriced costs treated as free',
 {timeout:150000},()=>verify(true));
test('M7-37 desktop: read-only interpretation of SKU recovery and explicit limits',
 {timeout:150000},()=>verify(false));
