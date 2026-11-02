import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

test('I2-35.8a: jornada 3 permite orden nueva real de Recepción para día 4',
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
   s.eventSeed='ops-dock-01';
   localStorage.setItem(k,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++)await page.locator('#gameNext').click();
  assert.equal(await page.locator('.i2-daily-followup-trigger').count(),0);
  await page.locator('#gameNext').click();
  await page.getByRole('button',{name:'No intervenir',exact:true}).click();
  await page.getByRole('heading',{name:'Jornada 3 de 12'}).waitFor();
  const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
  const radar=await page.locator('.i2-daily-radar').innerText();
  const trigger=page.locator('.i2-daily-followup-trigger');
  assert.equal(await trigger.isVisible(),true);
  await trigger.click();
  const modal=page.locator('.i2-day3-command-dialog');
  assert.equal(await modal.isVisible(),true);
  assert.match(await modal.innerText(),/55\.000/);
  assert.match(await modal.innerText(),/día 4/);
  await modal.locator('.i2-day3-command-cancel').click();
  await modal.waitFor({state:'detached'});
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before,
   'Cancelar nunca confirma orden');
  await trigger.click();
  await modal.locator('.i2-day3-command-confirm').click();
  await modal.waitFor({state:'detached'});
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(saved.incidentViewDay,3);
  assert.equal(saved.receivingResponse.day,4);
  assert.equal(saved.receivingFollowupIssuedDay,3);
  assert.equal(await page.locator('.i2-daily-followup-trigger').count(),0,
   'No se puede confirmar una orden duplicada');
  assert.equal(await page.locator('.i2-daily-radar').innerText(),radar,
   'La jornada 3 anterior a la orden no cambia');
  const log=page.locator('.i2-ops-command-log');
  assert.match(await log.innerText(),/Emitida día 3 · fecha objetivo día 4/);
  assert.match(await log.innerText(),/Pendiente de fecha objetivo/);
  await page.locator('#gameNext').click();
  await page.getByRole('heading',{name:'Jornada 4 de 12'}).waitFor();
  assert.match(await log.innerText(),/Hoy corresponde su fecha objetivo/);
  assert.match(await page.locator('#gameScene').innerText(),
   /Turno extraordinario de Recepción/);
  await page.reload({waitUntil:'networkidle'});
  assert.equal((await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY)).receivingResponse.day,4);
  const geo=await page.evaluate(()=>({
   width:document.documentElement.clientWidth,
   scrollWidth:document.documentElement.scrollWidth,
   height:document.documentElement.clientHeight,
   scrollHeight:document.documentElement.scrollHeight
  }));
  assert.ok(geo.scrollWidth<=geo.width+2);
  assert.ok(geo.scrollHeight<=geo.height+2);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
