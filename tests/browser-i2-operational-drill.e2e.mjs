import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

/** Verifica modo opt-in, secreto antes del reveal y su efecto físico visible. */
test('I2-35.5c: optional surprise persists and is revealed only after planning',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.i2-incident-outcome').count(),0);
  await page.locator('#gameOperationalDrill').click();
  const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  assert.match(before.eventSeed,/^ops-(dock|quality|combined)-01$/);
  assert.equal(before.reveal,false);
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/Día [24] · (Recepción|Calidad)/);
  assert.equal(await page.locator('.i2-picking-pilot-button').isDisabled(),true);
  await page.reload({waitUntil:'networkidle'});
  assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)).eventSeed,
   before.eventSeed);
  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++)await page.locator('#gameNext').click();
  assert.equal(await page.locator('.i2-incident-outcome').count(),0);
  await page.locator('#gameNext').click();
  const panel=page.locator('.i2-incident-outcome');
  assert.equal(await panel.count(),1);
  assert.match(await panel.innerText(),/Novedad operacional/);
  assert.match(await panel.innerText(),/Día [24] · (Recepción|Calidad)/);
  assert.match(await panel.innerText(),/Plan sin estos incidentes/);
  assert.match(await panel.innerText(),/laboratorio retrospectivo|comparaciones retrospectivas/i);
  await page.locator('#gameNext').click();
  assert.equal(await page.locator('.i2-six-answer').count(),6);
  await page.reload({waitUntil:'networkidle'});
  const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  assert.equal(after.eventSeed,before.eventSeed);
  assert.equal(after.phase,'result');
  const geometry=await page.evaluate(()=>({
   width:document.documentElement.clientWidth,
   scrollWidth:document.documentElement.scrollWidth
  }));
  assert.ok(geometry.scrollWidth<=geometry.width+2);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
