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
