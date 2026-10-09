import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000',KEY='supply-lab-v90';
async function mobileCheck(stage){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7']});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('JS '+e.message));
 page.on('console',e=>{if(e.type()==='error')errors.push('Console '+e.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});
 try{
  await page.goto(BASE+'/?guided-mobile='+stage,{waitUntil:'networkidle'});
  if(stage==='operations'){
   assert.equal(await page.locator('#missionTitle').isVisible(),true);
   assert.equal(await page.locator('.mission-guide').isVisible(),true);
   assert.match(await page.locator('.mission-guide').innerText(),/Elige una opción/);
   assert.equal(await page.locator('.mission-impact-details').getAttribute('open'),null);
   assert.match(await page.locator('#choices .compact-flow').innerText(),/Llegan/);
   assert.match(await page.locator('#choices .compact-flow').innerText(),/siguen/);
   assert.equal(await page.locator('.flow-technical').getAttribute('open'),null);
   await page.locator('#choices .choice').filter({hasText:'Forecast conservador'}).click();
   const chosen=await page.locator('#choices .choice[aria-pressed="true"]').count();
   assert.ok(chosen>=1);
   await page.locator('.mission-impact-details summary').click();
   assert.equal(await page.locator('#nodeResult').isVisible(),true);
   await page.locator('#next').click();
   assert.match(await page.locator('#missionTitle').innerText(),/Planificación/);
  }else{
   await page.evaluate(key=>{
    const s=JSON.parse(localStorage.getItem(key));
    s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='preliminary';
    s.scenario={...s.scenario,demand:1000,demandShockPercent:30};
    s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
    s.skuPolicy='service';s.skuRecovery='wait';s.skuReservePercent=0;s.skuDecisions=[];
    localStorage.setItem(key,JSON.stringify(s));
   },KEY);
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('#preliminarySection').isVisible(),true);
   const cards=page.locator('#directorEvidence .director-stat');
   assert.equal(await cards.count(),3);
   assert.equal(await page.locator('#directorEvidence .director-stat small').count(),0,'Numbers must not repeat unit captions');
   assert.equal(await page.locator('.director-alternatives').getAttribute('open'),null);
   assert.equal(await page.locator('.director-scope-detail').getAttribute('open'),null);
   assert.equal(await page.locator('.director-why').getAttribute('open'),null);
   assert.match(await page.locator('#directorReason').innerText(),/Tu siguiente paso/);
   await page.locator('.director-why summary').click();
   assert.equal(await page.locator('.director-why p').isVisible(),true);
   await page.locator('#startRecovery').click();
   assert.equal(await page.locator('#recoverySection').isVisible(),true);
   const intro=await page.locator('.manager-recovery-intro').innerText();
   assert.match(intro,/Hoy debes decidir/);
   assert.equal(await page.locator('.manager-stock-details').getAttribute('open'),null);
   assert.equal(await page.locator('#skuRecoveryDecision .manager-preview-stat').count(),3);
   assert.equal(await page.locator('#skuRecoveryDecision .manager-preview-stat small').count(),0,'Do not repeat units under every amount');
   assert.equal(await page.locator('select[aria-label="Porcentaje del stock inicial ubicado en RESERVA-CD"]').count(),0,'Do not show irrelevant advanced reserve setting');
   await page.locator('.manager-option-btn').filter({hasText:'Habilitar reserva ubicada en el CD'}).click();
   assert.equal(await page.locator('select[aria-label="Porcentaje del stock inicial ubicado en RESERVA-CD"]').count(),1);
   assert.equal((await page.locator('.manager-option-btn.chosen')).count() instanceof Promise,false);
   const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).skuDecisions.length,KEY);
   assert.equal(before,0,'Preview must not commit any change');
   const date=page.getByLabel('Día de habilitación de la reserva ubicada');
   await date.selectOption('1');
   const timeline=page.locator('#skuRecoveryDecision .manager-po-detail');
   await timeline.first().locator('summary').first().click();
   assert.match(await timeline.first().innerText(),/Este calendario ayuda a ver cuándo avanza/);
   const quiet=page.locator('#skuRecoveryDecision .manager-zero-days');
   assert.equal(await quiet.getAttribute('open'),null,'Zero-dispatch days must stay hidden by default');
   const allCount=await page.locator('#skuRecoveryDecision .manager-shipment-day').count();
   assert.equal(allCount,13,'All 13 dates remain accessible in advanced detail');
   const activeCount=await page.locator('#skuRecoveryDecision .manager-po-detail > .manager-shipment-timeline .manager-shipment-day').count();
   assert.ok(activeCount>=1&&activeCount<13,'Only meaningful shipment days shown first');
  }
  for(const width of [360,412]){
   await page.setViewportSize({width,height:780});
   const dims=await page.evaluate(()=>{
    const bar=document.querySelector('.session-controls'),tabs=document.querySelector('.result-tabs');
    return {w:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,sessionPosition:getComputedStyle(bar).position,tabPosition:getComputedStyle(tabs).position};
   });
   assert.equal(dims.sessionPosition,'static','The global escape bar must never overlay phone content');
   assert.equal(dims.tabPosition,'static','Results tabs must not overlap phone content');
   assert.ok(dims.scroll<=dims.w+2,'Horizontal overflow '+width+' '+JSON.stringify(dims));
   const exit=await page.locator('#resetAnytime').boundingBox();
   assert.ok(exit?.height>=44,'Global restart button too small');
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/guided-phone-'+stage+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('U5 phone: decision first, one flow summary and detail on request',{timeout:150000},()=>mobileCheck('operations'));
test('U5 phone: compact diagnosis, reserve only in context, active dispatch days only',{timeout:150000},()=>mobileCheck('recovery'));
