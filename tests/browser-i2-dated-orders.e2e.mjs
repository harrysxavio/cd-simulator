import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

test('I2-35.7a: orden de Recepción día 3 visible, costo real y lectura intacta tras recarga',
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
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.eventSeed='ops-dock-01';
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++)await page.locator('#gameNext').click();
  assert.equal(await page.locator('.i2-ops-command-log').count(),0,
   'No revelar órdenes o decisiones anteriores a la sorpresa');
  await page.locator('#gameNext').click();
  await page.getByRole('button',{name:/Contratar turno extra de Recepción/}).click();
  await page.getByRole('heading',{name:'Jornada 3 de 12'}).waitFor();
  const ledger=page.locator('.i2-ops-command-log');
  assert.equal(await ledger.isVisible(),true);
  assert.equal(await ledger.locator('.i2-ops-command-item').count(),1);
  assert.match(await ledger.innerText(),/Turno extraordinario de Recepción/);
  assert.match(await ledger.innerText(),/Emitida día 2 · fecha objetivo día 3/);
  assert.match(await ledger.innerText(),/55\.000/);
  assert.doesNotMatch(await ledger.innerText(),/Día 4.*Calidad|Segundo incidente/i);
  const saved=await page.evaluate(k=>localStorage.getItem(k),KEY);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),saved);
  assert.match(await page.locator('.i2-ops-command-log').innerText(),
   /Turno extraordinario de Recepción/);
  await page.locator('#gameNext').click();
  assert.match(await ledger.innerText(),/fecha objetivo ya pasó/i);
  assert.equal(await ledger.locator('.i2-ops-command-item').count(),1);
  const geo=await page.evaluate(()=>({
   width:document.documentElement.clientWidth,
   scroll:document.documentElement.scrollWidth,
   height:document.documentElement.clientHeight,
   full:document.documentElement.scrollHeight
  }));
  assert.ok(geo.scroll<=geo.width+2);
  assert.ok(geo.full<=geo.height+2);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
