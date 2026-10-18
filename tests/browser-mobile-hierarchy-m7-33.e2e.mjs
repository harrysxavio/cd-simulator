import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-v90';
async function verify(mobile){
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mobile?{...devices['Pixel 7']}:
  {viewport:{width:1240,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)
  errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/?m7-33='+(mobile?'phone':'desktop'),{waitUntil:'networkidle'});
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',
    purchasing:'reliable',receiving:'low',quality:'slow',inventory:'weak'};
   s.skuPolicy='service';s.skuRecovery='combined';s.skuUrgentArrival=2;
   s.skuPurchaseCoverage=100;s.skuReservePercent=20;
   s.skuSeparateTransport=true;s.skuDecisions=[];
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  const tab=page.locator('#resultTabs');
  const read=async selector=>page.locator(selector).evaluateAll(rows=>
   rows.map(el=>({name:el.querySelector('span')?.textContent,
    number:el.querySelector('strong')?.textContent,
    small:el.querySelectorAll('small').length})));
  await tab.locator('[data-result-target="overview"]').click();
  const hero='#primarySkuMetrics[data-mobile-kpi-scope="sku-overview"]>.canonical-area-stat';
  assert.equal(await page.locator(hero).count(),3);
  const mainRows=await read(hero);
  assert.ok(mainRows.every(row=>row.name&&/^\d/.test(row.number)&&row.small===0),
   'Only one name and one number, with no repeated unit subline');
  assert.match(await page.locator('#primarySkuIntro').textContent(),/pedidos completos/);
  await tab.locator('[data-result-target="areas"]').click();
  const area='#canonicalAreaView [data-mobile-kpi-scope="sku-areas"]>.canonical-area-stat';
  assert.equal(await page.locator(area).count(),3);
  assert.ok((await read(area)).every(r=>r.small===0));
  assert.equal(await page.locator('#canonicalAreaView .canonical-area-step').count(),8);
  await page.locator('#canonicalAreaView .canonical-area-step').first().locator('summary').click();
  assert.ok(await page.locator('#canonicalAreaView .canonical-area-step').first().locator('.canonical-area-evidence').count());
  await tab.locator('[data-result-target="inventory"]').click();
  const digest=page.locator('#skuLab [data-trace-digest="sku-physical"]');
  assert.equal(await digest.count(),1);
  assert.match(await digest.textContent(),/expedidos.*pendientes/);
  const assumptions=page.locator('#skuLab [data-operational-context="sku-assumptions"]');
  assert.equal(await assumptions.count(),1);
  assert.equal(await assumptions.getAttribute('open'),null,
   'Long technical context starts collapsed');
  assert.ok(await assumptions.locator('.sku-operational-context-body small').count()>=14,
   'Auditable assumptions preserved, not deleted');
  await assumptions.locator('summary').click();
  assert.match(await assumptions.textContent(),/Comercial.*Planeaci[oó]n/);
  assert.match(await assumptions.textContent(),/Inventario f[ií]sico/);
  assert.equal(await page.locator('#skuLab .sku-recovery-guidance').count(),1,
   'Existing guidance stays independently accessible');
  if(mobile)for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const metrics=async selector=>page.locator(selector).evaluateAll(nodes=>
    nodes.map(el=>{
     const label=el.querySelector('span').getBoundingClientRect();
     const value=el.querySelector('strong').getBoundingClientRect();
     const rect=el.getBoundingClientRect();
     return {height:rect.height,labelY:label.y+label.height/2,
      valueY:value.y+value.height/2,labelX:label.right,valueX:value.left};
    }));
   for(const view of ['overview','areas']){
    await tab.locator('[data-result-target="'+view+'"]').click();
    const rows=await metrics(view==='overview'?hero:area);
    assert.equal(rows.length,3);
    assert.ok(rows.every(r=>r.height>=44&&r.height<=68&&
     Math.abs(r.labelY-r.valueY)<14&&r.labelX<=r.valueX+1),
     'Mobile KPI label/value must share compact readable row: '+
     JSON.stringify({width,view,rows}));
   }
   await tab.locator('[data-result-target="inventory"]').click();
   const geometry=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
   }));
   assert.ok(geometry.scroll<=geometry.width+2,
    'No horizontal overflow: '+JSON.stringify({width,geometry}));
   assert.equal(await page.locator('#resetAnytime').isVisible(),true);
   const hit=await assumptions.locator('summary').first().boundingBox();
   assert.ok(hit?.height>=44,'Assumptions toggle needs 44px touch target');
  }
  await page.reload({waitUntil:'networkidle'});
  await tab.locator('[data-result-target="overview"]').click();
  assert.equal(await page.locator(hero).count(),3);
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m7-33-'+(mobile?'phone':'desktop')+'.png',
   fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M7-33 Android 360/412: compact one-line KPIs, unchanged SKU traces and reachable details',
 {timeout:150000},()=>verify(true));
test('M7-33 desktop: SKU metrics, eight areas and technical drilldowns remain available',
 {timeout:150000},()=>verify(false));
