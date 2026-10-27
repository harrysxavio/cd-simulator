import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
for(const mode of ['classic','multi']){
 test('I2-32: recorrido físico de ocho áreas en Pixel 7 '+mode,{timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','original-not-touched'));
  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++)await page.locator('#gameNext').click();
  assert.equal(await page.locator('.area-physical-trace').count(),0);
  await page.locator('#gameNext').click();
  assert.equal(await page.locator('.area-physical-trace').count(),0);
  if(mode==='classic')await page.locator('#gameNext').click();
  else{
   await page.locator('.multi-lever-panel > summary').click();
   await page.locator('#multiBuy').check();
   await page.locator('#multiBoost').check();
   await page.locator('#multiCompare').click();
   await page.locator('.multi-confirm-decision > summary').click();
   await page.locator('#multiCommit').click();
  }
  const trace=page.locator('.area-physical-trace');
  assert.equal(await trace.count(),1);
  assert.equal(await trace.evaluate(n=>n.open),false);
  await trace.locator('summary').first().click();
  assert.equal(await trace.locator('.area-trace-step').count(),8);
  const ids=await trace.locator('.area-trace-step').evaluateAll(ns=>ns.map(n=>n.dataset.area));
  assert.deepEqual(ids,['commercial','planning','purchasing','receiving',
   'quality','inventory','picking','transport']);
  await trace.locator('[data-area="picking"] > summary').click();
  assert.match(await trace.locator('[data-area="picking"]').innerText(),/Pregunta gerencial de Nico/);
  assert.match(await trace.locator('[data-area="picking"]').innerText(),/Fuente:/);
  await trace.locator('.area-trace-days > summary').click();
  assert.equal(await trace.locator('#physicalTraceDay option').count(),13);
  await trace.locator('#physicalTraceDay').selectOption('12');
  assert.match(await trace.locator('.area-trace-day-reading').innerText(),/Día 12/);
  assert.match(await trace.locator('.area-trace-day-reading').innerText(),/staging/);
  await trace.locator('.area-trace-by-sku > summary').click();
  assert.equal(await trace.locator('.area-trace-sku-row').count(),3);
  await trace.locator('.area-trace-bom > summary').click();
  assert.match(await trace.locator('.area-trace-bom').innerText(),/BOM/);
  await trace.locator('.area-trace-examples > summary').click();
  assert.match(await trace.locator('.area-trace-examples').innerText(),/Lote|No hubo/);
  assert.match(await trace.locator('.area-trace-examples').innerText(),/Pedido|No hubo/);
  assert.match(await trace.innerText(),/plan original/i);
  const metrics=await page.locator('.metrics-grid > .metric-card').count();
  assert.ok(metrics>=2);
  const sizes=await page.evaluate(()=>({
   vw:document.documentElement.clientWidth,
   sw:document.documentElement.scrollWidth,
   vh:document.documentElement.clientHeight,
   sh:document.documentElement.scrollHeight,
   next:document.querySelector('#gameNext').getBoundingClientRect().bottom
  }));
  assert.ok(sizes.sw<=sizes.vw+2,'no body horizontal scroll');
  assert.ok(sizes.sh<=sizes.vh+2,'no body vertical scroll');
  assert.ok(sizes.next<=sizes.vh+2,'bottom CTA remains visible');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.area-physical-trace').count(),1);
  assert.equal(await page.locator('.area-physical-trace').evaluate(n=>n.open),false);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'original-not-touched');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
 });
}
