import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000',KEY='supply-lab-v90';
async function scenario(mode,arrival=1){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mode==='mobile'?{...devices['Pixel 7']}:{viewport:{width:1280,height:850}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 try{
  await page.goto(BASE+'/?u2='+mode+'-'+arrival,{waitUntil:'networkidle'});
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='recovery';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery='wait';s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#recoverySection').isVisible(),true);
  assert.equal(await page.locator('#skuRecoveryMission').isVisible(),true);
  assert.equal(await page.locator('#resetAnytime').isVisible(),true);
  const before=await state();
  assert.deepEqual(before.skuDecisions,[]);
  assert.match(await page.locator('#skuRecoveryDecision').innerText(),/Compra original comprometida: SKU A 70 · SKU B 0 · SKU C 9/);
  assert.match(await page.locator('#skuRecoveryDecision').innerText(),/Inventario físico inicial/);
  await page.locator('.manager-option-btn').filter({hasText:'Solicitar reposición extraordinaria'}).click();
  const selector=page.getByLabel('Día previsto de compra extraordinaria en Recuperación');
  await selector.selectOption(String(arrival));
  const preview=await page.locator('#skuRecoveryDecision').innerText();
  assert.match(preview,/Nueva orden propuesta/);
  assert.match(preview,/SKU A · 218 unidades/);
  assert.equal((await state()).skuDecisions.length,0,'Preview alone must NOT commit purchase');
  if(arrival===13){
   assert.match(preview,/no recupera pedidos/);
   assert.match(preview,/después del corte/);
  }else{
   assert.match(preview,/139/);
   assert.match(preview,/279/);
  }
  page.once('dialog',dialog=>dialog.dismiss());
  await page.locator('#confirmSkuDecision').click();
  assert.equal((await state()).skuDecisions.length,0,'Cancelled confirm must not commit');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#confirmSkuDecision').click();
  const committed=(await state()).skuDecisions;
  assert.equal(committed.length,1);
  const d=committed[0];
  assert.equal(d.action,'extraordinary-purchase');
  assert.equal(d.urgentArrivalDay,arrival);
  assert.equal(d.orderedExtraUnits,247);
  assert.equal(d.urgentPurchaseOrders.length,3);
  assert.deepEqual(d.originalPurchase,{A:70,B:0,C:9});
  assert.equal(d.receivedExtraUnits,arrival===13?0:247);
  assert.equal(d.recoveredOrders,arrival===13?0:140);
  assert.match(await page.locator('#skuRecoveryDecision').innerText(),/Decisión confirmada/);
  assert.equal(await page.locator('#confirmSkuDecision').count(),0,'Cannot commit same order twice');
  await page.reload({waitUntil:'networkidle'});
  const after=(await state()).skuDecisions;
  assert.deepEqual(after,committed,'Confirmed PO should not change on reload');
  await page.locator('.manager-primary').filter({hasText:'Ver resultado y trazabilidad SKU'}).click();
  assert.equal(await page.locator('#dashboardSection').isVisible(),true);
  assert.equal(await page.locator('#dashboardSection').getAttribute('data-result-view'),'inventory');
  assert.match(await page.locator('#skuLab').innerText(),/Decisión SKU confirmada en simulación/);
  assert.equal(await page.locator('#skuLab .sku-purchase-decision select:not([disabled])').count(),0,'Committed SKU amount/date remain immutable');
  assert.match(await page.locator('#skuLab').innerText(),/Conciliación física y económica SKU correcta/);
  if(mode==='mobile'){
   for(const width of [360,412]){
    await page.setViewportSize({width,height:820});
    const dims=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(dims.scroll<=dims.width+2,'Mobile overflow '+width+' '+JSON.stringify(dims));
    assert.equal(await page.locator('#resetAnytime').isVisible(),true);
   }
  }
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#resetAnytime').click();
  assert.equal((await state()).skuDecisions.length,0,'Restart clears confirmed decisions');
  assert.equal(await page.locator('#operationsSection').isVisible(),true);
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/u2-'+mode+'-'+arrival+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('U2 mobile: preview, cancel, confirm PO, persist, immutable results and restart',{timeout:150000},()=>scenario('mobile',1));
test('U2 desktop: late arrival records purchase but no fictitious receipts or rescued orders',{timeout:150000},()=>scenario('desktop',13));
