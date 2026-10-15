import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000',KEY='supply-lab-v90';
async function exercise(phone,option){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(phone?{...devices['Pixel 7']}:{viewport:{width:1240,height:880}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('JS '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('Console '+m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 try{
  await page.goto(BASE+'/?m5-27='+option+'-'+(phone?'phone':'desktop'),{waitUntil:'networkidle'});
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='recovery';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery='wait';s.skuUrgentArrival=2;
   s.skuPurchaseCoverage=100;s.skuReservePercent=0;s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#skuRecoveryMission').isVisible(),true);
  assert.equal(await page.locator('.manager-option-btn').count(),5);
  const label=option==='combined'?'Compra urgente + refuerzo':'Refuerzo operacional';
  await page.locator('.manager-option-btn').filter({hasText:label}).click();
  assert.equal((await read()).skuRecovery,option);
  assert.equal((await read()).skuDecisions.length,0,'Preview must not commit');
  assert.match(await page.locator('#skuRecoveryDecision').innerText(),/Pedidos completos/);
  if(option==='combined')assert.match(await page.locator('#skuRecoveryDecision').innerText(),/Nueva orden propuesta/);
  page.once('dialog',d=>d.dismiss());
  await page.locator('#confirmSkuDecision').click();
  assert.equal((await read()).skuDecisions.length,0,'Declining is not a commitment');
  page.once('dialog',d=>d.accept());
  await page.locator('#confirmSkuDecision').click();
  const saved=(await read()).skuDecisions;
  assert.equal(saved.length,1);
  assert.equal(saved[0].version,2);
  assert.equal(saved[0].option,option);
  assert.match(saved[0].physicalWitness.scenarioDigest,/^[a-f0-9]{16}$/);
  assert.equal(saved[0].completedBefore+saved[0].recoveredOrders,saved[0].completedAfter);
  assert.match(await page.locator('#skuRecoveryDecision').innerText(),/Decisión confirmada/);
  assert.equal(await page.locator('#confirmSkuDecision').count(),0);
  await page.reload({waitUntil:'networkidle'});
  assert.deepEqual((await read()).skuDecisions,saved);
  assert.match(await page.locator('#skuRecoveryDecision').innerText(),/Decisión confirmada/);
  assert.equal(await page.locator('#confirmSkuDecision').count(),0,'No duplicate commit after reload');
  await page.locator('.manager-primary').filter({hasText:'Ver resultado y trazabilidad SKU'}).click();
  assert.equal(await page.locator('#dashboardSection').isVisible(),true);
  assert.match(await page.locator('#skuLab').innerText(),/Decisión SKU confirmada/);
  if(phone)for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const d=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(d.scroll<=d.width+2,'Mobile overflow '+JSON.stringify({width,d}));
   assert.equal(await page.locator('#resetAnytime').isVisible(),true);
  }
  // An edited record can survive JSON parsing but cannot lock this campaign.
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.skuDecisions[0].completedAfter++;
   s.currentSection='recovery';
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('#skuRecoveryDecision').innerText(),/no supera la validación actual/);
  assert.equal(await page.locator('#confirmSkuDecision').count(),1);
  page.once('dialog',d=>d.accept());
  await page.locator('#resetAnytime').click();
  assert.deepEqual((await read()).skuDecisions,[]);
  assert.equal(await page.locator('#operationsSection').isVisible(),true);
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m5-27-'+option+'-'+(phone?'phone':'desktop')+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M5-27 phone: combined confirmation, persistence, tamper rejection, restart',{timeout:150000},()=>exercise(true,'combined'));
test('M5-27 desktop: overtime confirmation survives refresh and blocks duplicates',{timeout:150000},()=>exercise(false,'overtime'));
