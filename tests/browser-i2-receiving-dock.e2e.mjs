import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

test('I2-21: capacidad de Recepción, FIFO opcional, revelación y muelle físico', {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)
  errors.push(r.status()+' '+r.url())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','v1-kept'));
  for(let i=0;i<4;i++)await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Recepción/);
  await page.getByRole('tab',{name:'Indicadores'}).click();
  const card=page.locator('.receiving-capacity-teaching');
  assert.match(await card.innerText(),/Capacidad seleccionada/);
  assert.match(await card.innerText(),/FIFO/);
  const before=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
  await card.locator('summary').click();
  assert.match(await card.innerText(),/No pasan a inventario/);
  assert.match(await card.innerText(),/100 unidades/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),before);
  assert.doesNotMatch(await card.innerText(),/280 pedidos|demanda real/);
  await page.getByRole('tab',{name:'Nico'}).click();
  await page.locator('.mentor-toggle').click();
  assert.match(await page.locator('.mentor-response').innerText(),/llegaron|descargar/);
  await page.getByRole('tab',{name:'Decisión'}).click();
  await page.locator('.game-choice').first().click();
  await page.getByRole('tab',{name:'Indicadores'}).click();
  assert.match(await card.innerText(),/cambio frente al turno normal/i);
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-i2-v1')));
  assert.equal(saved.choices.receiving,'low');
  assert.equal(saved.reveal,false);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.game-choice.chosen').count(),1);
  for(let i=4;i<8;i++)await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/280 pedidos/);
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene').innerText(),/se observaron 280/);
  await page.locator('#gameNext').click();
  const final=page.locator('.receiving-outcome');
  assert.equal(await final.count(),1);
  assert.match(await final.innerText(),/Llegaron al muelle/);
  assert.match(await final.innerText(),/Recibidas físicamente/);
  assert.match(await final.innerText(),/Pendientes al cierre/);
  await final.locator('summary').click();
  assert.match(await final.innerText(),/Día 2|Día 5|Día 10/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'v1-kept');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});

test('I2-21: tarjeta compacta, detalle desplegable y CTA siempre visible', {timeout:90000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:760}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  for(let i=0;i<4;i++)await page.locator('#gameNext').click();
  await page.getByRole('tab',{name:'Indicadores'}).click();
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[740,360]]){
   await page.setViewportSize({width,height});
   const x=await page.evaluate(()=>{
    const d=document.documentElement,b=document.querySelector('#gameNext').getBoundingClientRect();
    return {w:d.scrollWidth,cw:d.clientWidth,h:d.scrollHeight,ch:d.clientHeight,
     buttonBottom:b.bottom,buttonHeight:b.height};
   });
   assert.ok(x.w<=x.cw+2&&x.h<=x.ch+2);
   assert.ok(x.buttonBottom<=height+2&&x.buttonHeight>=44);
  }
 }finally{await browser.close()}
});
