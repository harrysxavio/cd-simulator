import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

/** La portada debe permitir cambiar de reto incluso con un plan ya cerrado. */
test('Lab14: cuatro retos elegibles, cambio cancelable y reinicio explícito de plan bloqueado',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:360,height:740}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  const launcher=page.getByRole('button',{name:'Elegir o cambiar reto'});
  assert.equal(await launcher.isVisible(),true);
  await launcher.click();
  const menu=page.locator('.i2-mission-dialog');
  assert.equal(await menu.locator('.i2-mission-choice').count(),4);
  await menu.locator('[data-mode="quality"]').click();
  await menu.waitFor({state:'detached'});
  let saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(saved.guidedScenario,'quality-low-stock');
  assert.equal(saved.advanced.stockProfile,'low');
  await page.locator('#gameNext').click();
  await page.locator('#gameNext').click();
  await page.locator('#gameBack').click();
  await page.locator('#gameBack').click();
  assert.equal(await page.locator('.i2-mission-hub-trigger').isEnabled(),true);
  assert.match(await page.locator('.i2-mission-hub-status').innerText(),/confirmadas/);
  // También los antiguos botones de la portada deben abrir el selector.
  await page.locator('.i2-picking-pilot-button').click();
  assert.equal(await page.locator('.i2-mission-dialog').isVisible(),true);
  await page.locator('[data-mode="picking"]').click();
  assert.equal(await page.locator('.i2-mission-confirm-bar').isVisible(),true);
  await page.locator('.i2-mission-cancel').click();
  saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(saved.confirmedAreas.length,1);
  assert.equal(saved.guidedScenario,'quality-low-stock');
  await page.locator('[data-mode="picking"]').click();
  await page.locator('.i2-mission-approve').click();
  saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(saved.confirmedAreas.length,0);
  assert.equal(saved.advanced.pickingLimitSkuPerDay,'10');
  assert.equal(saved.seed,'alpha-case-04');
  assert.equal(saved.reveal,false);
  assert.match(await page.locator('.i2-mission-active').innerText(),/Picking/);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});

/** La demanda real se ve aun cuando la operación utiliza incidentes diarios. */
test('Lab14: incidente revela demanda real y explica por qué no hay acciones en cada día',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:390,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('.i2-mission-hub-trigger').click();
  await page.locator('[data-mode="incident"]').click();
  const seeded=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.ok(seeded.eventSeed);
  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++)await page.locator('#gameNext').click();
  assert.equal(await page.locator('.i2-demand-observed-hero').count(),0);
  assert.match(await page.locator('#gameNext').innerText(),/Revelar demanda/);
  await page.locator('#gameNext').click();
  const banner=page.locator('.i2-demand-observed-hero');
  assert.equal(await banner.count(),1);
  assert.match(await banner.innerText(),/DEMANDA REAL REVELADA/);
  assert.match(await banner.innerText(),/observad/);
  assert.equal(await page.locator('.i2-incident-choices').count(),1);
  await page.locator('.i2-incident-choices .game-choice').first().click();
  assert.equal(await page.locator('.i2-daily-action-status').count(),1);
  assert.equal(await page.locator('.i2-demand-observed-hero').count(),1);
  const saved=await page.evaluate(k=>localStorage.getItem(k),KEY);
  await page.locator('.i2-daily-explain-button').click();
  const help=page.locator('.i2-help-dialog');
  assert.match(await help.innerText(),/No todas las jornadas incluyen incidentes/);
  assert.match(await help.innerText(),/Comercial:/);
  await page.keyboard.press('Escape');
  await help.waitFor({state:'detached'});
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),saved);
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});

/** El arte y la enseñanza deben estar fuera de las tarjetas de decisión. */
test('Lab14: la decisión de un área abre una guía visual modal sin modificar el plan',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:320,height:568}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  assert.equal(await page.locator('.cd-iso-compact').count(),0);
  assert.equal(await page.locator('.game-choice').count(),3);
  const prior=await page.locator('.i2-live-plan-preview').innerText();
  await page.locator('.game-choice').first().click();
  const updated=await page.locator('.i2-live-plan-preview').innerText();
  assert.notEqual(updated,prior,'La selección debe cambiar indicadores previstos visibles');
  assert.doesNotMatch(updated,/demanda observada 280|pedidos reales 280/i);
  const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
  const open=page.locator('.i2-area-explore');
  await open.click();
  const modal=page.locator('.i2-cd-area-guide-dialog');
  assert.equal(await modal.isVisible(),true);
  assert.equal(await modal.locator('img').count(),1);
  await modal.locator('img').evaluate(img=>img.decode());
  assert.equal(await modal.locator('.i2-cd-area-guide-topic').count(),6);
  assert.match(await modal.innerText(),/Qué ocurre aquí/);
  await page.keyboard.press('Escape');
  await modal.waitFor({state:'detached'});
  assert.equal(await open.evaluate(el=>document.activeElement===el),true);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before);
  const geometry=await page.evaluate(()=>({
   width:document.documentElement.clientWidth,
   scroll:document.documentElement.scrollWidth,
   height:document.documentElement.clientHeight,
   full:document.documentElement.scrollHeight
  }));
  assert.ok(geometry.scroll<=geometry.width+2);
  assert.ok(geometry.full<=geometry.height+2);
 }finally{await browser.close()}
});
