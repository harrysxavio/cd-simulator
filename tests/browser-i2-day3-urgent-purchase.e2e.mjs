import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

test('I2-35.8b: compra urgente diferida, cancelación, guardado y día 4 en móvil',
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
  await page.locator('#gameNext').click();
  await page.getByRole('button',{name:'No intervenir',exact:true}).click();
  await page.getByRole('heading',{name:'Jornada 3 de 12'}).waitFor();
  const before=await page.evaluate(key=>localStorage.getItem(key),KEY);
  const radar=await page.locator('.i2-daily-radar').innerText();
  const trigger=page.locator('.i2-daily-purchase-trigger');
  assert.equal(await trigger.isVisible(),true);
  await trigger.click();
  const dialog=page.locator('.i2-day3-purchase-dialog');
  assert.equal(await dialog.isVisible(),true);
  assert.match(await dialog.innerText(),/Costo de compra/);
  assert.match(await dialog.innerText(),/Recargo urgente/);
  await dialog.locator('.i2-day3-command-cancel').click();
  await dialog.waitFor({state:'detached'});
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),before);
  await trigger.click();
  await dialog.locator('.i2-day3-command-confirm').click();
  await dialog.waitFor({state:'detached'});
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  assert.equal(saved.urgentFollowupIssuedDay,3);
  assert.equal(saved.recoveryConfirmation.actions.urgentPurchase.arrivalDay,4);
  assert.equal(await page.locator('.i2-daily-purchase-trigger').count(),0);
  assert.equal(await page.locator('.i2-daily-radar').innerText(),radar);
  assert.match(await page.locator('.i2-ops-command-log').innerText(),
   /Emitida día 3 · fecha objetivo día 4/);
  await page.locator('#gameNext').click();
  await page.getByRole('heading',{name:'Jornada 4 de 12'}).waitFor();
  await page.reload({waitUntil:'networkidle'});
  assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY))
   .urgentFollowupIssuedDay,3);
  const geometry=await page.evaluate(()=>({
   width:document.documentElement.clientWidth,
   scrollWidth:document.documentElement.scrollWidth,
   height:document.documentElement.clientHeight,
   scrollHeight:document.documentElement.scrollHeight
  }));
  assert.ok(geometry.scrollWidth<=geometry.width+2);
  assert.ok(geometry.scrollHeight<=geometry.height+2);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
