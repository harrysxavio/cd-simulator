import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {I2_AREAS} from '../src/i2-product-contract.js';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

/**
 * Lab12: camino real de un principiante. Las 3 alternativas deben poderse
 * elegir antes de comprometer, con indicador, foco y desplazamiento estables.
 */
test('Lab12: las 24 alternativas de ocho áreas son elegibles sin saltos de foco ni scroll',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:320,height:568}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  // El mapa informa sin saltarse áreas ni alterar el plan.
  await page.locator('#gameMapOpen').click();
  assert.equal(await page.locator('.i2-help-dialog[open]').count(),1);
  await page.keyboard.press('Escape');
  await page.locator('.i2-help-dialog').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'gameMapOpen');
  for(let index=0;index<I2_AREAS.length;index++){
   const area=I2_AREAS[index];
   assert.match(await page.locator('#gameStage').innerText(),/Área (\d+) de 8/);
   assert.equal(await page.locator('.game-choice').count(),area.choices.length);
   assert.match(await page.locator('.choice-commit-guide').innerText(),/Propuesta actual:/);
   // Cada área tiene tres alternativas; probar todas antes de confirmar.
   for(const i of [2,0,1]){
    const target=page.locator('.game-choice').nth(i);
    await target.scrollIntoViewIfNeeded();
    const before=await page.locator('#gameScene').evaluate(el=>el.scrollTop);
    await target.click();
    const next=page.locator('.game-choice').nth(i);
    assert.equal(await next.getAttribute('aria-pressed'),'true');
    assert.equal(await next.evaluate(el=>document.activeElement===el),true,
     'La alternativa seleccionada debe recuperar el foco');
    const after=await page.locator('#gameScene').evaluate(el=>el.scrollTop);
    assert.ok(Math.abs(after-before)<=5,'Cambiar propuesta no debe saltar al título: '+area.id);
    const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
    assert.equal(saved.choices[area.id],area.choices[i].optionId);
    assert.equal(saved.confirmedAreas.length,index);
    assert.equal(saved.reveal,false);
   }
   if(index===0){
    // Comprobar ayuda contextual, retorno de foco y no mutación del plan.
    const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
    const helper=page.getByRole('button',{name:'¿Qué significa esta área y su KPI?'});
    await helper.click();
    assert.equal(await page.locator('.i2-help-dialog[open]').count(),1);
    await page.locator('.i2-help-close').click();
    await page.locator('.i2-help-dialog').waitFor({state:'detached'});
    assert.equal(await helper.evaluate(el=>document.activeElement===el),true);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before);
    await page.getByRole('tab',{name:'Indicadores'}).click();
    assert.match(await page.getByRole('tabpanel',{name:'Indicadores'}).innerText(),/Fuente:/);
    await page.getByRole('tab',{name:'Decisión'}).click();
   }
   await page.locator('#gameNext').click();
   const now=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
   assert.equal(now.confirmedAreas.length,index+1);
   if(index!==7)assert.equal(now.confirmedAreas[index],area.id);
  }
  assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/Demanda observada: 280/);
  await page.locator('#gameNext').click();
  assert.equal(await page.locator('.multi-lever-panel').count(),1);
  // El cierre no modifica las ocho elecciones y mantiene intacto V1.
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});

test('Lab12: el reinicio superior no pierde el reto guiado de Calidad',
 {timeout:60000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:760}});
 page.on('dialog',dialog=>dialog.accept());
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Activar reto de Calidad'}).click();
  await page.locator('#gameNext').click();
  assert.equal(await page.locator('#gameRestart').isVisible(),true);
  await page.locator('#gameRestart').click();
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(saved.guidedScenario,'quality-low-stock');
  assert.equal(saved.advanced.stockProfile,'low');
  assert.equal(saved.confirmedAreas.length,0);
  assert.equal(saved.phase,'intro');
  assert.match(await page.locator('.i2-quality-guided-card').innerText(),/Reto activo/);
 }finally{await browser.close()}
});
