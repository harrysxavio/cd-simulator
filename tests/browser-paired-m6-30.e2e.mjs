import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-v90';

async function verify(phone){
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(phone?{...devices['Pixel 7']}:
  {viewport:{width:1240,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
 try{
  await page.goto(BASE+'/?m6-30='+(phone?'phone':'desktop'),{waitUntil:'networkidle'});
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',
    purchasing:'reliable',quality:'slow',inventory:'weak',receiving:'low',
    picking:'low',transport:'low'};
   s.skuPolicy='service';s.skuRecovery='combined';s.skuUrgentArrival=2;
   s.skuPurchaseCoverage=100;s.skuReservePercent=0;
   s.skuSeparateTransport=true;s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  const panel=page.locator('#skuLab .sku-paired-counterfactual');
  assert.equal(await panel.count(),1);
  assert.equal(await panel.getAttribute('data-paired-scope'),'sku-cohort');
  assert.equal(await panel.getAttribute('open'),null,'Panel should be lazy and collapsed');
  assert.equal(await panel.locator('[data-paired-variant]').count(),0,
   'No second simulation before panel opens');
  await panel.locator('summary').first().click();
  await panel.locator('[data-paired-variant="joint"]').waitFor();
  assert.deepEqual(await panel.locator('[data-paired-variant]').evaluateAll(ns=>
   ns.map(n=>n.dataset.pairedVariant)),['base','A','B','joint']);
  const a=panel.locator('[data-paired-selector="A"]');
  const b=panel.locator('[data-paired-selector="B"]');
  assert.notEqual(await a.inputValue(),await b.inputValue(),
   'Two changes must remain independent');
  assert.equal(await panel.locator('[data-paired-interaction="orders"]').count(),1);
  assert.match(await panel.textContent(),/Costo adicional no calibrado/);
  assert.match(await panel.textContent(),/no cambia ni confirma/i);
  assert.equal(await panel.locator('[data-paired-cost="unpriced"]').count(),1);
  await a.selectOption('qualityReleasePercent');
  await b.selectOption('inventoryAccuracyPercent');
  const value=await panel.locator('.sku-paired-result').getAttribute('data-paired-factors');
  assert.equal(value,'qualityReleasePercent,inventoryAccuracyPercent');
  const daily=panel.locator('.sku-paired-result details').first();
  await daily.locator('summary').click();
  assert.equal(await panel.locator('[data-paired-day]').count(),13);
  assert.match(await panel.locator('[data-paired-day="12"]').textContent(),/pendientes/);
  if(phone)for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const size=await page.evaluate(()=>({width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth}));
   assert.ok(size.scroll<=size.width+2,'overflow at '+width+': '+JSON.stringify(size));
   assert.equal(await page.locator('#resetAnytime').isVisible(),true);
  }
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  assert.equal(await page.locator('#skuLab .sku-paired-counterfactual').count(),1);
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m6-30-'+(phone?'phone':'desktop')+'.png',
   fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M6-30 mobile: four alternatives and interaction at 360/412px',{timeout:150000},()=>verify(true));
test('M6-30 desktop: two-factor comparison does not mutate recovery',{timeout:150000},()=>verify(false));
