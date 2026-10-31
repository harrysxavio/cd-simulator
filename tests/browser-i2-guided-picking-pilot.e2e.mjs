import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

/**
 * I2-35.2: run the guided physical scenario through the exact game UX.
 * The constraint is known at planning; real demand is not disclosed until reveal.
 */
test('I2-35.2: Picking pilot is playable, persisted and explained only after results',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.i2-picking-pilot-debrief').count(),0);
  await page.getByRole('button',{name:'Activar reto de diagnóstico'}).click();
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(saved.seed,'alpha-case-04');
  assert.equal(saved.advanced.pickingLimitSkuPerDay,'10');
  assert.equal(saved.phase,'intro');
  assert.match(await page.locator('.i2-picking-pilot-card').innerText(),/10 unidades SKU/);
  assert.doesNotMatch(await page.locator('.i2-picking-pilot-card').innerText(),
   /300 pedidos observados|demanda aumentó un 50/);
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('.i2-picking-pilot-card').innerText(),/Reto de Picking activo/);
  await page.locator('#gameNext').click(); // Begin area journey
  for(let i=0;i<8;i++){
   if(i===6)assert.match(await page.locator('.i2-picking-pilot-card').innerText(),
    /10 unidades SKU/);
   await page.locator('#gameNext').click();
  }
  assert.equal(await page.locator('.i2-picking-pilot-debrief').count(),0);
  await page.locator('#gameNext').click(); // reveal
  assert.equal(await page.locator('.i2-picking-pilot-debrief').count(),0);
  await page.locator('#gameNext').click(); // no intervention, result
  await page.locator('#gameScene h1').filter({hasText:'consecuencias'}).waitFor();
  const debrief=page.locator('.i2-picking-pilot-debrief');
  assert.equal(await debrief.count(),1);
  assert.equal(await debrief.locator('.i2-picking-pilot-findings').count(),0,
   'Do not compute second physical scenario until requested');
  await debrief.locator('summary').click();
  await debrief.locator('.i2-picking-pilot-findings').waitFor();
  assert.match(await debrief.innerText(),/59 pedidos expedidos/);
  assert.match(await debrief.innerText(),/98 pedidos expedidos/);
  assert.match(await debrief.innerText(),/39 pedidos/);
  const persisted=await page.evaluate(k=>localStorage.getItem(k),KEY);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.i2-picking-pilot-debrief').count(),1);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),persisted);
  const layout=await page.evaluate(()=>({
   width:document.documentElement.clientWidth,
   scrollWidth:document.documentElement.scrollWidth,
   footerBottom:document.querySelector('#gameNext').getBoundingClientRect().bottom,
   height:document.documentElement.clientHeight
  }));
  assert.ok(layout.scrollWidth<=layout.width+2,'No horizontal overflow');
  assert.ok(layout.footerBottom<=layout.height+2,'Footer remains reachable');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});

test('I2-35.2: player can abandon the pilot before first decision',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:320,height:680}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Activar reto de diagnóstico'}).click();
  await page.getByRole('button',{name:'Volver al reto inicial'}).click();
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(saved.seed,'alpha-case-01');
  assert.equal(saved.advanced.pickingLimitSkuPerDay,'base');
  assert.equal(saved.confirmedAreas.length,0);
 }finally{await browser.close()}
});
