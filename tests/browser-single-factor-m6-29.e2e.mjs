import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-v90';

async function verify(mobile){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mobile?{...devices['Pixel 7']}:{viewport:{width:1240,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  await page.goto(BASE+'/?m6-29='+(mobile?'phone':'desktop'),{waitUntil:'networkidle'});
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuRecovery='combined';s.skuUrgentArrival=2;s.skuPurchaseCoverage=100;
   s.skuReservePercent=0;s.skuSeparateTransport=true;s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  const trial=page.locator('#skuLab .sku-single-factor-trial');
  assert.equal(await trial.count(),1);
  assert.equal(await trial.getAttribute('data-counterfactual-scope'),'sku-cohort');
  assert.equal(await trial.getAttribute('open'),null,'Experiment must start collapsed');
  await trial.locator('summary').first().click();
  const factors=trial.locator('[data-counterfactual-selector="one-factor"]');
  assert.ok(await factors.count());
  assert.ok(await factors.locator('option').count()>=1);
  await factors.selectOption('dailyCapacity');
  assert.equal(await trial.locator('[data-counterfactual-factor="dailyCapacity"]').count(),1);
  assert.equal(await trial.locator('[data-counterfactual-metric="dispatched"]').count(),1);
  assert.equal(await trial.locator('[data-counterfactual-metric="pending"]').count(),1);
  assert.match(await trial.textContent(),/Costo incremental: no calibrado/);
  assert.match(await trial.textContent(),/no modifica ni confirma/i);
  assert.equal(await trial.locator('[data-counterfactual-cost="unpriced"]').count(),1);
  const days=trial.locator('details').last();
  await days.locator('summary').click();
  assert.equal(await trial.locator('[data-counterfactual-day]').count(),13);
  assert.match(await trial.locator('[data-counterfactual-day="12"]').innerText(),/pendientes/);
  if(mobile)for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth}));
   assert.ok(dimensions.scrollWidth<=dimensions.width+2,
    'Horizontal overflow '+width+'px: '+JSON.stringify(dimensions));
   assert.equal(await page.locator('#resetAnytime').isVisible(),true);
  }
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  assert.equal(await page.locator('#skuLab .sku-single-factor-trial').count(),1);
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m6-29-'+(mobile?'mobile':'desktop')+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M6-29 mobile: a cost-unpriced one-input scenario is auditable without overflowing',{timeout:150000},()=>verify(true));
test('M6-29 desktop: experiment uses original baseline, not the chosen combined recovery',{timeout:150000},()=>verify(false));
