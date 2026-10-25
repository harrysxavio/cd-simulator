import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

test('I2-22: Calidad, opciones y consejo de Nico, revelación sellada, resultados físicos',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','legacy-unchanged'));
  for(let i=0;i<5;i++)await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Calidad/);
  await page.getByRole('tab',{name:'Indicadores'}).click();
  const card=page.locator('.quality-release-teaching');
  assert.match(await card.innerText(),/95 %/);
  assert.match(await card.innerText(),/Retenida|No están perdidas|revisión/i);
  assert.doesNotMatch(await card.innerText(),/280 pedidos|demanda real observada/);
  const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
  await card.locator('summary').click();
  assert.match(await card.innerText(),/40 unidades/);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before);
  await page.getByRole('tab',{name:'Nico'}).click();
  await page.locator('.mentor-toggle').click();
  assert.match(await page.locator('.mentor-response').innerText(),/liberarla|Calidad/);
  assert.match(await page.locator('.mentor-response').innerText(),/Por ejemplo:/);
  await page.getByRole('tab',{name:'Decisión'}).click();
  await page.locator('.game-choice').first().click();
  await page.getByRole('tab',{name:'Indicadores'}).click();
  assert.match(await card.innerText(),/75 %/);
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(saved.choices.quality,'slow');
  assert.equal(saved.reveal,false);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.game-choice.chosen').count(),1);
  for(let i=0;i<4;i++)await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/280 pedidos/);
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene').innerText(),/se observaron 280/);
  await page.locator('#gameNext').click();
  const final=page.locator('.quality-outcome');
  assert.equal(await final.count(),1);
  assert.match(await final.innerText(),/Recibidas para revisión/);
  assert.match(await final.innerText(),/Liberadas/);
  assert.match(await final.innerText(),/Retenidas al cierre/);
  assert.match(await final.innerText(),/NO rechazado|NO rechazado, defectuoso/);
  await final.locator('summary').click();
  assert.match(await final.innerText(),/SKU A/);
  assert.match(await final.innerText(),/Día 2|Día 5|Día 10/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'legacy-unchanged');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});

test('I2-22: Calidad es legible en 320–740px y CTA no abandona viewport',
 {timeout:90000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:760}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  for(let i=0;i<5;i++)await page.locator('#gameNext').click();
  await page.getByRole('tab',{name:'Indicadores'}).click();
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[740,360]]){
   await page.setViewportSize({width,height});
   const g=await page.evaluate(()=>{
    const d=document.documentElement,b=document.querySelector('#gameNext').getBoundingClientRect();
    return {w:d.scrollWidth,cw:d.clientWidth,h:d.scrollHeight,ch:d.clientHeight,
     buttonBottom:b.bottom,buttonHeight:b.height};
   });
   assert.ok(g.w<=g.cw+2&&g.h<=g.ch+2,'No scroll exterior en '+width);
   assert.ok(g.buttonBottom<=height+2&&g.buttonHeight>=44,'CTA visible '+width);
  }
 }finally{await browser.close()}
});
