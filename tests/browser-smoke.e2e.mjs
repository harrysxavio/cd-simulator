// Browser-level smoke tests complement, rather than replace, deterministic model tests.
// These tests exercise actual DOM, ES modules, persisted state and navigation in Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium, devices} from 'playwright';

const BASE_URL=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const VIEWS=['overview','areas','inventory','economics','improvement'];

async function verifyExperience(mode){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mode==='mobile'
  ? {...devices['Pixel 7'],acceptDownloads:true}
  : {viewport:{width:1366,height:850},acceptDownloads:true});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push('JavaScript: '+error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push('Consola: '+message.text())});
 page.on('response',response=>{
  if(response.url().startsWith(BASE_URL)&&response.status()>=400)errors.push('HTTP '+response.status()+': '+response.url());
 });
 try{
  await page.goto(BASE_URL+'/?test-mode='+mode,{waitUntil:'networkidle'});
  assert.equal(await page.locator('#operationsSection').isVisible(),true,'La campaña inicial debe mostrarse');
  assert.match(await page.locator('#missionTitle').innerText(),/Comercial/,'La misión debe renderizarse');
  assert.ok(await page.locator('#choices .choice').count()>=3,'Faltan decisiones del área inicial');
  assert.ok((await page.locator('#nodeResult').innerText()).includes('Entrada:'),'Faltan consecuencias operativas');

  // Complete all eight planning areas using the actual navigation controls.
  for(let step=0;step<8;step++)await page.locator('#next').click();
  assert.equal(await page.locator('#preliminarySection').isVisible(),true,'El diagnóstico debe aparecer');
  assert.ok((await page.locator('#demandComparison').innerText()).trim().length>20,'Falta diagnóstico preliminar');
  assert.equal(await page.locator('#surpriseOverride').isVisible(),true,'Faltan controles de demanda sorpresa');

  await page.locator('#startRecovery').click();
  assert.equal(await page.locator('#recoverySection').isVisible(),true,'No abrió recuperación');
  await page.locator('#skipRecovery').click();
  assert.equal(await page.locator('#dashboardSection').isVisible(),true,'No abrió el resultado final');
  assert.notEqual((await page.locator('#completed').innerText()).trim(),'—','Resultado sin unidades expedibles');

  // Visit each result view, not just the default Summary tab.
  for(const view of VIEWS){
   await page.locator('#resultTabs [data-result-target="'+view+'"]').click();
   assert.equal(await page.locator('#dashboardSection').getAttribute('data-result-view'),view);
   // Some result views intentionally contain more than one content panel.
   const contentPanels=page.locator('[data-result-page="'+view+'"]');
   assert.ok(await contentPanels.count()>0,'Vista sin paneles: '+view);
   for(let index=0;index<await contentPanels.count();index++){
    assert.equal(await contentPanels.nth(index).isVisible(),true,'Panel oculto: '+view+' #'+index);
   }
  }
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  assert.ok(await page.locator('#skuLab .supply-trace').count()>0,'No aparece trazabilidad SKU');
  assert.match(await page.locator('#skuLab .supply-trace').innerText(),/Manifiesto SKU comprometido/);
  assert.match(await page.locator('#skuLab').innerText(),/Conciliación física y económica SKU correcta/);
  await page.locator('#skuLab .supply-trace summary').filter({hasText:'Ver conciliación de compras por SKU'}).click();
  assert.match(await page.locator('#skuLab .supply-trace').innerText(),/Proveedor incumple/);

  // A change in urgent-purchase controls must survive a real reload.
  const coverage=page.locator('#skuLab select[aria-label="Cobertura de compra urgente sobre faltante SKU"]');
  await coverage.selectOption('50');
  assert.equal(await coverage.inputValue(),'50');
  const date=page.locator('#skuLab select[aria-label="Día de recepción de compra urgente"]');
  await date.selectOption('13');
  assert.equal(await date.inputValue(),'13');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#preliminarySection').isVisible(),true,'No se restauró demanda revelada');
  await page.locator('#dashboardTab').click();
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  assert.equal(await page.locator('#skuLab select[aria-label="Cobertura de compra urgente sobre faltante SKU"]').inputValue(),'50','La cobertura no persistió');
  assert.equal(await page.locator('#skuLab select[aria-label="Día de recepción de compra urgente"]').inputValue(),'13','El plazo no persistió');

  if(mode==='desktop'){
   await page.locator('#resultTabs [data-result-target="improvement"]').click();
   const pendingDownload=page.waitForEvent('download');
   await page.locator('#export').click();
   const download=await pendingDownload;
   assert.match(download.suggestedFilename(),/\.csv$/);
  }else{
   // The page itself must not overflow horizontally (inner controls may scroll).
   for(const width of [412,360]){
    await page.setViewportSize({width,height:850});
    const bounds=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(bounds.scroll<=bounds.viewport+2,
     'Desbordamiento horizontal en móvil '+width+' px: contenido '+bounds.scroll+' px, viewport '+bounds.viewport+' px');
   }
  }

  // Restart requires consent and must erase the persisted campaign.
  await page.locator('#resultTabs [data-result-target="improvement"]').click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#restartFinal').click();
  assert.equal(await page.locator('#operationsSection').isVisible(),true,'Reinicio no vuelve a operación');
  assert.equal(await page.locator('#preliminarySection').isVisible(),false,'Reinicio conserva la demanda revelada');
  assert.match(await page.locator('#missionTitle').innerText(),/Comercial/);
  assert.deepEqual(errors,[],'Excepciones, errores de consola o recursos rotos en '+mode);
 }catch(error){
  // Keep a screenshot of the failed real browser session for GitHub Actions.
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/browser-'+mode+'.png',fullPage:true}).catch(()=>{});
  throw error;
 }finally{
  await context.close();
  await browser.close();
 }
}

test('real Chromium desktop: plan → demand → recovery → SKU → results → reset', {timeout:120000},()=>verifyExperience('desktop'));
test('Chromium mobile emulation: full journey, persistence and responsive layout', {timeout:120000},()=>verifyExperience('mobile'));
