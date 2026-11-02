import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

/** Radar real: del incidente ya observado a la jornada siguiente, sin spoilers. */
test('I2-35.9: el gerente ve cuatro KPI con cambios verificables entre ayer y hoy',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:320,height:568}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameOperationalDrill').click();
  await page.evaluate(k=>{
   const s=JSON.parse(localStorage.getItem(k));
   // Se fija un incidente reproducible para observar la progresión.
   s.eventSeed='ops-dock-01';
   localStorage.setItem(k,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++)await page.locator('#gameNext').click();
  assert.equal(await page.locator('.i2-daily-radar').count(),0);
  await page.locator('#gameNext').click(); // Revelación sin filtración previa
  await page.getByRole('button',{name:'No intervenir',exact:true}).click();
  const radar=page.locator('.i2-daily-radar');
  assert.equal(await radar.count(),1);
  assert.match(await radar.innerText(),/RADAR DE JORNADA/);
  assert.equal(await radar.locator('.i2-daily-trend').count(),4);
  assert.match(await radar.innerText(),/desde ayer/);
  const day3=await radar.innerText();
  const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await radar.innerText(),day3);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before);
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Jornada 4/);
  const display=await radar.innerText();
  assert.match(display,/Pedidos pendientes/);
  assert.match(display,/Cola de Recepción/);
  assert.match(display,/Retenidos en Calidad/);
  const geo=await page.evaluate(()=>({
   width:document.documentElement.clientWidth,
   scroll:document.documentElement.scrollWidth,
   height:document.documentElement.clientHeight,
   outer:document.documentElement.scrollHeight
  }));
  assert.ok(geo.scroll<=geo.width+2);
  assert.ok(geo.outer<=geo.height+2);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
