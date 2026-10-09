import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
async function caseUnderforecast(mobile){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mobile?{...devices['Pixel 7']}:{viewport:{width:1280,height:850}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('JavaScript: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('Console: '+m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});
 try{
  await page.goto(BASE+'/?case-underforecast='+(mobile?'mobile':'desktop'),{waitUntil:'networkidle'});
  // Commercial underestimates, Planning covers just 70%, Purchasing chooses a
  // reliable original supplier; all other departments retain normal defaults.
  await page.locator('#choices .choice').filter({hasText:'Forecast conservador'}).click();
  await page.locator('#next').click();
  await page.locator('#choices .choice').filter({hasText:'Priorizar 70 % de faltantes'}).click();
  await page.locator('#next').click();
  await page.locator('#choices .choice').filter({hasText:'Proveedor confiable'}).click();
  for(let i=0;i<6;i++)await page.locator('#next').click();
  assert.equal(await page.locator('#preliminarySection').isVisible(),true);
  await page.locator('#diagnosisOverride summary').click();
  const sign=page.getByLabel('Signo de variación de demanda');
  await sign.selectOption('1');
  const percent=page.getByLabel('Porcentaje de variación de demanda');
  await percent.fill('40');
  await page.locator('#surpriseOverride button').filter({hasText:'Aplicar escenario'}).click();
  const briefing=await page.locator('#directorReason').innerText();
  assert.match(briefing,/disponibilidad es insuficiente/);
  assert.match(await page.locator('#directorEvidence').innerText(),/834/);
  assert.equal(await page.locator('#diagnosisTechnical').getAttribute('open'),null,'El detalle técnico debe iniciar plegado');
  await page.locator('#diagnosisTechnical summary').click();
  const details=await page.locator('#demandComparison').innerText();
  assert.match(details,/1\.400/,'Demand should be 1400 after reveal');
  assert.match(details,/800/,'Forecast should remain 800');
  assert.match(await page.locator('#preliminaryMetrics').innerText(),/834/,'Underforecast scenario must show 834 unmet units');

  // The main model correctly knows the other operations have enough capacity;
  // its recovery UI still cannot issue a NEW post-shock PO. SKU pilots can.
  await page.locator('#dashboardTab').click();
  assert.equal(await page.locator('#primarySkuSummary').isVisible(),true,'Canonical SKU summary must be the primary result');
  assert.equal(await page.locator('#legacyAggregateDetails').getAttribute('open'),null,'One-shift legacy result must start folded');
  assert.match(await page.locator('#primarySkuMetrics').innerText(),/280/,'SKU cohort must be distinguished from aggregate-day units');
  await page.locator('#legacyAggregateDetails summary').click();
  assert.equal((await page.locator('#completed').innerText()).trim(),'566');
  assert.equal((await page.locator('#pending').innerText()).trim(),'834');
  await page.locator('#resultTabs button[data-result-target="inventory"]').click();
  await page.locator('#skuPolicyControls button').filter({hasText:'Protección de servicio'}).click();
  let sku=await page.locator('#skuLab').innerText();
  assert.match(sku,/Pedidos finales 139 \/ 280/,'Baseline SKU must leave 141 pending');
  const planBefore=await page.locator('#skuLab .supply-trace').innerText();
  assert.match(planBefore,/Manifiesto SKU comprometido: SKU A 70 · SKU B 0 · SKU C 9/);
  // Post-surprise procurement is a NEW, separately valued PO, not retroactive.
  await page.locator('#skuLab button').filter({hasText:'Compra urgente SKU'}).first().click();
  sku=await page.locator('#skuLab').innerText();
  assert.match(sku,/Pedidos finales 279 \/ 280/,'Early urgent order should rescue 140 complete orders');
  assert.match(sku,/Reposición extraordinaria 247 unidades SKU/);
  const planAfter=await page.locator('#skuLab .supply-trace').innerText();
  assert.match(planAfter,/Manifiesto SKU comprometido: SKU A 70 · SKU B 0 · SKU C 9/,'Frozen original PO cannot change');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-v90')));
  assert.equal(stored.skuRecovery,'emergency');
  assert.equal(stored.revealed,true);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs button[data-result-target="inventory"]').click();
  assert.match(await page.locator('#skuLab').innerText(),/Pedidos finales 279 \/ 280/,'Selected rescue must survive reload');

  if(mobile){
   for(const width of [360,412]){
    await page.setViewportSize({width,height:820});
    const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
    assert.ok(dims.scroll<=dims.viewport+2,'Mobile horizontal overflow at '+width+'px '+JSON.stringify(dims));
    assert.equal(await page.locator('#resetAnytime').isVisible(),true);
   }
  }
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#resetAnytime').click();
  assert.equal(await page.locator('#operationsSection').isVisible(),true);
  assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-v90')))).revealed,false);
  assert.deepEqual(errors,[],'Uncaught browser errors');
 }catch(error){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/underforecast-'+(mobile?'mobile':'desktop')+'.png',fullPage:true}).catch(()=>{});
  throw error;
 }finally{await context.close();await browser.close()}
}
test('business acceptance: underestimate + underpurchase + 40% shock -> new PO rescue on desktop',{timeout:150000},()=>caseUnderforecast(false));
test('mobile business acceptance: same decisions, persistence, SKU rescue and restart',{timeout:150000},()=>caseUnderforecast(true));
