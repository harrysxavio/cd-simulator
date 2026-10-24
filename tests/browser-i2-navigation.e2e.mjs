import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1',V1='supply-lab-v90';

test('I2-09: touch and keyboard navigation use footer, reset scroll and protect revealed decisions',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:640}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  const untouched=await page.evaluate(k=>localStorage.getItem(k),V1);
  assert.equal(await page.locator('#gameBack').isVisible(),false);
  assert.equal(await page.locator('#gameNext').innerText(),'Comenzar misión →');
  await page.locator('#gameNext').click();
  assert.equal(await page.locator('#gameBack').isVisible(),true);
  assert.equal(await page.locator('#gameNext').innerText(),'Confirmar y siguiente →');
  // Scroll only the content, then confirm. The next scene resets its content scroll.
  await page.locator('.learn-more summary').first().click();
  await page.locator('#gameScene').evaluate(e=>{e.scrollTop=e.scrollHeight});
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameStage').innerText(),/Área 2 de 8/);
  assert.equal(await page.locator('#gameScene').evaluate(e=>e.scrollTop),0);
  await page.locator('#gameBack').click();
  assert.match(await page.locator('#gameStage').innerText(),/Área 1 de 8/);
  assert.equal(await page.locator('.game-choice:disabled').count(),3);
  assert.equal(await page.locator('#gameNext').innerText(),'Siguiente área →');
  await page.locator('#gameNext').focus();
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#gameStage').innerText(),/Área 2 de 8/);
  for(let i=2;i<=8;i++)await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
  let plan=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(plan.reveal,false);
  assert.equal(plan.confirmedAreas.length,8);
  await page.locator('#gameBack').click();
  assert.match(await page.locator('#gameStage').innerText(),/Área 8 de 8/);
  await page.locator('#gameNext').click();
  await page.locator('#gameNext').click(); // explicit reveal, not on previous "next"
  const revealed=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(revealed.reveal,true);
  assert.equal(revealed.phase,'recover');
  assert.equal(await page.locator('#gameBack').innerText(),'← Revisar plan');
  const before=JSON.stringify(revealed.choices);
  await page.locator('#gameBack').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Estas fueron tus ocho decisiones/);
  assert.equal(await page.locator('.area-detail').count(),8);
  assert.equal(await page.locator('.game-choice').count(),0);
  assert.equal(await page.locator('#gameBack').isVisible(),false);
  assert.equal(await page.locator('#gameNext').innerText(),'Volver a recuperación →');
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('#gameScene h1').innerText(),/Estas fueron tus ocho decisiones/);
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(saved.reveal,true);
  assert.equal(saved.phase,'review');
  assert.equal(JSON.stringify(saved.choices),before);
  await page.locator('#gameNext').click();
  assert.equal(await page.locator('#gameStage').innerText(),'Crisis · Recuperación');
  assert.equal(await page.locator('.game-choice').count(),5);
  const geometry=await page.evaluate(()=>{
   const action=document.querySelector('#gameNext').getBoundingClientRect();
   return {height:innerHeight,actionBottom:action.bottom,
    documentHeight:document.documentElement.scrollHeight,
    sceneScroll:getComputedStyle(document.querySelector('#gameScene')).overflowY};
  });
  assert.ok(geometry.actionBottom<=geometry.height+2);
  assert.ok(geometry.documentHeight<=geometry.height+2);
  assert.equal(geometry.sceneScroll,'auto');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),V1),untouched);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
