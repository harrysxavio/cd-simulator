import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const STORAGE='supply-lab-i2-v1';

/** Auditar el flujo principal que ve un gerente principiante en su teléfono. */
async function startAtRecovery(page){
 await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
 await page.locator('#gameNext').click(); // Iniciar la campaña
 for(let area=0;area<8;area++)await page.locator('#gameNext').click();
 await page.locator('#gameNext').click(); // Revelar demanda
 assert.equal(await page.locator('.multi-lever-panel').count(),1);
}
test('I2-36.10: dos métodos de recuperación nunca tienen confirmaciones simultáneas',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await startAtRecovery(page);
  const before=await page.evaluate(key=>localStorage.getItem(key),STORAGE);
  assert.equal(await page.locator('.multi-lever-panel').evaluate(el=>el.open),true);
  assert.equal(await page.locator('.i2-classic-recovery').evaluate(el=>el.open),false);
  assert.equal(await page.locator('#gameNext').isVisible(),false,
   'La confirmación simple NO puede competir con la estrategia múltiple');
  await page.locator('#multiCompare').click();
  await page.locator('.multi-confirm-decision summary').click();
  assert.equal(await page.locator('#multiCommit').isVisible(),true);
  assert.equal(await page.locator('#gameNext').isVisible(),false);
  await page.locator('#multiCancelReview').click(); // Cancelar, sin guardar nada
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),STORAGE),before);

  await page.locator('.i2-classic-recovery summary').click();
  assert.equal(await page.locator('.i2-classic-recovery').evaluate(el=>el.open),true);
  assert.equal(await page.locator('.multi-lever-panel').evaluate(el=>el.open),false);
  assert.equal(await page.locator('#gameNext').isVisible(),true);
  assert.match(await page.locator('#gameNext').innerText(),/Confirmar opción simple/);
  assert.equal(await page.locator('#multiCommit').isVisible(),false);
  // El modo de confirmación no persiste como una decisión operativa.
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),STORAGE),before);
  
  await page.locator('.multi-lever-panel summary').first().click();
  assert.equal(await page.locator('.multi-lever-panel').evaluate(el=>el.open),true);
  assert.equal(await page.locator('.i2-classic-recovery').evaluate(el=>el.open),false);
  assert.equal(await page.locator('#gameNext').isVisible(),false);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),STORAGE),before);
  await page.locator('#multiCompare').click();
  await page.locator('.multi-confirm-decision summary').click();
  await page.locator('#multiCommit').click(); // Ninguna acción extra: decisión válida.
  const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE);
  assert.equal(after.phase,'result');
  assert.equal(after.recoveryConfirmation.actions.urgentPurchase.enabled,false);
  assert.equal(after.recoveryConfirmation.actions.reserveTransfer.enabled,false);
  assert.equal(after.recoveryConfirmation.actions.capacityBoost.enabled,false);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});

test('I2-36.10: la decisión simple se confirma exclusivamente desde su modo',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:320,height:640}});
 const page=await context.newPage();
 try{
  await startAtRecovery(page);
  await page.locator('.i2-classic-recovery summary').click();
  await page.locator('.i2-classic-recovery .game-choice').filter({hasText:'Compra urgente SKU'}).click();
  assert.equal(await page.locator('.i2-classic-recovery').evaluate(el=>el.open),true);
  assert.equal(await page.locator('#gameNext').isVisible(),true);
  await page.locator('#gameNext').click();
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE);
  assert.equal(saved.phase,'result');
  assert.equal(saved.recoveryConfirmation??null,null);
  assert.equal(saved.confirmedAreas.length,8);
  // El único desplazamiento externo continúa siendo el de la escena interna.
  const sizes=await page.evaluate(()=>({
   width:document.documentElement.clientWidth,
   full:document.documentElement.scrollWidth,
   height:document.documentElement.clientHeight,
   fullHeight:document.documentElement.scrollHeight
  }));
  assert.ok(sizes.full<=sizes.width+2);
  assert.ok(sizes.fullHeight<=sizes.height+2);
 }finally{await context.close();await browser.close()}
});
