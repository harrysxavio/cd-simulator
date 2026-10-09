import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000',KEY='supply-lab-v90';
async function exercise(mobile,day){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mobile?{...devices['Pixel 7']}:{viewport:{width:1240,height:850}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 try{
  await page.goto(BASE+'/?u2b='+(mobile?'phone':'desktop')+'-'+day,{waitUntil:'networkidle'});
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='recovery';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery='wait';s.skuReservePercent=0;s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#recoverySection').isVisible(),true);
  assert.equal(await page.locator('#skuRecoveryMission').isVisible(),true);
  const original=(await page.locator('#skuRecoveryDecision').innerText()).match(/Compra original comprometida: SKU A 70 · SKU B 0 · SKU C 9/);
  assert.ok(original,'Original PO unchanged');
  await page.locator('.manager-option-btn').filter({hasText:'Habilitar reserva ubicada en el CD'}).click();
  assert.equal((await state()).skuReservePercent,20);
  assert.match(await page.locator('#skuRecoveryDecision').innerText(),/RESERVA-CD → PICK-FACE/);
  assert.match(await page.locator('#skuRecoveryDecision').innerText(),/SKU A · 30 unidades/);
  assert.match(await page.locator('#skuRecoveryDecision').innerText(),/SKU B · 18 unidades/);
  assert.match(await page.locator('#skuRecoveryDecision').innerText(),/SKU C · 11 unidades/);
  await page.getByLabel('Día de habilitación de la reserva ubicada').selectOption(String(day));
  const copy=await page.locator('#skuRecoveryDecision').innerText();
  assert.match(copy,/compras adicionales CLP 0/);
  const timeline=page.locator('#skuRecoveryDecision .manager-shipment-timeline');
  assert.equal(await timeline.isVisible(),false);
  await page.locator('#skuRecoveryDecision .manager-po-detail summary').first().click();
  assert.equal(await timeline.isVisible(),true);
  assert.equal(await timeline.locator('.manager-shipment-day').count(),13);
  assert.match(await page.locator('#skuRecoveryDecision').innerText(),/sin fecha de entrega confirmada/);
  assert.equal((await state()).skuDecisions.length,0);
  page.once('dialog',d=>d.accept());
  await page.locator('#confirmSkuDecision').click();
  const record=(await state()).skuDecisions;
  assert.equal(record.length,1);
  assert.equal(record[0].action,'release-on-site-reserve');
  assert.equal(record[0].orderedExtraUnits,0);
  assert.equal(record[0].reservePercent,20);
  assert.deepEqual(record[0].openingReserve,{A:30,B:18,C:11});
  assert.equal(record[0].releasedReserveUnits,day===1?59:0);
  assert.equal(record[0].firstReserveTransferDay,day===1?1:null);
  assert.equal(record[0].reserveTransfers.length,day===1?3:0);
  assert.equal(record[0].recoveredOrders,day===13?0:record[0].completedAfter-record[0].completedBefore);
  assert.equal(await page.locator('#confirmSkuDecision').count(),0,'Cannot commit twice');
  await page.reload({waitUntil:'networkidle'});
  assert.deepEqual((await state()).skuDecisions,record);
  await page.locator('.manager-primary').filter({hasText:'Ver resultado y trazabilidad SKU'}).click();
  assert.match(await page.locator('#skuLab').innerText(),/Decisión SKU confirmada en simulación/);
  assert.match(await page.locator('#skuLab').innerText(),/Conciliación física y económica SKU correcta/);
  assert.equal(await page.locator('#skuLab .sku-purchase-decision select:not([disabled])').count(),0);
  if(mobile)for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const dim=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
   assert.ok(dim.scroll<=dim.width+2,'Mobile horizontal overflow '+JSON.stringify({width,dim}));
   assert.equal(await page.locator('#resetAnytime').isVisible(),true);
  }
  page.once('dialog',d=>d.accept());
  await page.locator('#resetAnytime').click();
  assert.equal((await state()).skuReservePercent,0);
  assert.equal((await state()).skuDecisions.length,0);
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/u2b-'+(mobile?'mobile':'desktop')+'-'+day+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('U2b mobile: locate existing stock, compare transfer, plan shipments, commit and restart',{timeout:150000},()=>exercise(true,1));
test('U2b desktop: reserve transfer beyond campaign retains physical stock and recovers zero orders',{timeout:150000},()=>exercise(false,13));
