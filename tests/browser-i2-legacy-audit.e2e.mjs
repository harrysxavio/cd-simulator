import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const URL=BASE+'/?audit-i2=legacy';
const KEY='supply-lab-v90';
const views=['overview','areas','inventory','economics','improvement'];

async function withPhone(run){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760},acceptDownloads:true});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{await page.goto(URL,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);}
 finally{await context.close();await browser.close();}
}
const section=async(page,id)=>assert.equal(await page.locator('#'+id+'Section').isVisible(),true);
const tap=async(page,id)=>page.locator('#'+id).click();
const noXOverflow=async page=>{
 const d=await page.evaluate(()=>({w:document.documentElement.clientWidth,
  x:document.documentElement.scrollWidth}));
 assert.ok(d.x<=d.w+2,'Horizontal overflow '+JSON.stringify(d));
};

test('I2 AUDIT legacy mobile: setup, planning 8 areas, diagnosis, recovery and all result tabs', {timeout:180000},()=>withPhone(async page=>{
 await tap(page,'setupTab');await section(page,'setup');
 await page.locator('#strategyChoices button.choice').first().click();
 await page.locator('#demandPresets button.choice').first().click();
 await section(page,'operations');
 await tap(page,'setupTab');await tap(page,'resetScenario');await section(page,'operations');
 await page.locator('#roadmap button.node').nth(2).click();
 assert.match(await page.locator('#missionTitle').innerText(),/Compras/);
 await tap(page,'prev');
 assert.match(await page.locator('#missionTitle').innerText(),/Planning/);
 await page.locator('#choices button.choice').last().click();
 assert.equal(await page.locator('#choices button.choice[aria-pressed="true"]').count(),1);
 await tap(page,'goToOperations');await section(page,'operations');
 await page.locator('#roadmap button.node').first().click();
 for(let i=0;i<8;i++)await tap(page,'next');
 await section(page,'preliminary');
 assert.equal(await page.locator('#startRecovery').isVisible(),true);
 await page.locator('#diagnosisOverride summary').click();
 await page.getByLabel('Signo de variación de demanda').selectOption('1');
 await page.getByLabel('Porcentaje de variación de demanda').fill('40');
 await page.getByRole('button',{name:'Aplicar escenario'}).click();
 await section(page,'preliminary');
 assert.equal((await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).scenario.demandShockPercent,KEY)),40);
 await tap(page,'startRecovery');await section(page,'recovery');
 await tap(page,'skipRecovery');await section(page,'dashboard');
 for(const view of views){
  await page.locator('#resultTabs [data-result-target="'+view+'"]').click();
  assert.equal(await page.locator('#dashboardSection').getAttribute('data-result-view'),view);
  await noXOverflow(page);
 }
 await page.locator('#resultTabOverview').click();
 await tap(page,'overviewToAreas');await section(page,'dashboard');
 assert.equal(await page.locator('#dashboardSection').getAttribute('data-result-view'),'areas');
 await tap(page,'areasToInventory');assert.equal(await page.locator('#dashboardSection').getAttribute('data-result-view'),'inventory');
 await tap(page,'inventoryToEconomics');assert.equal(await page.locator('#dashboardSection').getAttribute('data-result-view'),'economics');
 await tap(page,'economicsToImprovement');assert.equal(await page.locator('#dashboardSection').getAttribute('data-result-view'),'improvement');
 await tap(page,'improvementToRecovery');await section(page,'recovery');
 await tap(page,'dashboardTab');await section(page,'dashboard');
 await tap(page,'primaryToAreas');assert.equal(await page.locator('#dashboardSection').getAttribute('data-result-view'),'areas');
 await tap(page,'dashboardTab');
 await page.locator('#resultTabs [data-result-target="improvement"]').click();
 const download=page.waitForEvent('download');
 await tap(page,'export');
 assert.match((await download).suggestedFilename(),/jornada-agregada[.]csv/);
 page.once('dialog',d=>d.dismiss());await tap(page,'resetAnytime');await section(page,'dashboard');
 page.once('dialog',d=>d.accept());await tap(page,'resetAnytime');await section(page,'operations');
}));

test('I2 AUDIT legacy mobile: recover options, no premature physical PO and safe restart',{timeout:180000},()=>withPhone(async page=>{
 await page.evaluate(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='recovery';
  s.scenario={...s.scenario,demandShockPercent:40};
  s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable'};
  s.skuPolicy='service';s.skuRecovery='wait';s.skuDecisions=[];
  localStorage.setItem(key,JSON.stringify(s));
 },KEY);
 await page.reload({waitUntil:'networkidle'});
 await section(page,'recovery');
 const opts=page.locator('#skuRecoveryDecision .manager-option-btn');
 assert.equal(await opts.count(),5,'All five SKU recovery strategies are reachable');
 for(const i of [0,1,2,3,4]){
  await opts.nth(i).click();await section(page,'recovery');
  assert.equal(await page.locator('#skuRecoveryDecision .manager-option-btn.chosen').count(),1);
  await noXOverflow(page);
 }
 const urgent=page.locator('#skuRecoveryDecision .manager-option-btn').filter({hasText:'Solicitar reposición extraordinaria'});
 await urgent.click();
 const date=page.getByLabel('Día previsto de compra extraordinaria en Recuperación');
 await date.selectOption('13');
 const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).skuDecisions.length,KEY);
 assert.equal(before,0,'Previewing an option must not commit PO');
 page.once('dialog',d=>d.dismiss());
 await tap(page,'confirmSkuDecision');
 assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).skuDecisions.length,KEY),0);
 page.once('dialog',d=>d.accept());
 await tap(page,'confirmSkuDecision');
 assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).skuDecisions.length,KEY),1);
 assert.equal(await page.locator('#confirmSkuDecision').count(),0,'Confirmation button is replaced by recorded decision');
 await page.locator('#skuRecoveryDecision button').filter({hasText:'Ver resultado y trazabilidad SKU'}).click();
 await section(page,'dashboard');
 page.once('dialog',d=>d.accept());await tap(page,'restartFinal');
 await section(page,'operations');
}));

test('I2 AUDIT legacy phone: measure vertical navigation burden without asserting an unproven visual defect',{timeout:150000},()=>withPhone(async page=>{
 const metrics=await page.evaluate(()=>{
  const id=n=>document.getElementById(n);
  const rect=n=>{const r=id(n)?.getBoundingClientRect();return r?{top:Math.round(r.top),height:Math.round(r.height),bottom:Math.round(r.bottom)}:null};
  return {viewport:innerHeight,bodyHeight:document.documentElement.scrollHeight,
   roadmap:rect('roadmap'),mission:rect('mission'),next:rect('next'),choices:rect('choices'),
   topNavigation:rect('operationsTab')};
 });
 console.log('I2_AUDIT_PHONE_360x760 '+JSON.stringify(metrics));
 assert.ok(metrics.roadmap&&metrics.mission&&metrics.choices&&metrics.next);
 assert.ok(metrics.bodyHeight>0);
 await noXOverflow(page);
}));
