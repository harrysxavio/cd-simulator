// E2E MVP alpha gate: play eight operational decisions on a phone, explicitly
// reveal demand, compare recovery using the SAME SKU engine, then replay.
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

async function inPhone(run){
 const browser=await chromium.launch({
  headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined
 });
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('JS: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await run(page);
  assert.deepEqual(errors,[],'The mobile MVP must not have console/HTTP/JS errors');
 }finally{await context.close();await browser.close()}
}
const continueM=page=>page.locator('#gameNext').click();

test('MVP alpha: eight decisions, explicit reveal, fifth recovery and physical result on phone',
 {timeout:120000},()=>inPhone(async page=>{
 assert.match(await page.title(),/MVP alfa jugable/);
 assert.match(await page.locator('#gameScene').innerText(),/Hoy tú diriges/);
 assert.equal((await page.locator('#gameScene').innerText()).includes('280 pedidos'),false,
  'Actual demand must be absent before reveal');
 await continueM(page);
 for(let i=0;i<8;i++){
  assert.match(await page.locator('#gameStage').innerText(),new RegExp('Área '+(i+1)+' de 8'));
  assert.equal(await page.locator('.game-choice').count(),3);
  if(i===0)await page.locator('.game-choice').last().click(); // optimistic forecast
  const choices=await page.locator('.game-choice.chosen').count();
  assert.equal(choices,1);
  assert.equal(await page.locator('.learn-more').count(),2);
  assert.equal((await page.locator('#gameScene').innerText()).includes('280 pedidos'),false);
  await continueM(page);
 }
 assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
 assert.equal((await page.locator('#gameScene').innerText()).includes('aumentó un 40'),false);
 const stored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 assert.equal(stored.confirmedAreas.length,8);
 assert.equal(stored.reveal,false);
 await page.reload({waitUntil:'networkidle'});
 assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
 await continueM(page); // true reveal
 assert.match(await page.locator('#gameScene h1').innerText(),/40 %/);
 const revealed=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 assert.equal(revealed.reveal,true);
 assert.equal(await page.locator('.game-choice').count(),5);
 await page.locator('.game-choice').filter({hasText:'Compra urgente SKU'}).click();
 await page.getByLabel('Día de llegada o traslado').selectOption('13');
 await page.locator('.impact-btn').click();
 assert.match(await page.locator('.impact-result').innerText(),/Resultado estimado/);
 assert.match(await page.locator('.impact-result').innerText(),/Mejora frente a no intervenir: 0 pedidos/);
 await continueM(page);
 assert.match(await page.locator('#gameScene h1').innerText(),/consecuencias/);
 assert.equal(await page.locator('.metric-card').count(),2);
 assert.match(await page.locator('#gameScene').innerText(),/El costo operacional total es desconocido/);
 await page.reload({waitUntil:'networkidle'});
 assert.match(await page.locator('#gameScene h1').innerText(),/consecuencias/);
 await continueM(page);
 assert.match(await page.locator('#gameScene h1').innerText(),/tú diriges/);
}));

test('MVP alpha: one-screen footer, 320px-430px without page scroll, isolated V1 state',
 {timeout:60000},()=>inPhone(async page=>{
 const legacy=await page.evaluate(()=>localStorage.getItem('supply-lab-v90'));
 await continueM(page);
 for(const width of [320,360,390,412,430]){
  await page.setViewportSize({width,height:568});
  const geometry=await page.evaluate(()=>{
   const a=document.querySelector('#gameNext').getBoundingClientRect();
   const b=document.querySelector('#gameScene').getBoundingClientRect();
   return {viewport:innerHeight,width:document.documentElement.clientWidth,
    documentHeight:document.documentElement.scrollHeight,
    documentWidth:document.documentElement.scrollWidth,
    actionTop:a.top,actionBottom:a.bottom,actionHeight:a.height,
    sceneBottom:b.bottom};
  });
  assert.ok(geometry.documentWidth<=geometry.width+2,'Horizontal overflow '+width);
  assert.ok(geometry.documentHeight<=geometry.viewport+2,'Unexpected exterior vertical scroll '+width);
  assert.ok(geometry.actionTop>=0&&geometry.actionBottom<=geometry.viewport,
   'Action not always visible '+width+': '+JSON.stringify(geometry));
  assert.ok(geometry.actionHeight>=44);
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),legacy);
 const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 await page.locator('.game-choice').first().click();
 await page.reload({waitUntil:'networkidle'});
 const after=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 assert.equal(after.index,before.index);
 assert.equal(after.phase,'area');
 assert.equal(await page.locator('.game-choice.chosen').count(),1);
}));
