import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

test('I2-14: configuración por semilla, demanda sin spoilers, bloqueo y replay móvil',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('.management-settings summary').click();
  await page.locator('#gameChallenge').selectOption('alpha-case-03');
  let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-i2-v1')));
  assert.equal(state.seed,'alpha-case-03');
  assert.equal(state.reveal,false);
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/disminuyó un 15 %/);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('.management-settings summary').click();
  assert.equal(await page.locator('#gameChallenge').inputValue(),'alpha-case-03');
  await page.locator('#gameNext').click(); // Primera área.
  await page.locator('#gameNext').click(); // Primera decisión confirmada.
  await page.locator('#gameBack').click(); // Revisar área confirmada.
  await page.locator('#gameBack').click(); // Volver al inicio.
  await page.locator('.management-settings summary').click();
  assert.equal(await page.locator('#gameChallenge').isDisabled(),true);
  await page.locator('#gameNext').click(); // Retomar área 2, no repetir compra.
  for(let i=1;i<8;i++)await page.locator('#gameNext').click();
  state=await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-i2-v1')));
  assert.equal(state.confirmedAreas.length,8);
  assert.equal(state.seed,'alpha-case-03');
  assert.equal(state.reveal,false);
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/disminuyó un 15 %/);
  await page.locator('#gameNext').click(); // Revelación explícita.
  assert.match(await page.locator('#gameScene h1').innerText(),/disminuyó un 15 %/);
  assert.match(await page.locator('#gameScene').innerText(),/170/);
  await page.locator('#gameNext').click(); // Confirmar recuperación sin intervenir.
  assert.match(await page.locator('#gameScene').innerText(),/170 pedidos completos/);
  await page.locator('#gameNext').click(); // Nueva partida con las mismas condiciones.
  await page.locator('.management-settings summary').click();
  assert.equal(await page.locator('#gameChallenge').inputValue(),'alpha-case-03');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-i2-v1')).seed),'alpha-case-03');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
