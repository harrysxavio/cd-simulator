import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const GAME_KEY='supply-lab-i2-v1';
test('I2-15: editar cuatro supuestos, cancelar, guardar, recargar y bloquear en móvil',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({
  headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined
 });
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameScene h1').filter({hasText:'Hoy tú diriges'}).waitFor();
  await page.locator('.advanced-settings summary').click();
  assert.equal(await page.locator('#advancedOrders').inputValue(),'200');
  assert.equal(await page.locator('#advancedSave').isVisible(),true);
  const before=await page.evaluate(key=>localStorage.getItem(key),GAME_KEY);
  await page.locator('#advancedOrders').selectOption('160');
  await page.locator('#advancedPicking').selectOption('40');
  await page.locator('#advancedStock').selectOption('low');
  await page.locator('#advancedCost').selectOption('100000');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),GAME_KEY),before,
   'Editar borrador no escribe en almacenamiento');
  await page.locator('#advancedCancel').click();
  assert.equal(await page.locator('#advancedOrders').inputValue(),'200');
  assert.equal(await page.locator('#advancedPicking').inputValue(),'base');
  assert.equal(await page.locator('#advancedStock').inputValue(),'standard');
  assert.equal(await page.locator('#advancedCost').inputValue(),'70000');
  await page.locator('#advancedOrders').selectOption('160');
  await page.locator('#advancedPicking').selectOption('40');
  await page.locator('#advancedStock').selectOption('low');
  await page.locator('#advancedCost').selectOption('100000');
  await page.locator('#advancedSave').click();
  assert.match(await page.locator('#advancedFeedback').innerText(),/guardada/);
  assert.match(await page.locator('#gamePlanOrders').innerText(),/160/);
  let saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),GAME_KEY);
  assert.deepEqual(saved.advanced,{
   plannedOrders:160,pickingLimitSkuPerDay:'40',stockProfile:'low',
   extraCapacityDailyCostCLP:100000
  });
  assert.equal(saved.reveal,false);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('.advanced-settings summary').click();
  assert.equal(await page.locator('#advancedStock').inputValue(),'low');
  await page.locator('#gameNext').click();
  await page.locator('#gameNext').click(); // confirma la primera decisión
  await page.locator('#gameBack').click();
  await page.locator('#gameBack').click(); // regresa a configuración
  await page.locator('.advanced-settings summary').click();
  assert.equal(await page.locator('#advancedOrders').isDisabled(),true);
  assert.equal(await page.locator('#advancedSave').isDisabled(),true);
  assert.equal(await page.locator('#advancedCancel').isDisabled(),true);
  await page.locator('#gameNext').click(); // retoma desde el siguiente paso
  for(let i=1;i<8;i++)await page.locator('#gameNext').click();
  saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),GAME_KEY);
  assert.equal(saved.reveal,false);
  assert.deepEqual(saved.advanced, {
   plannedOrders:160,pickingLimitSkuPerDay:'40',stockProfile:'low',
   extraCapacityDailyCostCLP:100000
  });
  await page.locator('#gameNext').click(); // revelar demanda +40 %
  assert.match(await page.locator('#gameScene').innerText(),/224/);
  await page.locator('#gameNext').click(); // confirmar recuperación
  assert.match(await page.locator('#gameScene').innerText(),/224 pedidos completos/);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
