import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

// Regression suite for users returning to an existing campaign after deployment.
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000',KEY='supply-lab-v90';
async function browserCase(name,mobile,verify){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mobile?{...devices['Pixel 7']}:{viewport:{width:1280,height:820}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});
 try{
  await page.goto(BASE+'/?session-test='+name,{waitUntil:'networkidle'});
  await verify(page);
  assert.deepEqual(errors,[],'Error inesperado de navegador: '+name);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/session-'+name+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
async function readSession(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)}
async function replaceSession(page,updates,remove=[]){
 return page.evaluate(({key,updates,remove})=>{
  const previous=JSON.parse(localStorage.getItem(key));
  Object.assign(previous,updates);
  for(const name of remove)delete previous[name];
  localStorage.setItem(key,JSON.stringify(previous));
  return previous;
 },{key:KEY,updates,remove});
}
test('legacy v11.13 revealed session: escape diagnosis, read-only planning and restart', {timeout:120000},()=>browserCase('legacy-upgrade',false,async page=>{
 const previous=await replaceSession(page,{schemaVersion:1,revealed:true,shockDirection:1,phase:'recover',active:3},['currentSection']);
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('#preliminarySection').isVisible(),true,'Legacy state should resume diagnosis safely');
 assert.equal(await page.locator('#resetAnytime').isVisible(),true,'Global restart hidden in diagnosis');
 assert.equal(await page.locator('#goToOperations').isVisible(),true);

 await page.locator('#operationsTab').click();
 assert.equal(await page.locator('#operationsSection').isVisible(),true,'Operation tab must no longer redirect to diagnosis');
 assert.equal(await page.locator('#preliminarySection').isVisible(),false);
 assert.ok((await page.locator('#choices').innerText()).includes('Decisiones originales cerradas'));
 assert.ok(await page.locator('#choices .choice').count()>=3);
 assert.equal(await page.locator('#choices .choice:not([disabled])').count(),0,'Revealed initial choices must be frozen');
 assert.equal(await page.locator('#choices .numeric-input:not([disabled])').count(),0,'Original purchasing input was editable');
 const frozen=await readSession(page);
 assert.deepEqual(frozen.decisions,previous.decisions,'Upgrading or revisiting must preserve decisions');

 // Pressing cancel must preserve the entire campaign, including revealed demand.
 page.once('dialog',dialog=>dialog.dismiss());
 await page.locator('#resetAnytime').click();
 assert.equal((await readSession(page)).campaignId,previous.campaignId);
 assert.equal((await readSession(page)).revealed,true);

 // Correct, visible one-action escape hatch.
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#resetAnytime').click();
 assert.equal(await page.locator('#operationsSection').isVisible(),true);
 const cleared=await readSession(page);
 assert.notEqual(cleared.campaignId,previous.campaignId);
 assert.equal(cleared.revealed,false);
 assert.equal(cleared.currentSection,'operations');
 assert.equal(cleared.skuRecovery,'wait');
 assert.equal(cleared.skuPurchaseCoverage,100);
 assert.ok(await page.locator('#choices .choice:not([disabled])').count()>=3);
 assert.equal(await page.locator('#preliminarySection').isVisible(),false);
}));

test('saved setup, operation, recovery and result screens reopen at the correct stage', {timeout:150000},()=>browserCase('saved-stages',false,async page=>{
 for(const stage of ['setup','operations','preliminary','recovery','dashboard']){
  const previous=await replaceSession(page,{schemaVersion:2,currentSection:stage,revealed:true,shockDirection:-1,phase:stage==='recovery'?'recover':'plan',active:4});
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#'+stage+'Section').isVisible(),true,'Wrong saved section: '+stage);
  assert.equal((await readSession(page)).currentSection,stage);
  assert.equal((await readSession(page)).campaignId,previous.campaignId);
  assert.equal(await page.locator('#resetAnytime').isVisible(),true);
  if(stage==='recovery'){
   assert.equal(await page.locator('#recoveryHost #mission').count(),1,'Recovery mission was not reparented');
   assert.ok(await page.locator('#choices .recovery-option').count()>=1,'Recovery controls unavailable');
  }
  if(stage==='dashboard'){
   await page.locator('#resultTabs [data-result-target="inventory"]').click();
   assert.match(await page.locator('#skuLab').innerText(),/Conciliación física y económica SKU correcta/);
  }
 }
 // The always-present operation shortcut works from results, even after a reload.
 await page.locator('#goToOperations').click();
 assert.equal(await page.locator('#operationsSection').isVisible(),true);
 assert.equal((await readSession(page)).currentSection,'operations');
 assert.ok((await page.locator('#choices').innerText()).includes('Decisiones originales cerradas'));
}));

test('mobile sticky restart, corrupt previous save and real restart without horizontal overflow', {timeout:120000},()=>browserCase('mobile-recovery',true,async page=>{
 await page.evaluate(key=>localStorage.setItem(key,'{malformed JSON'),KEY);
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('#operationsSection').isVisible(),true,'Corrupt saved JSON blocks operations');
 assert.equal(await page.locator('#resetAnytime').isVisible(),true);
 const initial=await readSession(page);
 assert.ok(initial.campaignId);
 await page.locator('#openReport').click();
 assert.equal(await page.locator('#preliminarySection').isVisible(),true);
 await page.evaluate(()=>window.scrollTo(0,600));
 const rect=await page.locator('.session-controls').boundingBox();
 assert.ok(rect&&rect.y>=-3&&rect.y<40,'Session controls are not sticky on mobile: '+JSON.stringify(rect));
 await page.locator('#goToOperations').click();
 assert.equal(await page.locator('#operationsSection').isVisible(),true);
 assert.equal(await page.locator('#choices .choice:not([disabled])').count(),0);
 const before=await readSession(page);
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#resetAnytime').click();
 const after=await readSession(page);
 assert.notEqual(after.campaignId,before.campaignId);
 assert.equal(after.revealed,false);
 for(const width of [360,412]){
  await page.setViewportSize({width,height:850});
  const size=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(size.scroll<=size.viewport+2,'Overflow '+width+'px: '+JSON.stringify(size));
  assert.equal(await page.locator('#resetAnytime').isVisible(),true);
 }
}));

test('editable form controls in campaign and recovery have accessible labels', {timeout:120000},()=>browserCase('control-labels',false,async page=>{
 const assertInputs=async()=>{
  const unlabeled=await page.evaluate(()=>[...document.querySelectorAll('input,select')].filter(e=>{
   if(!e.getClientRects().length||e.disabled)return false;
   return !e.getAttribute('aria-label')&&!(e.labels?.length)&&!e.getAttribute('aria-labelledby');
  }).map(e=>e.outerHTML.slice(0,120)));
  assert.deepEqual(unlabeled,[],'Visible form elements without accessible label');
 };
 await page.locator('#setupTab').click();
 await assertInputs();
 await page.locator('#beginExercise').click();
 await assertInputs();
 await page.locator('#openReport').click();
 await assertInputs();
 await page.locator('#startRecovery').click();
 await assertInputs();
 await page.locator('#skipRecovery').click();
 await page.locator('#resultTabs [data-result-target="inventory"]').click();
 await assertInputs();
}));
