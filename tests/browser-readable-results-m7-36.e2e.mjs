import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000',KEY='supply-lab-v90';
async function verify(phone){
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(phone?{...devices['Pixel 7']}:
  {viewport:{width:1220,height:880}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)
  errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/?m7-36='+(phone?'phone':'desktop'),{waitUntil:'networkidle'});
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
  const panel=page.locator('#skuLab .sku-readable-results');
  assert.equal(await panel.count(),1);
  assert.equal(await panel.getAttribute('data-readable-scope'),'sku-cohort');
  assert.equal(await panel.getAttribute('open'),null,'Comparison initially collapsed');
  assert.equal(await panel.locator('[data-readable-option]').count(),0,'No table before opening');
  await panel.locator('summary').first().click();
  await panel.locator('[data-readable-option="combined"]').waitFor();
  const body=panel.locator('.sku-readable-comparison-body');
  assert.equal(await body.getAttribute('data-readable-mode'),'service');
  assert.equal(await body.getAttribute('data-readable-selected'),'combined');
  assert.deepEqual(await panel.locator('[data-readable-option]').evaluateAll(nodes=>
   nodes.map(n=>n.dataset.readableOption)),
   ['wait','reserve','overtime','emergency','combined']);
  assert.equal(await panel.locator('[data-readable-selected="true"]').count(),1);
  assert.equal(await panel.locator('[data-readable-boundary="sku-only"]').count(),1);
  assert.match(await body.textContent(),/días 0–12/);
  const initial=await page.evaluate(key=>localStorage.getItem(key),KEY);
  const view=panel.locator('[data-readable-view="selector"]');
  await view.selectOption('commitments');
  assert.equal(await body.getAttribute('data-readable-mode'),'commitments');
  const unpriced=panel.locator('[data-readable-option="reserve"] [data-readable-unpriced="true"]');
  assert.equal(await unpriced.count(),1);
  assert.match(await unpriced.textContent(),/Sin tarifa/);
  assert.match(await body.textContent(),/Costo real total desconocido/);
  const wait=panel.locator('[data-readable-option="wait"]');
  assert.match(await wait.textContent(),/Sin acción/);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),initial,
   'Switching comparison dimensions must never save a decision or invent an intervention');
  await view.selectOption('service');
  const nums=await panel.locator('[data-readable-option]').evaluateAll(nodes=>
   nodes.map(n=>[n.querySelector('.sku-readable-value').textContent,
    n.querySelector('.sku-readable-secondary').textContent]));
  assert.ok(nums.every(row=>row.length===2&&row.every(v=>/^[\d.]+$/.test(v))),
   'Physical values must remain integer order counts, not currency');
  if(phone)for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   for(const mode of ['service','commitments']){
    await view.selectOption(mode);
    const geometry=await page.evaluate(()=>({
     w:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
    }));
    assert.ok(geometry.scroll<=geometry.w+2,
     'Horizontal overflow '+width+' '+mode+': '+JSON.stringify(geometry));
    const cells=await panel.locator('[data-readable-option]').evaluateAll(nodes=>nodes.map(el=>{
     const root=el.getBoundingClientRect(),label=el.querySelector('.sku-readable-option').getBoundingClientRect();
     const number=el.querySelector('.sku-readable-value').getBoundingClientRect();
     return {height:root.height,overlap:label.right>number.left+2,
      inside:number.right<=root.right+2};
    }));
    assert.ok(cells.every(c=>c.height>=44&&!c.overlap&&c.inside),
     'Comparison must fit and keep touch targets: '+JSON.stringify({width,mode,cells}));
   }
   assert.equal(await page.locator('#resetAnytime').isVisible(),true);
  }
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="inventory"]').click();
  assert.equal(await page.locator('#skuLab .sku-readable-results').count(),1);
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m7-36-'+(phone?'phone':'desktop')+'.png',
   fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M7-36 mobile 360/412: five readable comparable scenarios, zero overlapping figures',
 {timeout:150000},()=>verify(true));
test('M7-36 desktop: changing service/cost view never changes stored recovery',
 {timeout:150000},()=>verify(false));
