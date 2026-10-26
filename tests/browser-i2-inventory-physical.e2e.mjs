import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

test('I2-23: inventario verificable y reserva, Nico, sorpresa sellada y cierre físico',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','original-v1-unchanged'));
  for(let i=0;i<6;i++)await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Inventario/);
  await page.getByRole('tab',{name:'Indicadores'}).click();
  const card=page.locator('.inventory-accuracy-teaching');
  assert.match(await card.innerText(),/95 %/);
  assert.match(await card.innerText(),/Stock verificable supuesto/);
  assert.doesNotMatch(await card.innerText(),/280 pedidos|demanda real observada/);
  const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
  await card.locator('summary').click();
  assert.match(await card.innerText(),/100 unidades físicas/);
  assert.match(await card.innerText(),/RESERVA-CD/);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before);
  await page.getByRole('tab',{name:'Nico'}).click();
  await page.locator('.mentor-toggle').click();
  assert.match(await page.locator('.mentor-response').innerText(),/caja mal ubicada|bodega|encontrar lo que tenemos/i);
  await page.getByRole('tab',{name:'Decisión'}).click();
  await page.locator('.game-choice').first().click();
  await page.getByRole('tab',{name:'Indicadores'}).click();
  assert.match(await card.innerText(),/85 %/);
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(saved.choices.inventory,'weak');
  assert.equal(saved.reveal,false);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.game-choice.chosen').count(),1);
  for(let i=0;i<3;i++)await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/280 pedidos/);
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene').innerText(),/se observaron 280/);
  await page.locator('#gameNext').click();
  const result=page.locator('.inventory-outcome');
  assert.equal(await result.count(),1);
  assert.match(await result.innerText(),/Físicamente en el CD/);
  assert.match(await result.innerText(),/Verificables para Picking/);
  assert.match(await result.innerText(),/RESERVA-CD/);
  await result.locator('summary').click();
  assert.match(await result.innerText(),/SKU A/);
  assert.match(await result.innerText(),/SKU B/);
  assert.match(await result.innerText(),/SKU C/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'original-v1-unchanged');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});

test('I2-23: lectura móvil sin scroll exterior ni pérdida del CTA',
 {timeout:90000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:760}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  for(let i=0;i<6;i++)await page.locator('#gameNext').click();
  await page.getByRole('tab',{name:'Indicadores'}).click();
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[740,360]]){
   await page.setViewportSize({width,height});
   const metrics=await page.evaluate(()=>{
    const d=document.documentElement,b=document.querySelector('#gameNext').getBoundingClientRect();
    return {w:d.scrollWidth,cw:d.clientWidth,h:d.scrollHeight,ch:d.clientHeight,
      buttonBottom:b.bottom,buttonHeight:b.height};
   });
   assert.ok(metrics.w<=metrics.cw+2&&metrics.h<=metrics.ch+2,'Sin scroll externo');
   assert.ok(metrics.buttonBottom<=height+2&&metrics.buttonHeight>=44,'CTA visible');
  }
 }finally{await browser.close()}
});
