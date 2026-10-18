import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000',KEY='supply-lab-v90';
async function verify(phone){
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(phone?{...devices['Pixel 7']}:{viewport:{width:1240,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/?m6-32='+(phone?'phone':'desktop'),{waitUntil:'networkidle'});
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
  const panel=page.locator('#skuLab .sku-decision-explanation');
  assert.equal(await panel.count(),1);
  assert.equal(await panel.getAttribute('data-explanation-scope'),'sku-cohort');
  assert.equal(await panel.getAttribute('open'),null,'Readability: pedagogical details start collapsed');
  await panel.locator('summary').first().click();
  const content=panel.locator('.sku-decision-explanation-content');
  assert.equal(await content.getAttribute('data-explanation-option'),'combined');
  assert.deepEqual(await panel.locator('[data-explanation-stage]').evaluateAll(nodes=>
   nodes.map(n=>n.dataset.explanationStage)),['situation','action','effect','evidence']);
  assert.match(await content.textContent(),/1\. Situación/);
  assert.match(await content.textContent(),/2\. Acción/);
  assert.match(await content.textContent(),/3\. Efecto observado/);
  const evidence=content.locator('[data-explanation-stage="evidence"]');
  assert.equal(await evidence.getAttribute('open'),null,'Evidence starts collapsed');
  await evidence.locator('summary').click();
  assert.deepEqual(await evidence.locator('[data-explanation-metric]').evaluateAll(nodes=>
   nodes.map(n=>n.dataset.explanationMetric)),['orders','pending','waiting']);
  assert.equal(await evidence.locator('[data-explanation-cost="qualified"]').count(),1);
  const select=panel.locator('[data-explanation-selector="recovery"]');
  await select.selectOption('reserve');
  assert.equal(await panel.locator('.sku-decision-explanation-content').getAttribute('data-explanation-option'),'reserve');
  assert.match(await panel.textContent(),/costo desconocido, NO CLP 0/);
  const limits=panel.locator('.sku-decision-explanation-content details').last();
  await limits.locator('summary').click();
  assert.ok(await panel.locator('[data-explanation-limit]').count()>=4);
  assert.match(await limits.textContent(),/OTIF/);
  await select.selectOption('emergency');
  assert.match(await panel.textContent(),/Una orden urgente no equivale/);
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).skuRecovery,KEY);
  assert.equal(saved,'combined','Reading other decisions must not save or confirm a new choice');
  if(phone)for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const sizes=await page.evaluate(()=>({width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth}));
   assert.ok(sizes.scroll<=sizes.width+2,'Horizontal overflow '+width+': '+JSON.stringify(sizes));
   assert.equal(await page.locator('#resetAnytime').isVisible(),true);
   const target=await panel.locator('summary').first().boundingBox();
   assert.ok(target?.height>=44,'Small educational panel toggle on '+width);
  }
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  assert.equal(await page.locator('#skuLab .sku-decision-explanation').count(),1);
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m6-32-'+(phone?'phone':'desktop')+'.png',
   fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M6-32 phone: situation/action/effect/evidence with real option switches at 360/412px',
 {timeout:150000},()=>verify(true));
test('M6-32 desktop: no persisted decision changes and evidence has provenance',
 {timeout:150000},()=>verify(false));
