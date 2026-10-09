import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
async function run(name,mobile,scenarioChanges,choiceChanges,expect){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mobile?{...devices['Pixel 7']}:{viewport:{width:1280,height:850}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});
 try{
  await page.goto(BASE+'/?u1='+name,{waitUntil:'networkidle'});
  await page.evaluate(({scenarioChanges,choiceChanges})=>{
   const key='supply-lab-v90',data=JSON.parse(localStorage.getItem(key));
   data.currentSection='preliminary';data.revealed=true;data.shockDirection=1;
   data.scenario={...data.scenario,demandShockPercent:40,...scenarioChanges};
   data.decisions={...data.decisions,...choiceChanges};
   localStorage.setItem(key,JSON.stringify(data));
  },{scenarioChanges,choiceChanges});
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#preliminarySection').isVisible(),true);
  assert.equal(await page.locator('#resetAnytime').isVisible(),true);
  assert.equal(await page.locator('#diagnosisTechnical').getAttribute('open'),null,'Advanced data must start collapsed');
  assert.equal(await page.locator('#directorReason').isVisible(),true);
  assert.match(await page.locator('#directorBriefing').innerText(),/escenario cambió/i);
  const diagnosis=await page.locator('#directorReason').innerText();
  assert.match(diagnosis,expect.reason);
  const essential=await page.locator('#directorEvidence').innerText();
  assert.match(essential,/Demanda real/);
  assert.match(essential,/Salieron del CD/);
  assert.equal(await page.locator('#directorEvidence').getAttribute('data-scope'),'sku-cohort');
  assert.match(essential,/Falta atender/);
  const buttons=await page.locator('#preliminarySection .director-cta .btn:visible').count();
  assert.ok(buttons>=1&&buttons<=2,'One clear primary and at most one optional pilot action');
  if(expect.pilot){
   assert.equal(await page.locator('#directorPilot').isVisible(),true);
   await page.locator('.director-alternatives > summary').click();
   assert.match(await page.locator('#directorOptions').innerText(),/Evaluar compra extraordinaria/);
   await page.locator('#directorPilot').click();
   assert.equal(await page.locator('#recoverySection').isVisible(),true);
   assert.match(await page.locator('#skuRecoveryDecision').innerText(),/Compra original comprometida/);
   assert.match(await page.locator('#skuRecoveryDecision').innerText(),/Solicitar reposición extraordinaria/);
   await page.locator('#preliminaryTab').click();
  }else assert.equal(await page.locator('#directorPilot').isVisible(),false,'Irrelevant emergency PO suggestion was displayed');
  await page.locator('#diagnosisTechnical summary').click();
  assert.equal(await page.locator('#demandComparison').isVisible(),true);
  assert.equal(await page.locator('#preliminaryFindings .diagnosis-card').count(),8,'Eight original technical area KPI must remain accessible');
  const badButtons=page.locator('#preliminaryFindings .diagnosis-card').filter({hasText:'Comercial'}).locator('button');
  assert.equal(await badButtons.count(),0,'Historical Commercial choices must not offer a fake post-shock recovery action');
  await page.locator('#diagnosisTechnical summary').click();

  await page.locator('#startRecovery').click();
  assert.equal(await page.locator('#recoverySection').isVisible(),true);
  assert.match(await page.locator('#missionTitle').innerText(),expect.destination);
  await page.locator('#preliminaryTab').click();
  assert.equal(await page.locator('#directorReason').isVisible(),true);
  assert.equal(await page.locator('#resetAnytime').isVisible(),true);
  if(mobile){
   for(const width of [360,412]){
    await page.setViewportSize({width,height:800});
    const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
    assert.ok(bounds.scroll<=bounds.width+2,'Horizontal overflow '+width+'px '+JSON.stringify(bounds));
    const button=page.locator('#startRecovery');
    const size=await button.boundingBox();
    assert.ok(size?.height>=44,'Primary manager action too short for touch');
   }
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/manager-u1-'+name+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('U1: manager diagnoses underforecast/underpurchase and enters honest SKU pilot on mobile',{timeout:130000},()=>run('underforecast-mobile',true,{}, {commercial:'under',planning:'partial',purchasing:'reliable'}, {reason:/disponibilidad es insuficiente/,destination:/Inventario/,pilot:true}));
test('U1: transport bottleneck does not recommend extraordinary purchase',{timeout:130000},()=>run('transport-desktop',false,{initialStock:1200},{transport:'low'},{reason:/Transporte está limitando/,destination:/Transporte/,pilot:false}));
test('U1: receiving bottleneck leads manager to receiving rather than commercial',{timeout:130000},()=>run('receiving-mobile',true,{initialStock:0},{receiving:'low',values:{receiving:100}},{reason:/Recepción está frenando/,destination:/Recepción/,pilot:false}));
