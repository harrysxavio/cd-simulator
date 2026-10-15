import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000',KEY='supply-lab-v90';
async function verify(mobile,option){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mobile?{...devices['Pixel 7']}:{viewport:{width:1250,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/?m5-26='+option+'-'+(mobile?'mobile':'desktop'),{waitUntil:'networkidle'});
  await page.evaluate(({key,option})=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery=option;s.skuReservePercent=option==='reserve'?20:0;
   s.skuUrgentArrival=option==='emergency'?13:2;s.skuPurchaseCoverage=100;s.skuSeparateTransport=false;
   s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  },{key:KEY,option});
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  const panel=page.locator('#skuLab .sku-consolidated-compare');
  assert.equal(await panel.count(),1);
  assert.equal(await panel.getAttribute('data-compare-scope'),'sku-cohort');
  const text=await panel.innerText();
  assert.match(text,/Tu decisión frente a no intervenir/);
  assert.match(text,/Pedidos expedidos/);
  assert.match(text,/Pendientes al corte/);
  assert.match(text,/Días-pedido de espera/);
  assert.match(text,/Costo\/compromiso incremental supuesto/);
  assert.equal(await panel.locator('[data-compare-metric]').count(),4);
  const detail=panel.locator('.sku-consolidated-details');
  assert.equal(await detail.getAttribute('open'),null,'Expanded details must start collapsed on mobile');
  await detail.locator('summary').first().click();
  const content=await detail.textContent();
  assert.match(content,/Primer despacho desde el CD/);
  assert.match(content,/último despacho/);
  assert.match(content,/Compra urgente comprometida CLP/);
  assert.match(content,/no es caja cobrada ni utilidad contable/i);
  assert.equal(await panel.locator('[data-compare-observation]').count(),4);
  assert.equal(await panel.locator('[data-compare-day]').count(),13);
  assert.match(await panel.locator('[data-compare-day="12"]').textContent(),/pendientes/);
  if(option==='emergency')assert.match(text,/agrega costo o compromiso sin aumentar expediciones|Costo\/compromiso incremental supuesto/);
  if(mobile)for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const dims=await page.evaluate(()=>({w:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(dims.scroll<=dims.w+2,'Mobile overflow '+JSON.stringify({width,dims}));
   assert.equal(await page.locator('#resetAnytime').isVisible(),true);
   const hit=await detail.locator('summary').first().boundingBox();
   assert.ok(hit?.height>=44,'Comparison details tap target too small');
  }
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  assert.equal(await page.locator('#skuLab .sku-consolidated-compare').count(),1);
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m5-26-'+option+'-'+(mobile?'phone':'desktop')+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M5-26 phone: consolidated baseline/alternative/delta and 360/412px layout',{timeout:150000},()=>verify(true,'combined'));
test('M5-26 desktop: emergency purchase beyond horizon remains transparent',{timeout:150000},()=>verify(false,'emergency'));
