import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

test('Nico: tutorial rota gestos sin revelar la demanda ni pedir PNG aún no publicados',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[],requestedExpansion=[],brokenExpansion=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{
  if(request.url().includes('/expansion-2026-10-31/'))
   requestedExpansion.push(request.url());
 });
 page.on('response',response=>{
  if(response.url().includes('/expansion-2026-10-31/')&&response.status()!==200)
   brokenExpansion.push(response.status()+' '+response.url());
 });
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  const published=await page.evaluate(async()=>{
   const module=await import('/src/i2-nico-expansion.js');
   return module.I2_NICO_EXPANSION_READY;
  });
  const original=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
  await page.locator('.nico-manager-tutorial').click();
  const sources=[];
  for(let step=0;step<7;step++){
   const portrait=page.locator('.nico-journey-portrait');
   const src=await portrait.getAttribute('src');
   sources.push(src);
   if(published)assert.match(src,/^\.\/assets\/nico\/expansion-2026-10-31\//);
   await portrait.evaluate(img=>img.decode());
   assert.ok(await portrait.evaluate(img=>img.naturalWidth>0),
    'El retrato de Nico debe cargar en el paso '+(step+1));
   assert.match(await page.locator('.nico-journey-progress').innerText(),
    new RegExp((step+1)+' DE 7'));
   assert.doesNotMatch(await page.locator('.nico-journey-body').innerText(),
    /La demanda observada es \d+ pedidos/i);
   if(step<6)await page.locator('.nico-journey-next').click();
  }
  assert.ok(new Set(sources).size>=5,
   'El personaje debe cambiar de expresión según los siete pasos');
  if(published)assert.ok(requestedExpansion.length>=5,
   'Si los PNG están verificados, el tutorial debe servirlos');
  else assert.deepEqual(requestedExpansion,[],'Nunca pedir PNG no publicados');
  assert.deepEqual(brokenExpansion,[],'Todos los retratos nuevos deben servir HTTP 200');
  await page.locator('.nico-journey-next').click();
  // HTMLDialogElement.close() dispatches its close event asynchronously.
  // Wait for the UI to detach instead of asserting within the same tick.
  await page.locator('.nico-journey-dialog').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),
   original,'Solo cambiar imágenes no modifica decisiones ni semillas');
  assert.deepEqual(errors,[]);
 }finally{
  await context.close();
  await browser.close();
 }
});
