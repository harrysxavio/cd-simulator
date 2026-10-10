import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {mkdir} from 'node:fs/promises';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-v90';
async function run(device){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const ctx=await browser.newContext(device==='phone'?{...devices['Pixel 7']}:{viewport:{width:1250,height:900}});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('JS: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('Console: '+m.text())});
 try{
  await page.goto(BASE+'/?staging-ui='+device,{waitUntil:'networkidle'});
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'full',purchasing:'express',
    receiving:'extra',quality:'priority',inventory:'count',picking:'reinforce',transport:'low'};
   s.skuPolicy='service';s.skuRecovery='wait';s.skuDecisions=[];
   s.skuSeparateTransport=false;
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  const toggle=page.locator('#skuPolicyControls button[aria-label="Separar Picking y Transporte con pedidos preparados en staging"]');
  assert.equal(await toggle.count(),1);
  assert.equal(await toggle.getAttribute('aria-pressed'),'false');
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.match(await page.locator('#canonicalAreaView [data-area-id="transport"]').innerText(),/no se modela staging/);
  const original=await page.locator('#primarySkuMetrics').innerText();
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).skuSeparateTransport,KEY),true);
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  const panel=page.locator('#canonicalAreaView');
  const names=await panel.locator('.canonical-area-stat span').allInnerTexts();
  assert.deepEqual(names.slice(0,3),['Sin preparar','En staging','Salieron del CD']);
  const count=await panel.locator('.canonical-area-stat strong').allInnerTexts();
  assert.equal(count.length,3);
  assert.equal(count.reduce((a,v)=>a+Number(v.replaceAll('.','')),0),280,'all physical orders must reconcile');
  const header=await page.locator('#primarySkuMetrics .canonical-area-stat span').allInnerTexts();
  assert.deepEqual(header,['Sin preparar','En staging','Despachados CD']);
  const picking=panel.locator('[data-area-id="picking"]'),transport=panel.locator('[data-area-id="transport"]'),inventory=panel.locator('[data-area-id="inventory"]');
  await picking.locator('summary').click();
  await transport.locator('summary').click();
  await inventory.locator('summary').click();
  assert.match(await picking.innerText(),/STAGING-CD/);
  assert.match(await transport.innerText(),/cola FIFO/);
  assert.match(await inventory.innerText(),/STAGING-CD/);
  const detail=panel.locator('.canonical-day-detail');
  await detail.locator('summary').click();
  const rows=await detail.locator('.canonical-day-row').allInnerTexts();
  assert.equal(rows.length,13);
  assert.ok(rows.every(x=>/preparados.*esperan camión.*expedidos/.test(x)));
  assert.ok(rows.every(x=>/STAGING-CD \d+ SKU/.test(x)));
  assert.ok(rows.some(x=>/esperan camión/.test(x)));
  const current=await page.locator('#primarySkuMetrics').innerText();
  assert.notEqual(current,original,'opt-in must modify the physical order-state view');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await toggle.getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#primarySkuMetrics').innerText(),current,'saved staging session must restore deterministic metrics');
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'),'false');
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).skuSeparateTransport,KEY),false);
  assert.equal(await page.locator('#primarySkuMetrics').innerText(),original,'turning off staging restores original model');
  if(device==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:810});
   const dim=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(dim.scroll<=dim.width+2,'horizontal overflow '+JSON.stringify(dim));
   const box=await toggle.boundingBox();
   assert.ok(box?.height>=44,'staging switch must remain touch accessible');
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/staging-ui-'+device+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await ctx.close();await browser.close()}
}
test('M3-12c staging visibility, opt-in and persistence desktop',{timeout:180000},()=>run('desktop'));
test('M3-12c staging visibility, opt-in and persistence Pixel 7',{timeout:180000},()=>run('phone'));
