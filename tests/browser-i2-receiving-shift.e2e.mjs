import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

/** Pixel7: a dated Receiving contract must survive journal and second event. */
test('I2-35.5c3d: playable dock shift day 3, journal, Quality day 4 and result cost',
 {timeout:150000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameOperationalDrill').click();
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.eventSeed='ops-combined-01';
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  for(let n=0;n<8;n++)await page.locator('#gameNext').click();
  await page.locator('#gameNext').click();
  const shift=page.getByRole('button',{name:/Contratar turno extra de Recepción/});
  assert.equal(await shift.count(),1);
  assert.match(await page.locator('.i2-incident-choices').innerText(),/55.000/);
  await shift.click();
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  assert.equal(stored.receivingResponse.day,3);
  assert.equal(stored.receivingResponse.extraCapacitySkuUnits,80);
  assert.equal(stored.receivingResponse.shiftCostCLP,55000);
  await page.getByRole('heading',{name:'Jornada 3 de 12'}).waitFor();
  const at3=await page.locator('#gameScene').innerText();
  assert.match(at3,/Turno extraordinario de Recepción/);
  assert.match(at3,/55.000/);
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Jornada 3 de 12'}).waitFor();
  await page.locator('#gameNext').click();
  await page.getByRole('heading',{name:/Día 4 · Nuevo problema/}).waitFor();
  await page.getByRole('button',{name:/Mantener decisiones · sin nuevo gasto/}).click();
  for(let day=5;day<=12;day++){
   await page.getByRole('heading',{name:'Jornada '+day+' de 12'}).waitFor();
   await page.locator('#gameNext').click();
  }
  await page.locator('.i2-six-question-summary').waitFor();
  const conclusion=await page.locator('#gameScene').innerText();
  assert.match(conclusion,/Refuerzo Recepción día 3/);
  assert.match(conclusion,/55.000/);
  assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)).phase,'result');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=
   document.documentElement.clientWidth+2),'mobile horizontal overflow');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
