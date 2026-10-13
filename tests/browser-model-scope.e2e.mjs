import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

// A browser-level check ensures labels aren't merely documentation: they
// remain visible while navigating real SKU and aggregate model screens.
async function verify(mode){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({
  ...(mode==='phone'?devices['Pixel 7']:{viewport:{width:1250,height:900}}),
  acceptDownloads:true
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/?scope-audit='+mode,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   const key='supply-lab-v90',s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery='emergency';s.skuReservePercent=0;
   s.skuUrgentArrival=1;s.skuPurchaseCoverage=100;s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#primarySkuSummary').getAttribute('data-model-scope'),'sku-cohort');
  assert.equal(await page.locator('#canonicalAreaView').getAttribute('data-model-scope'),'sku-cohort');
  assert.equal(await page.locator('#legacyAggregateDetails').getAttribute('data-model-scope'),'aggregate-shift');
  assert.equal(await page.locator('#legacyAggregateDetails').getAttribute('open'),null);
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.equal(await page.locator('#canonicalAreaView').isVisible(),true);
  assert.ok((await page.locator('#canonicalAreaView').innerText()).length>100);
  // M2-04c: review decision provenance in the existing SKU inventory tab.
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  const coverage=page.locator('[data-decision-coverage="sku-events"]');
  assert.equal(await coverage.count(),1);
  assert.equal(await coverage.locator('[data-evidence-class="managerial-plan"]').count(),2);
  assert.equal(await coverage.locator('[data-evidence-class="dated-simulation"]').count(),6);
  await coverage.locator('summary').click();
  assert.match(await coverage.innerText(),/capacidad|SKU|stock/i);
  // M5-20: the five recovery options reuse the same pre-intervention base.
  const commonBase=page.locator('[data-baseline-scope="sku-cohort"]');
  assert.equal(await commonBase.count(),1);
  assert.equal(await commonBase.getAttribute('open'),null);
  await commonBase.locator(':scope > summary').click();
  assert.match(await commonBase.innerText(),/Misma base para las 5 alternativas/);
  assert.match(await commonBase.innerText(),/Demanda real:/);
  assert.match(await commonBase.innerText(),/stock inicial:/);
  assert.match(await commonBase.innerText(),/Compra original comprometida: CLP/);
  assert.match(await commonBase.innerText(),/Cambiar solo la recuperación NO modifica esta base/);
  assert.equal(await page.locator('.sku-advisor-option').count(),5);
  if(mode==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const limits=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
   }));
   assert.ok(limits.scroll<=limits.width+2,'Shared baseline mobile overflow '+JSON.stringify(limits));
   const rect=await commonBase.locator('summary').boundingBox();
   assert.ok(rect?.height>=44,'Baseline control must be at least 44px tall');
  }

  // M5-21: the waiting option MUST reproduce the exact no-action baseline.
  const wait=page.locator('[data-wait-scope="sku-cohort"]');
  assert.equal(await wait.count(),1);
  assert.equal(await wait.getAttribute('open'),null);
  await wait.locator(':scope > summary').click();
  assert.match(await wait.innerText(),/Esperar sin intervenir/);
  assert.match(await wait.innerText(),/costo incremental CLP 0/);
  assert.match(await wait.innerText(),/pendientes al cierre/);
  assert.match(await wait.innerText(),/NO tienen fecha de salida prometida/);
  const days=wait.locator('details').first();
  assert.equal(await days.getAttribute('open'),null);
  await days.locator('summary').click();
  assert.equal(await wait.locator('[data-wait-day]').count(),13);
  assert.match(await days.innerText(),/Día 0/);
  assert.match(await days.innerText(),/Día 12/);
  assert.match(await days.innerText(),/pendientes/);
  if(mode==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const widths=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
   }));
   assert.ok(widths.scroll<=widths.width+2,'Wait option causes horizontal scroll '+JSON.stringify(widths));
   for(const control of [wait.locator(':scope > summary'),days.locator('summary')]){
    const rect=await control.boundingBox();
    assert.ok(rect?.height>=44,'Wait disclosure below touch size');
   }
  }

  // M4-14: SKU cost rates are visible on demand, never masquerade as P&L.
  const costRates=page.locator('[data-cost-scope="sku-cohort"]');
  assert.equal(await costRates.count(),1);
  assert.equal(await costRates.getAttribute('open'),null);
  await costRates.locator('summary').click();
  assert.equal(await costRates.locator('[data-sku-cost-id]').count(),3);
  assert.equal(await costRates.locator('[data-activity-cost-id]').count(),5);
  assert.match(await costRates.innerText(),/SKU A: CLP 1\.800/);
  assert.match(await costRates.innerText(),/SKU B: CLP 3\.200/);
  assert.match(await costRates.innerText(),/SKU C: CLP 6\.500/);
  assert.match(await costRates.innerText(),/no pagos ni utilidad/i);
  if(mode==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:800});
   const sizes=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(sizes.scroll<=sizes.width+2,'SKU cost disclosure overflow '+JSON.stringify(sizes));
   const target=await costRates.locator('summary').boundingBox();
   assert.ok(target?.height>=44,'Cost disclosure is not touch-friendly');
  }

  // M4-15: one immutable daily valuation; drilldowns stay folded on phones.
  const valuation=page.locator('[data-valuation-scope="sku-cohort"]');
  assert.equal(await valuation.count(),1);
  assert.equal(await valuation.getAttribute('open'),null);
  await valuation.locator(':scope > summary').click();
  assert.match(await valuation.innerText(),/Apertura CLP/);
  assert.match(await valuation.innerText(),/stock físico CLP/);
  assert.match(await valuation.innerText(),/no crean inventario, compras ni pagos/);
  const skuDetail=valuation.locator('details').first();
  const dailyDetail=valuation.locator('details').nth(1);
  assert.equal(await skuDetail.getAttribute('open'),null);
  assert.equal(await dailyDetail.getAttribute('open'),null);
  await skuDetail.locator('summary').click();
  assert.equal(await valuation.locator('[data-valuation-sku]').count(),3);
  assert.match(await skuDetail.innerText(),/SKU A/);
  await dailyDetail.locator('summary').click();
  assert.equal(await valuation.locator('[data-valuation-day]').count(),13);
  assert.match(await dailyDetail.innerText(),/Día 12/);
  if(mode==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const dims=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(dims.scroll<=dims.width+2,'Valuation horizontal overflow '+JSON.stringify(dims));
   for(const summary of [valuation.locator(':scope > summary'),skuDetail.locator('summary'),dailyDetail.locator('summary')]){
    const touch=await summary.boundingBox();
    assert.ok(touch?.height>=44,'Valuation touch target below 44px');
   }
  }
  // M4-16: canonical PO values come from the same receipt book as SKU stock.
  const purchase=page.locator('[data-purchase-cost-scope="sku-cohort"]');
  assert.equal(await purchase.count(),1);
  assert.equal(await purchase.getAttribute('open'),null,'PO costing should start collapsed');
  await purchase.locator(':scope > summary').click();
  assert.match(await purchase.innerText(),/Compromiso original CLP/);
  assert.match(await purchase.innerText(),/compra urgente CLP/);
  assert.match(await purchase.innerText(),/en tránsito CLP/);
  assert.match(await purchase.innerText(),/ingresado al CD CLP/);
  assert.match(await purchase.innerText(),/Pago real: sin comprobante/);
  assert.match(await purchase.innerText(),/Incluye stock inicial/);
  const poOrders=purchase.locator('details').first();
  const poDays=purchase.locator('details').nth(1);
  assert.equal(await poOrders.getAttribute('open'),null);
  assert.equal(await poDays.getAttribute('open'),null);
  await poOrders.locator('summary').click();
  assert.ok(await purchase.locator('[data-purchase-order-id]').count()>=3);
  assert.match(await poOrders.innerText(),/Original · SKU A/);
  await poDays.locator('summary').click();
  assert.equal(await purchase.locator('[data-purchase-cost-day]').count(),13);
  assert.match(await poDays.innerText(),/Día 12/);
  if(mode==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const dimensions=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(dimensions.scroll<=dimensions.client+2,'M4-16 purchase panel overflow '+JSON.stringify(dimensions));
   for(const summary of [purchase.locator(':scope > summary'),poOrders.locator('summary'),poDays.locator('summary')]){
    const rect=await summary.boundingBox();
    assert.ok(rect?.height>=44,'M4-16 purchase disclosure must be touch-friendly');
   }
  }
  // M4-17: physically activated extra shifts, never invented payroll-hours.
  const resource=page.locator('[data-operational-cost-scope="sku-cohort"]');
  assert.equal(await resource.count(),1);
  assert.equal(await resource.getAttribute('open'),null);
  await resource.locator(':scope > summary').click();
  assert.match(await resource.innerText(),/Jornadas de refuerzo activadas/);
  assert.match(await resource.innerText(),/costo modelado CLP/);
  assert.match(await resource.innerText(),/Cupos adicionales asignados/);
  assert.match(await resource.innerText(),/ociosos/);
  assert.match(await resource.innerText(),/no horas ni trabajadores comprobados/);
  const resourceDays=resource.locator('details').first();
  assert.equal(await resourceDays.getAttribute('open'),null);
  await resourceDays.locator('summary').click();
  assert.equal(await resource.locator('[data-operational-cost-day]').count(),13);
  assert.match(await resourceDays.innerText(),/Día 12/);
  if(mode==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const viewport=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
   }));
   assert.ok(viewport.scroll<=viewport.width+2,'Operating cost phone overflow '+JSON.stringify(viewport));
   for(const summary of [resource.locator(':scope > summary'),resourceDays.locator('summary')]){
    const box=await summary.boundingBox();
    assert.ok(box?.height>=44,'Operating cost control not touch friendly');
   }
  }
  // M4-18: real SKU dispatch events drive the educational contribution.
  const economics=page.locator('[data-economic-scope="sku-cohort"]');
  assert.equal(await economics.count(),1);
  assert.equal(await economics.getAttribute('open'),null);
  await economics.locator(':scope > summary').click();
  assert.match(await economics.innerText(),/Pedidos completos expedidos/);
  assert.match(await economics.innerText(),/Valor potencial de expediciones CLP/);
  assert.match(await economics.innerText(),/costo estándar de SKU expedidos CLP/);
  assert.match(await economics.innerText(),/Contribución parcial estimada CLP/);
  assert.match(await economics.innerText(),/NO es utilidad, EBITDA/);
  assert.match(await economics.innerText(),/Excluidos de la resta: compras comprometidas/);
  const economicDays=economics.locator('details').first();
  const economicExclusions=economics.locator('details').nth(1);
  assert.equal(await economicDays.getAttribute('open'),null);
  assert.equal(await economicExclusions.getAttribute('open'),null);
  await economicDays.locator('summary').click();
  assert.equal(await economics.locator('[data-economic-day]').count(),13);
  assert.match(await economicDays.innerText(),/Día 12/);
  await economicExclusions.locator('summary').click();
  assert.match(await economicExclusions.innerText(),/Penalidad hipotética/);
  assert.match(await economicExclusions.innerText(),/expedición desde el CD/i);
  if(mode==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const sizes=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
   }));
   assert.ok(sizes.scroll<=sizes.width+2,'SKU economics overflow '+JSON.stringify(sizes));
   for(const summary of [
    economics.locator(':scope > summary'),economicDays.locator('summary'),
    economicExclusions.locator('summary')
   ]){
    const bounds=await summary.boundingBox();
    assert.ok(bounds?.height>=44,'Economics drilldown below touch-size minimum');
   }
  }
  // M4-19: independent financial audit remains readable, optional, and SKU scoped.
  const audit=page.locator('[data-financial-audit-scope="sku-cohort"]');
  assert.equal(await audit.count(),1);
  assert.equal(await audit.getAttribute('open'),null);
  await audit.locator(':scope > summary').click();
  assert.match(await audit.innerText(),/10 comprobaciones/);
  assert.match(await audit.innerText(),/contribución parcial conciliada/);
  assert.match(await audit.innerText(),/no auditoría contable/i);
  const included=audit.locator('details').first();
  const excluded=audit.locator('details').nth(1);
  assert.equal(await included.getAttribute('open'),null);
  assert.equal(await excluded.getAttribute('open'),null);
  await included.locator('summary').click();
  assert.equal(await audit.locator('[data-audit-included]').count(),3);
  assert.match(await included.innerText(),/Pedidos completos expedidos/);
  await excluded.locator('summary').click();
  assert.equal(await audit.locator('[data-audit-excluded]').count(),6);
  assert.match(await excluded.innerText(),/recargo supuesto sin factura/);
  assert.match(await excluded.innerText(),/activo físico no despachado/);
  if(mode==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const dimensions=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
   }));
   assert.ok(dimensions.scroll<=dimensions.width+2,'M4-19 audit overflow '+JSON.stringify(dimensions));
   for(const summary of [audit.locator(':scope > summary'),included.locator('summary'),excluded.locator('summary')]){
    const rect=await summary.boundingBox();
    assert.ok(rect?.height>=44,'M4-19 audit controls need 44px touch targets');
   }
  }
  await page.locator('#resultTabs [data-result-target="economics"]').click();
  assert.match(await page.locator('[data-result-page="economics"]').innerText(),/jornada agregada/);
  await page.locator('#resultTabs [data-result-target="improvement"]').click();
  assert.match(await page.locator('#report').innerText(),/No son pedidos completos SKU/);
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
  assert.equal(download.suggestedFilename(),'supply-chain-jornada-agregada.csv');
  const csv=await readFile(await download.path(),'utf8');
  assert.match(csv,/Modelo";"Jornada agregada"/);
  assert.match(csv,/Unidad";"unidades equivalentes de jornada"/);
  assert.match(csv,/No son pedidos SKU ni entregas al cliente/);
  assert.match(csv,/Área";"Entrada";"Salida";"Capacidad";"Recuperación"/);
  assert.deepEqual(errors,[]);
 }finally{
  await context.close();await browser.close();
 }
}

test('M2-04a scope-boundary and CSV are clear on desktop',{timeout:120000},()=>verify('desktop'));
test('M2-04a scope-boundary and CSV remain clear on phone',{timeout:120000},()=>verify('phone'));
