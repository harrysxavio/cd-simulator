import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';
const advance=page=>page.locator('#gameNext').click();
async function reveal(page,reserve=false){
 await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
 await page.evaluate(()=>localStorage.setItem('supply-lab-v90','historical-v1'));
 if(reserve){
  await page.locator('.advanced-settings summary').click();
  await page.locator('#advancedReserve').selectOption('25');
  await page.locator('#advancedSave').click();
 }
 await advance(page);
 for(let i=0;i<8;i++)await advance(page);
 await advance(page);
 assert.equal(await page.locator('.game-choice').count(),5);
}
for(const physicalReserve of [false,true]){
 test('I2-30: confirmar y reabrir desde resultado en Pixel 7, reserva '+physicalReserve,
  {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await reveal(page,physicalReserve);
  const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  await page.locator('.multi-lever-panel summary').first().click();
  await page.locator('#multiBuy').check();
  await page.locator('#multiBoost').check();
  if(physicalReserve)await page.locator('#multiReserve').check();
  await page.locator('#multiBuyDay').selectOption('13');
  await page.locator('#multiCompare').click();
  await page.locator('.multi-confirm-decision summary').click();
  assert.match(await page.locator('.multi-confirm-summary').innerText(),/Gasto extra/);
  await page.locator('#multiCancelReview').click();
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),
   JSON.stringify(before),'cancel review must not save');
  await page.locator('.multi-confirm-decision summary').click();
  await page.locator('#multiCommit').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/combinación/);
  assert.match(await page.locator('.multi-committed-summary').innerText(),/Compra urgente/);
  assert.equal(await page.locator('.game-choice').count(),0);
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(saved.phase,'result');
  assert.equal(saved.recoveryConfirmation.version,1);
  assert.equal(saved.recoveryConfirmation.actions.urgentPurchase.arrivalDay,13);
  assert.equal(saved.recoveryConfirmation.actions.reserveTransfer.enabled,physicalReserve);
  assert.equal(saved.recoveryConfirmation.actions.capacityBoost.enabled,true);
  assert.equal(saved.confirmedAreas.length,8);
  assert.doesNotMatch(JSON.stringify(saved),/ledger|shipmentEvents|incrementalExpenseCLP/);
  const text=await page.locator('.multi-committed-summary').innerText();
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.multi-committed-summary').innerText(),text,
   'result must be recomputed from preserved event');
  await page.locator('#gameBack').click();
  assert.match(await page.locator('#gameStage').innerText(),/Recuperación/);
  await page.locator('.multi-lever-panel summary').first().click();
  assert.equal(await page.locator('#multiBuy').isChecked(),true);
  assert.equal(await page.locator('#multiBoost').isChecked(),true);
  assert.equal(await page.locator('#multiReserve').isChecked(),physicalReserve);
  await page.locator('#multiCancelSaved').click();
  const cleared=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal('recoveryConfirmation' in cleared,false);
  assert.deepEqual(cleared.choices,before.choices);
  assert.equal(cleared.reveal,true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'historical-v1');
  const layout=await page.evaluate(()=>({
   viewport:document.documentElement.clientHeight,
   pageHeight:document.documentElement.scrollHeight,
   width:document.documentElement.clientWidth,
   scrollWidth:document.documentElement.scrollWidth,
   bottom:document.querySelector('#gameNext').getBoundingClientRect().bottom
  }));
  assert.ok(layout.pageHeight<=layout.viewport+2);
  assert.ok(layout.scrollWidth<=layout.width+2);
  assert.ok(layout.bottom<=layout.viewport+2);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
 });
}
test('I2-30: volver a la selección clásica no conserva evento multi',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:360,height:760}});
 const page=await context.newPage();
 try{
  await reveal(page);
  await page.locator('.multi-lever-panel summary').first().click();
  await page.locator('#multiCompare').click();
  await page.locator('.multi-confirm-decision summary').click();
  await page.locator('#multiCommit').click();
  await page.locator('#gameBack').click();
  await page.locator('.game-choice').filter({hasText:'Compra urgente SKU'}).click();
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/consecuencias/);
  assert.equal(await page.locator('.multi-committed-summary').count(),0);
  assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).recoveryConfirmation??null,KEY),null);
 }finally{await context.close();await browser.close()}
});
