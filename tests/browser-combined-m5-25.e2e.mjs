import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

// M5-25: real browser view of cached counterfactuals; no second simulation.
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000',KEY='supply-lab-v90';
async function run(mobile){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mobile?{...devices['Pixel 7']}:{viewport:{width:1240,height:850}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/?m5-25='+(mobile?'phone':'desktop'),{waitUntil:'networkidle'});
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery='combined';s.skuUrgentArrival=2;
   s.skuPurchaseCoverage=100;s.skuReservePercent=0;s.skuSeparateTransport=false;
   s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  const panel=page.locator('#skuLab .sku-combined-interaction');
  assert.equal(await panel.count(),1);
  assert.equal(await panel.getAttribute('open'),null);
  await panel.locator('summary').first().click();
  const content=await panel.textContent();
  assert.match(content,/Sin cambios \d+ pedidos · solo compra/);
  assert.match(content,/solo refuerzo/);
  assert.match(content,/ambos juntos/);
  assert.match(content,/NO representa pedidos realmente expedidos/);
  assert.match(content,/Interacción del modelo/);
  assert.match(content,/Se contabilizan una sola vez/);
  assert.equal(await panel.locator('[data-joint-day]').count(),13);
  const details=panel.locator('details').first();
  await details.locator('summary').click();
  assert.match(await panel.locator('[data-joint-day="12"]').textContent(),/pendientes/);
  if(mobile)for(const width of [360,412]){
   await page.setViewportSize({width,height:850});
   const d=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
   assert.ok(d.scroll<=d.width+2,'Horizontal overflow '+JSON.stringify({width,d}));
   assert.equal(await page.locator('#resetAnytime').isVisible(),true);
  }
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  assert.equal(await page.locator('#skuLab .sku-combined-interaction').count(),1);
  assert.deepEqual(errors,[]);
 }catch(error){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m5-25-'+(mobile?'phone':'desktop')+'.png',fullPage:true}).catch(()=>{});
  throw error;
 }finally{await context.close();await browser.close()}
}
test('M5-25 desktop: joint comparison, costs and persistence',{timeout:150000},()=>run(false));
test('M5-25 phone: nonadditive joint comparison at narrow widths',{timeout:150000},()=>run(true));
