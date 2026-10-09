import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000',KEY='supply-lab-v90';
async function exercise(device,option){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(device==='mobile'?{...devices['Pixel 7']}:{viewport:{width:1250,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('JS: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('Console: '+m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});
 try{
  await page.goto(BASE+'/?m2-m3='+device+'-'+option,{waitUntil:'networkidle'});
  await page.evaluate(({option,key})=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
   s.skuPolicy='service';s.skuRecovery=option;s.skuReservePercent=option==='reserve'?20:0;s.skuUrgentArrival=1;
   s.skuPurchaseCoverage=100;s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  },{option,key:KEY});
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.equal(await page.locator('#canonicalAreaView').isVisible(),true);
  assert.match(await page.locator('#canonicalAreaView').innerText(),/Cómo operaron las ocho áreas/);
  assert.match(await page.locator('#canonicalAreaView').innerText(),/280/);
  assert.match(await page.locator('#canonicalAreaView').innerText(),/12 días/);
  const ids=await page.locator('#canonicalAreaView .canonical-area-step').evaluateAll(els=>els.map(e=>e.getAttribute('data-area-id')));
  assert.deepEqual(ids,['commercial','planning','purchasing','receiving','quality','inventory','picking','transport']);
  assert.equal(await page.locator('#canonicalAreaView .canonical-area-step[open]').count(),0,'Detailed records must begin collapsed');
  await page.locator('#canonicalAreaView [data-area-id="commercial"] summary').click();
  assert.match(await page.locator('#canonicalAreaView [data-area-id="commercial"]').innerText(),/no se reescribe/);
  await page.locator('#canonicalAreaView [data-area-id="inventory"] summary').click();
  assert.match(await page.locator('#canonicalAreaView [data-area-id="inventory"]').innerText(),/Stock inicial \+ recibido/);
  await page.locator('#canonicalAreaView [data-area-id="transport"] summary').click();
  assert.match(await page.locator('#canonicalAreaView [data-area-id="transport"]').innerText(),/no se modela staging/);
  assert.match(await page.locator('#canonicalAreaView').innerText(),/no se suman a los indicadores agregados/);
  const detail=page.locator('#canonicalAreaView .canonical-day-detail');
  assert.equal(await detail.locator('.canonical-day-row').first().isVisible(),false);
  await detail.locator('summary').click();
  assert.equal(await detail.locator('.canonical-day-row').count(),13);
  assert.match(await detail.innerText(),/Día 12/);
  if(option==='reserve')assert.match(await page.locator('#canonicalAreaView [data-area-id="inventory"]').innerText(),/Traslados 59 SKU/);
  const before=await page.locator('#canonicalAreaView .canonical-area-numbers').innerText();
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.equal(await page.locator('#canonicalAreaView .canonical-area-numbers').innerText(),before,'Reload changed the physical campaign');
  if(device==='mobile')for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const dim=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(dim.scroll<=dim.width+2,'Mobile overflow '+JSON.stringify({width,dim}));
   assert.equal(await page.locator('#resetAnytime').isVisible(),true);
   const box=await page.locator('#canonicalAreaView [data-area-id="commercial"] summary').boundingBox();
   assert.ok(box?.height>=44,'Tap target too small for management decision');
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/canonical-areas-'+device+'-'+option+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M2/M3 canonical eight-area status, evidence and mobile 360/412px',{timeout:150000},()=>exercise('mobile','reserve'));
test('M2/M3 canonical flow under urgent purchase remains stable on desktop',{timeout:150000},()=>exercise('desktop','emergency'));
