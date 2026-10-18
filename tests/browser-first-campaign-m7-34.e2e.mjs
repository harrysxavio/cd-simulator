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
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 const guide=page.locator('#firstCampaignGuide');
 const assertStage=async (n,section)=> {
  assert.equal(await guide.getAttribute('data-guide-step'),String(n));
  assert.equal(await guide.getAttribute('data-guide-section'),section);
  assert.equal(await page.locator('#firstGuideStep').count(),1);
  assert.ok((await page.locator('#firstGuideInstruction').textContent()).length>45);
 };
 try{
  await page.goto(BASE+'/?m7-34='+(phone?'phone':'desktop'),{waitUntil:'networkidle'});
  assert.equal(await guide.isVisible(),true);
  await assertStage(1,'operations');
  assert.match(await page.locator('#firstGuideInstruction').textContent(),/Área 1 de 8: Comercial/);
  assert.equal(await page.locator('#firstGuideLearn').getAttribute('open'),null);
  const toggle=page.locator('#firstGuideToggle');
  const prior=await page.evaluate(key=>localStorage.getItem(key),KEY);
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#firstGuideBody').isVisible(),false);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),prior,
   'Opening or hiding guide must not mutate the campaign state');
  await toggle.click();
  assert.equal(await page.locator('#firstGuideBody').isVisible(),true);
  await page.locator('#firstGuideLearn summary').click();
  assert.match(await page.locator('#firstGuideWhy').textContent(),/área|pedidos/i);
  // Complete the real operation workflow without forced tutorial gates.
  for(let i=0;i<8;i++){
   await assertStage(1,'operations');
   assert.match(await page.locator('#firstGuideInstruction').textContent(),
    new RegExp('Área '+(i+1)+' de 8'));
   await page.locator('#next').click();
  }
  assert.equal(await page.locator('#preliminarySection').isVisible(),true);
  await assertStage(2,'preliminary');
  assert.match(await page.locator('#firstGuideInstruction').textContent(),/principal señal de alerta/);
  const planned=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).decisions,KEY);
  await page.locator('#startRecovery').click();
  assert.equal(await page.locator('#recoverySection').isVisible(),true);
  await assertStage(3,'recovery');
  assert.match(await page.locator('#firstGuideInstruction').textContent(),/continuar sin intervenir/);
  assert.equal(await page.locator('#skipRecovery').isVisible(),true);
  await page.locator('#skipRecovery').click();
  assert.equal(await page.locator('#dashboardSection').isVisible(),true);
  await assertStage(4,'dashboard');
  assert.match(await page.locator('#firstGuideWhy').textContent(),/no son entregas confirmadas/);
  const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).decisions,KEY);
  assert.deepEqual(after,planned,'Reading the tutorial cannot edit planned decisions');
  await page.reload({waitUntil:'networkidle'});
  await assertStage(4,'dashboard');
  assert.equal(await page.locator('#primarySkuMetrics .canonical-area-stat').count(),3);
  // Existing navigation and any optional configuration must still be available.
  await page.locator('#setupTab').click();
  assert.equal(await guide.isVisible(),false,'Configuration retains existing independent UI');
  await page.locator('#operationsTab').click();
  await assertStage(1,'operations');
  assert.match(await page.locator('#firstGuideInstruction').textContent(),/plan original quedó congelado/);
  if(phone)for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   for(const section of ['operations','preliminary','recovery','dashboard']){
    await page.locator('#'+section+'Tab').click();
    assert.equal(await guide.isVisible(),true);
    const dims=await page.evaluate(()=>({
     width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
    }));
    assert.ok(dims.scroll<=dims.width+2,'Overflow at '+width+' '+section+': '+JSON.stringify(dims));
    const bounds=await toggle.boundingBox();
    assert.ok(bounds?.height>=44,'Guide toggle touch target too small');
   }
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m7-34-'+(phone?'phone':'desktop')+'.png',
   fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M7-34 Android beginner: four missions, skip, reload, 360/412px and no overflow',
 {timeout:160000},()=>verify(true));
test('M7-34 desktop beginner: optional help never edits plan or creates a recovery action',
 {timeout:160000},()=>verify(false));
