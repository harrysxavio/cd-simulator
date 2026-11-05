import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

/** Una partida de muelle reproducible, con reserva previamente habilitada. */
test('I2-35.8b: compras + reserva se autorizan en día 3 sin modificar el pasado',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:320,height:568}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameOperationalDrill').click();
  await page.evaluate(key=>{
   const state=JSON.parse(localStorage.getItem(key));
   state.eventSeed='ops-dock-01';
   state.advanced.reservePercent=25;
   localStorage.setItem(key,JSON.stringify(state));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++)await page.locator('#gameNext').click();
  assert.equal(await page.locator('.i2-day3-supply-trigger').count(),0);
  await page.locator('#gameNext').click();
  await page.getByRole('button',{name:'No intervenir',exact:true}).click();
  await page.getByRole('heading',{name:'Jornada 3 de 12'}).waitFor();

  const triggers=page.locator('.i2-day3-supply-trigger');
  assert.equal(await triggers.count(),2);
  const radarBefore=await page.locator('.i2-daily-radar').innerText();
  const before=await page.evaluate(key=>localStorage.getItem(key),KEY);
  await page.locator('.i2-day3-supply-trigger[data-kind="buy"]').click();
  const dialog=page.locator('.i2-supply-dialog');
  assert.equal(await dialog.isVisible(),true);
  assert.match(await dialog.innerText(),/unidades SKU por comprar/);
  assert.match(await dialog.innerText(),/Compromiso adicional/);
  await dialog.locator('.i2-supply-cancel').click();
  await dialog.waitFor({state:'detached'});
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),before);

  await page.locator('.i2-day3-supply-trigger[data-kind="buy"]').click();
  await dialog.locator('.i2-supply-confirm').click();
  await dialog.waitFor({state:'detached'});
  let saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  assert.equal(saved.purchaseFollowupIssuedDay,3);
  assert.equal(saved.recoveryConfirmation.actions.urgentPurchase.arrivalDay,4);
  assert.equal(await page.locator('.i2-day3-supply-trigger[data-kind="buy"]').count(),0);
  assert.equal(await page.locator('.i2-daily-radar').innerText(),radarBefore);
  assert.match(await page.locator('.i2-ops-command-log').innerText(),
   /Compra urgente de SKU/);

  await page.locator('.i2-day3-supply-trigger[data-kind="reserve"]').click();
  assert.match(await dialog.innerText(),/SKU ya reservadas/);
  assert.match(await dialog.innerText(),/no calibrado/);
  await dialog.locator('.i2-supply-confirm').click();
  await dialog.waitFor({state:'detached'});
  saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  assert.equal(saved.purchaseFollowupIssuedDay,3);
  assert.equal(saved.reserveFollowupIssuedDay,3);
  assert.equal(saved.recoveryConfirmation.actions.reserveTransfer.releaseDay,4);
  assert.equal(await page.locator('.i2-day3-supply-trigger').count(),0);
  assert.equal(await page.locator('.i2-daily-radar').innerText(),radarBefore);
  const book=await page.locator('.i2-ops-command-log').innerText();
  assert.match(book,/Compra urgente de SKU/);
  assert.match(book,/Traslado de reserva existente/);
  assert.match(book,/Emitida día 3 · fecha objetivo día 4/);

  await page.locator('#gameNext').click();
  await page.getByRole('heading',{name:'Jornada 4 de 12'}).waitFor();
  assert.match(await page.locator('.i2-ops-command-log').innerText(),
   /Hoy corresponde su fecha objetivo/);
  await page.reload({waitUntil:'networkidle'});
  const loaded=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  assert.equal(loaded.purchaseFollowupIssuedDay,3);
  assert.equal(loaded.reserveFollowupIssuedDay,3);
  const size=await page.evaluate(()=>({
   w:document.documentElement.clientWidth,
   sw:document.documentElement.scrollWidth,
   h:document.documentElement.clientHeight,
   sh:document.documentElement.scrollHeight
  }));
  assert.ok(size.sw<=size.w+2,'Sin scroll horizontal');
  assert.ok(size.sh<=size.h+2,'Sin scroll exterior');
  assert.deepEqual(errors,[]);
 }finally{
  await context.close();await browser.close();
 }
});
