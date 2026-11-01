import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

/** Simula la decisión posterior al primer incidente en el teléfono. */
for(const response of ['No intervenir','Compra urgente']){
 test('I2-35.5c2: phone day-2 incident, decision '+response+' has no future spoilers',
  {timeout:120000},async()=>{
  const browser=await chromium.launch({headless:true,
   executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
  const context=await browser.newContext({...devices['Pixel 7'],
   viewport:{width:360,height:760}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
   await page.locator('#gameOperationalDrill').click();
   // Prueba reproducible: calendario combinado ya conocido por el test.
   await page.evaluate(key=>{
    const s=JSON.parse(localStorage.getItem(key));
    s.eventSeed='ops-combined-01';
    localStorage.setItem(key,JSON.stringify(s));
   },KEY);
   await page.reload({waitUntil:'networkidle'});
   await page.locator('#gameNext').click();
   for(let i=0;i<8;i++)await page.locator('#gameNext').click();
   assert.equal(await page.locator('.i2-incident-checkpoint').count(),0);
   await page.locator('#gameNext').click();
   assert.match(await page.locator('#gameScene h1').innerText(),/Día 2/);
   const checkpoint=await page.locator('#gameScene').innerText();
   assert.match(checkpoint,/En cola de muelle/);
   assert.match(checkpoint,/No conoces el resultado del día 12/);
   assert.doesNotMatch(checkpoint,/Día 4 · Calidad|EVT-QUALITY|Plan sin estos incidentes/);
   assert.equal(await page.locator('#gameNext').isVisible(),false);
   if(response==='No intervenir'){
    await page.getByRole('button',{name:'No intervenir',exact:true}).click();
   }else{
    await page.getByRole('button',{name:/Compra urgente · llega día 3/}).click();
   }
   // Segunda observación, ya impactada por la primera orden.
   await page.getByRole('heading',{name:/Día 4 · Nuevo problema/}).waitFor();
   const second=await page.locator('#gameScene').innerText();
   assert.match(second,/Calidad suspendió liberaciones/);
   assert.doesNotMatch(second,/Las consecuencias de tu combinación|CIERRE DÍA 12/);
   const mid=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
   assert.equal(mid.phase,'recover');
   assert.equal(mid.incidentStep,1);
   // Con una compra ya emitida la siguiente opción no puede emitirla otra vez.
   if(response==='Compra urgente'){
    assert.equal(await page.getByRole('button',{name:/Nueva compra urgente/}).count(),0);
   }
   await page.getByRole('button',{name:/Mantener decisiones · sin nuevo gasto/}).click();
   await page.locator('.i2-six-question-summary').waitFor();
   const persisted=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
   assert.equal(persisted.phase,'result');
   assert.equal(persisted.incidentStep,2);
   assert.equal(persisted.incidentSecondDecision,'hold');
   assert.equal(persisted.eventSeed,'ops-combined-01');
   assert.equal(persisted.recoveryConfirmation.actions.capacityBoost.enabled,false);
   if(response==='Compra urgente'){
    assert.equal(persisted.recoveryConfirmation.actions.urgentPurchase.arrivalDay,3);
   }else assert.equal(persisted.recoveryConfirmation.actions.urgentPurchase.enabled,false);
   assert.match(await page.locator('.i2-incident-outcome').innerText(),/Día 4 · Calidad/);
   assert.equal(await page.locator('.i2-six-answer').count(),6);
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('.i2-six-answer').count(),6);
   assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)).eventSeed,'ops-combined-01');
   const dims=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth,
    footer:document.querySelector('#gameNext').getBoundingClientRect().bottom,
    height:document.documentElement.clientHeight
   }));
   assert.ok(dims.scrollWidth<=dims.width+2);
   assert.ok(dims.footer<=dims.height+2);
   assert.deepEqual(errors,[]);
  }finally{await context.close();await browser.close()}
 });
}
