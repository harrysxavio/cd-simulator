import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

/** Recorre el juego móvil real y comprueba que el análisis es posterior al resultado. */
test('I2-35.2: reto de Calidad visible, jugable y sin revelar demanda anticipadamente',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.i2-quality-guided-debrief').count(),0);
  await page.getByRole('button',{name:'Activar reto de Calidad'}).click();
  const active=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(active.guidedScenario,'quality-low-stock');
  assert.equal(active.advanced.stockProfile,'low');
  assert.equal(active.seed,'alpha-case-01');
  assert.doesNotMatch(await page.locator('.i2-quality-guided-card').innerText(),/280 pedidos|demanda aumentó/);
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('.i2-quality-guided-card').innerText(),/Reto activo/);
  assert.equal(await page.getByRole('button',{name:'Activar reto de diagnóstico'}).isDisabled(),true);
  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++)await page.locator('#gameNext').click();
  assert.equal(await page.locator('.i2-quality-guided-findings').count(),0);
  await page.locator('#gameNext').click(); // Revelar demanda
  assert.equal(await page.locator('.i2-quality-guided-debrief').count(),0);
  await page.locator('#gameNext').click(); // No intervenir; cerrar
  await page.locator('#gameScene h1').filter({hasText:'consecuencias'}).waitFor();
  const debrief=page.locator('.i2-quality-guided-debrief');
  assert.equal(await debrief.count(),1);
  assert.equal(await debrief.locator('.i2-quality-guided-findings').count(),0);
  await page.locator('#gameQualityAnalyze').click();
  assert.equal(await debrief.locator('.metric-card').count(),4);
  assert.match(await debrief.innerText(),/unidades SKU|pedidos/);
  assert.match(await debrief.innerText(),/Expedición del CD no equivale a entrega/);
  const saved=await page.evaluate(k=>localStorage.getItem(k),KEY);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.i2-quality-guided-debrief').count(),1);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),saved);
  const layout=await page.evaluate(()=>({
   width:document.documentElement.clientWidth,
   scrollWidth:document.documentElement.scrollWidth,
   footerBottom:document.querySelector('#gameNext').getBoundingClientRect().bottom,
   height:document.documentElement.clientHeight
  }));
  assert.ok(layout.scrollWidth<=layout.width+2,'sin desplazamiento horizontal');
  assert.ok(layout.footerBottom<=layout.height+2,'footer accesible');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});

test('I2-35.2: Calidad se puede abandonar antes de planificar',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:320,height:680}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Activar reto de Calidad'}).click();
  await page.getByRole('button',{name:'Volver a la misión inicial'}).click();
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(saved.guidedScenario,undefined);
  assert.equal(saved.seed,'alpha-case-01');
  assert.equal(saved.advanced.stockProfile,'standard');
  assert.equal(saved.confirmedAreas.length,0);
 }finally{await browser.close()}
});
