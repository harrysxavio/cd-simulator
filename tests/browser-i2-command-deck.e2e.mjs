import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

/** Ocho áreas visibles, solo tres acciones físicamente soportadas. */
test('I2-36.16: el gerente abre acciones reales por área sin falsas confirmaciones',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:320,height:568}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.i2-command-deck').count(),0);
  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++)await page.locator('#gameNext').click();
  assert.equal(await page.locator('.i2-command-deck').count(),0);
  await page.locator('#gameNext').click();
  const board=page.locator('.i2-command-deck');
  assert.equal(await board.count(),1);
  const cards=board.locator('.i2-command-area-card');
  assert.equal(await cards.count(),8);
  assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(n=>n.dataset.area)),
   ['commercial','planning','purchasing','receiving',
    'quality','inventory','picking','transport']);
  assert.deepEqual(await cards.evaluateAll(nodes=>
   nodes.filter(n=>n.dataset.available==='true').map(n=>n.dataset.area)),
   ['purchasing','picking'],'Sin reserva inicial, solo compra y Picking deben ser accionables');
  const original=await page.evaluate(k=>localStorage.getItem(k),KEY);
  await board.locator('[data-area="quality"]').click();
  const help=page.locator('.i2-help-dialog');
  await help.waitFor({state:'visible'});
  assert.match(await help.innerText(),/Política comprometida/);
  assert.match(await help.innerText(),/no existe una nueva orden física/);
  await page.keyboard.press('Escape');
  await help.waitFor({state:'detached'});
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),original);
  await board.locator('[data-area="purchasing"]').click();
  assert.equal(await page.locator('#multiBuy').evaluate(el=>document.activeElement===el),true);
  await page.locator('#multiBuy').check();
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),original);
  await board.locator('[data-area="picking"]').click();
  assert.equal(await page.locator('#multiBoost').evaluate(el=>document.activeElement===el),true);
  await page.locator('#multiBoost').check();
  await page.locator('#multiCompare').click();
  assert.equal(await page.locator('.multi-compare-conclusion').count(),1);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),original);
  const bounds=await page.evaluate(()=>({
   width:document.documentElement.clientWidth,
   scrollWidth:document.documentElement.scrollWidth,
   height:document.documentElement.clientHeight,
   scrollHeight:document.documentElement.scrollHeight
  }));
  assert.ok(bounds.scrollWidth<=bounds.width+2);
  assert.ok(bounds.scrollHeight<=bounds.height+2);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
