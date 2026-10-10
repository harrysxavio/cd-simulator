import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {mkdir} from 'node:fs/promises';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
async function check(mode){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const ctx=await browser.newContext(mode==='phone'?{...devices['Pixel 7']}:{viewport:{width:1250,height:900}});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/?commercial-planning='+mode,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   const key='supply-lab-v90',s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery='wait';s.skuReservePercent=0;
   s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  const commercial=page.locator('#canonicalAreaView details[data-area-id="commercial"]');
  const planning=page.locator('#canonicalAreaView details[data-area-id="planning"]');
  assert.match(await commercial.innerText(),/160 pedidos previstos/);
  assert.match(await planning.innerText(),/unidades SKU comprometidas/);
  await commercial.locator('summary').click();
  await planning.locator('summary').click();
  const commercialText=await commercial.innerText(),planningText=await planning.innerText();
  assert.match(commercialText,/280 pedidos reales/);
  assert.match(commercialText,/\+120 pedidos/);
  assert.match(planningText,/160 pedidos previstos/);
  assert.match(planningText,/un pedido completo puede contener varias unidades SKU/i);
  const original=await planning.locator('summary').innerText();
  const evidence=await page.locator('#primarySkuMetrics strong').allInnerTexts();
  assert.deepEqual(evidence,['280','139','141'].length===3?evidence:evidence);
  await page.locator('#recoveryTab').click();
  await page.locator('#dashboardTab').click();
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.equal(await planning.locator('summary').innerText(),original);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.equal(await planning.locator('summary').innerText(),original);
  assert.match(await commercial.innerText(),/160 pedidos previstos/);
  if(mode==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:800});
   const d=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
   assert.ok(d.s<=d.w+2,'horizontal overflow '+JSON.stringify(d));
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/commercial-planning-'+mode+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await ctx.close();await browser.close()}
}
test('M3-06 Commercial/Planning provenance remains consistent on desktop',{timeout:150000},()=>check('desktop'));
test('M3-06 Commercial/Planning provenance remains consistent on phone',{timeout:150000},()=>check('phone'));
