import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

// M5-24: exercise the real recovery choice on the same mobile/desktop app.
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-v90';
async function exercise(device,option){
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(device==='phone'
  ?{...devices['Pixel 7']}:{viewport:{width:1250,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)
  errors.push('HTTP '+r.status()+' '+r.url())});
 try{
  await page.goto(BASE+'/?m5-24='+device+'-'+option,{waitUntil:'networkidle'});
  await page.evaluate(({key,option})=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery=option;s.skuReservePercent=0;
   s.skuPurchaseCoverage=100;s.skuUrgentArrival=2;s.skuDecisions=[];
   s.skuSeparateTransport=option==='combined';
   localStorage.setItem(key,JSON.stringify(s));
  },{key:KEY,option});
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  const panel=page.locator('#skuLab .sku-operational-cost');
  assert.equal(await panel.count(),1);
  assert.equal(await panel.getAttribute('open'),null,'Capacity panel should start closed');
  await panel.locator('summary').first().click();
  const t=await panel.textContent();
  assert.match(t,/Cupos adicionales asignados/);
  assert.match(t,/Pedidos que salen del CD:/);
  assert.match(t,/Los cupos utilizados NO son pedidos atribuibles al refuerzo/);
  assert.equal(await panel.locator('[data-operational-cost-day]').count(),13);
  const child=panel.locator('details').first();
  await child.locator('summary').click();
  const first=panel.locator('[data-operational-cost-day="0"]');
  assert.match(await first.textContent(),/usados \d+ \/ \d+/);
  assert.match(await first.textContent(),/preparados \d+/);
  assert.match(await first.textContent(),/expedidos \d+/);
  if(option==='combined')assert.match(t,/también compra SKU urgentes/);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  assert.equal(await page.locator('#skuLab .sku-operational-cost').count(),1);
  if(device==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const dim=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,
    width:document.documentElement.clientWidth}));
   assert.ok(dim.scroll<=dim.width+2,'Mobile overflow '+JSON.stringify({width,dim}));
   assert.equal(await page.locator('#resetAnytime').isVisible(),true);
   const target=await page.locator('#skuLab .sku-operational-cost summary').first().boundingBox();
   assert.ok(target?.height>=44,'Tap target too small');
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m5-24-'+device+'-'+option+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M5-24 Chromium phone: reinforcement utilization, persistence and narrow widths',{timeout:150000},()=>exercise('phone','overtime'));
test('M5-24 Chromium desktop: combined actions disclose attribution limits',{timeout:150000},()=>exercise('desktop','combined'));
