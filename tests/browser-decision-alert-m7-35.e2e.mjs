import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000',KEY='supply-lab-v90';
async function verify(phone){
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(phone?{...devices['Pixel 7']}:
  {viewport:{width:1240,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/?m7-35='+(phone?'mobile':'desktop'),{waitUntil:'networkidle'});
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.actions={...s.actions,receiving:500,picking:500};
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="improvement"]').click();
  const cards=page.locator('#attentionSummary>.attention-item');
  const count=await cards.count();
  assert.ok(count>=1,'One signal for surprise demand must be present');
  assert.equal(await page.locator('#attentionSummary [data-alert-learning]').count(),count,
   'Each original operational warning retains its own optional lesson');
  assert.ok(await page.locator('#attentionSummary').innerText().then(s=>s.includes('Demanda superior')));
  const target=page.locator('#attentionSummary [data-alert-learning="unexpected-high"]');
  assert.equal(await target.count(),1);
  assert.equal(await target.getAttribute('open'),null,'Optional teaching must start collapsed');
  await target.locator('summary').click();
  assert.match(await target.textContent(),/Qué significa/);
  assert.match(await target.textContent(),/Qué revisar antes de actuar/);
  assert.match(await target.textContent(),/modelo agregado de una jornada/);
  assert.equal(await target.locator('[data-alert-limit="aggregate-day"]').count(),1);
  const old=await page.evaluate(key=>localStorage.getItem(key),KEY);
  await target.locator('summary').click();
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),old,
   'Expanding lessons must not write to session');
  await page.locator('#operationsTab').click();
  const mission=page.locator('#mission');
  const lesson=mission.locator('[data-decision-learning]');
  assert.equal(await lesson.count(),1);
  assert.equal(await lesson.getAttribute('open'),null);
  await lesson.locator('summary').click();
  assert.match(await lesson.textContent(),/Antes de continuar/);
  assert.match(await lesson.textContent(),/Flujo agregado de una jornada/);
  await page.locator('#roadmap button').nth(5).click();
  assert.equal(await mission.locator('[data-decision-learning]').count(),1);
  assert.equal(await mission.locator('[data-decision-learning]').getAttribute('data-decision-learning'),'inventory');
  const snapshot=await page.evaluate(key=>localStorage.getItem(key),KEY);
  await mission.locator('[data-decision-learning] summary').click();
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),snapshot,
   'Only navigation (not reading) may persist state');
  if(phone)for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   for(const section of ['operations','dashboard']){
    await page.locator('#'+section+'Tab').click();
    if(section==='dashboard')await page.locator('#resultTabs [data-result-target="improvement"]').click();
    const dims=await page.evaluate(()=>({
     width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
    }));
    assert.ok(dims.scroll<=dims.width+2,'Horizontal overflow '+width+'/'+section+': '+JSON.stringify(dims));
   }
   const rect=await page.locator('#attentionSummary [data-alert-learning="unexpected-high"] summary').boundingBox();
   assert.ok(rect?.height>=44,'Alert disclosure touch target');
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m7-35-'+(phone?'phone':'desktop')+'.png',
   fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M7-35 phone: accessible alert lessons and area decisions, unchanged session, 360/412px',
 {timeout:150000},()=>verify(true));
test('M7-35 desktop: every warning has read-only, grounded meaning and next check',
 {timeout:150000},()=>verify(false));
