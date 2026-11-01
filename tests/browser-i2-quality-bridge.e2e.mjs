import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

/** Physical Quality bridge is chosen after the day-4 incident, never sooner. */
test('I2-35.5c3c: quality bridge is dated, persisted, costly and observable on Pixel 7',
 {timeout:150000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({
  ...devices['Pixel 7'],viewport:{width:360,height:760}
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameOperationalDrill').click();
  await page.evaluate(key=>{
   const state=JSON.parse(localStorage.getItem(key));
   state.eventSeed='ops-combined-01';
   localStorage.setItem(key,JSON.stringify(state));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  for(let n=0;n<8;n++)await page.locator('#gameNext').click();
  await page.locator('#gameNext').click();
  assert.equal(await page.getByRole('button',{name:/línea alternativa de Calidad/}).count(),0);
  await page.getByRole('button',{name:'No intervenir',exact:true}).click();
  await page.getByRole('heading',{name:'Jornada 3 de 12'}).waitFor();
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/línea alternativa de Calidad/);
  await page.locator('#gameNext').click();
  await page.getByRole('heading',{name:/Día 4 · Nuevo problema/}).waitFor();
  const bridge=page.getByRole('button',{name:/Activar línea alternativa de Calidad/});
  assert.equal(await bridge.count(),1);
  assert.match(await page.locator('.i2-incident-choices').innerText(),/80 SKU/);
  assert.match(await page.locator('.i2-incident-choices').innerText(),/70.000/);
  await bridge.click();
  const at5=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  assert.equal(at5.incidentStep,2);
  assert.equal(at5.incidentSecondDecision,'quality-bridge');
  assert.equal(at5.operationalResponse.day,5);
  assert.equal(at5.operationalResponse.capacitySkuUnits,80);
  assert.equal(at5.operationalResponse.shiftCostCLP,70000);
  assert.equal(at5.recoveryConfirmation.actions.urgentPurchase.enabled,false);
  assert.equal(at5.incidentViewDay,5);
  await page.getByRole('heading',{name:'Jornada 5 de 12'}).waitFor();
  const daily=await page.locator('#gameScene').innerText();
  assert.match(daily,/Línea alternativa de Calidad · jornada contratada/);
  assert.match(daily,/70.000/);
  assert.match(daily,/Liberados por línea alternativa/);
  assert.doesNotMatch(daily,/Resultado de tu combinación|CIERRE DÍA 12/);
  await page.reload({waitUntil:'networkidle'});
  assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY))
   .operationalResponse.shiftCostCLP,70000);
  for(let day=5;day<=12;day++){
   await page.getByRole('heading',{name:'Jornada '+day+' de 12'}).waitFor();
   await page.locator('#gameNext').click();
  }
  await page.locator('.i2-six-question-summary').waitFor();
  const result=await page.locator('#gameScene').innerText();
  assert.match(result,/Línea alternativa de Calidad día 5/);
  assert.match(result,/línea alternativa de Calidad/);
  assert.match(result,/70.000/);
  assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)).phase,'result');
  const dims=await page.evaluate(()=>({
   doc:document.documentElement.scrollWidth,
   width:document.documentElement.clientWidth
  }));
  assert.ok(dims.doc<=dims.width+2);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
