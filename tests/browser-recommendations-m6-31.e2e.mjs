import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000',KEY='supply-lab-v90';
async function verify(mobile){
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mobile?{...devices['Pixel 7']}:{viewport:{width:1240,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  await page.goto(BASE+'/?m6-31='+(mobile?'mobile':'desktop'),{waitUntil:'networkidle'});
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery='combined';s.skuUrgentArrival=2;
   s.skuPurchaseCoverage=100;s.skuReservePercent=20;s.skuSeparateTransport=true;
   s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  const panel=page.locator('#skuLab .sku-recovery-guidance');
  assert.equal(await panel.count(),1);
  assert.equal(await panel.getAttribute('data-guidance-scope'),'sku-cohort');
  assert.equal(await panel.getAttribute('open'),null,'Guidance details are collapsed initially');
  await panel.locator('summary').first().click();
  const priority=panel.locator('[data-guidance-priority="selector"]');
  assert.equal(await priority.inputValue(),'service');
  assert.equal(await panel.locator('[data-guidance-summary="conditional"]').count(),1);
  assert.equal(await panel.locator('[data-guidance-viability="unverified"]').count(),1);
  assert.match(await panel.textContent(),/El costo total es desconocido/);
  const choices=panel.locator('.sku-guidance-result details').first();
  await choices.locator('summary').click();
  assert.deepEqual(await panel.locator('[data-guidance-alternative]').evaluateAll(ns=>
   ns.map(n=>n.dataset.guidanceAlternative)),
   ['wait','reserve','overtime','emergency','combined']);
  assert.match(await panel.locator('[data-guidance-alternative="reserve"]').textContent(),
   /costo de traslado no calibrado/);
  const old=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).skuRecovery,KEY);
  await priority.selectOption('commitments');
  assert.equal(await panel.locator('.sku-guidance-result [data-guidance-outcome]').count(),0);
  assert.match(await panel.textContent(),/compromisos modelados|compromisos comparables/i);
  const recommended=await panel.locator('.sku-guidance-result').getAttribute('data-guidance-option');
  assert.notEqual(recommended,'reserve','Unpriced reserve must not lead by financial exposure');
  const current=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).skuRecovery,KEY);
  assert.equal(current,old,'Guidance must not confirm or overwrite recovery decision');
  if(mobile)for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const dims=await page.evaluate(()=>({width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth}));
   assert.ok(dims.scroll<=dims.width+2,'Mobile overflow '+JSON.stringify({width,dims}));
   assert.equal(await page.locator('#resetAnytime').isVisible(),true);
  }
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  assert.equal(await page.locator('#skuLab .sku-recovery-guidance').count(),1);
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m6-31-'+(mobile?'phone':'desktop')+'.png',
   fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M6-31 mobile: conditional evidence, cost uncertainty and 360/412px',{timeout:150000},()=>verify(true));
test('M6-31 desktop: priority switch never confirms recovery',{timeout:150000},()=>verify(false));
