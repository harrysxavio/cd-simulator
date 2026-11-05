import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

test('I2-37.5a: Nico compara únicamente efectos observados tras la orden del día 3',
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
   localStorage.setItem(key,JSON.stringify(state));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++)await page.locator('#gameNext').click();
  assert.equal(await page.locator('.i2-observed-order-impact').count(),0);
  await page.locator('#gameNext').click();
  await page.getByRole('button',{name:'No intervenir',exact:true}).click();
  await page.getByRole('heading',{name:'Jornada 3 de 12'}).waitFor();
  await page.locator('.i2-day3-supply-trigger[data-kind="buy"]').click();
  await page.locator('.i2-supply-dialog .i2-supply-confirm').click();
  await page.locator('.i2-supply-dialog').waitFor({state:'detached'});
  assert.equal(await page.locator('.i2-observed-order-impact').count(),0,
   'No atribuir futuro antes del día objetivo');

  await page.locator('#gameNext').click();
  await page.getByRole('heading',{name:'Jornada 4 de 12'}).waitFor();
  const impact=page.locator('.i2-observed-order-impact');
  assert.equal(await impact.isVisible(),true);
  const txt=await impact.innerText();
  assert.match(txt,/NICO.*¿QUÉ CAMBIARON TUS ÓRDENES DEL DÍA 3/);
  assert.match(txt,/SIN las nuevas órdenes/);
  assert.match(txt,/Pedidos expedidos acumulados/);
  assert.match(txt,/Pendientes al cierre de hoy/);
  assert.match(txt,/Gasto adicional comprometido/);
  assert.equal(await impact.locator('.i2-impact-metric').count(),4);
  assert.doesNotMatch(txt,/mañana saldrán|día 12 expedidos|segundo incidente/i);
  const before=await page.evaluate(key=>localStorage.getItem(key),KEY);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await impact.innerText(),txt);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),before,
   'Una lectura pedagógica no muta el guardado');
  const dim=await page.evaluate(()=>({
   w:document.documentElement.clientWidth,
   sw:document.documentElement.scrollWidth,
   h:document.documentElement.clientHeight,
   sh:document.documentElement.scrollHeight
  }));
  assert.ok(dim.sw<=dim.w+2);
  assert.ok(dim.sh<=dim.h+2);
  assert.deepEqual(errors,[]);
 }finally{
  await context.close();await browser.close();
 }
});
