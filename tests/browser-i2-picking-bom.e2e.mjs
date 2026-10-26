import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

test('I2-24: Nico tutorial 7 capítulos saltable, 8 áreas y BOM Picking sin spoilers',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','untouched-v1'));
  const original=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
  const tutorial=page.locator('#managerTutorial');
  assert.equal(await tutorial.count(),1);
  assert.equal(await tutorial.getAttribute('open'),null);
  await tutorial.locator('summary').click();
  assert.equal(await tutorial.locator('.manager-tutorial-chapter').count(),7);
  assert.match(await tutorial.innerText(),/Tres SKU y doce días/);
  assert.match(await tutorial.innerText(),/una compra que llega el día 13/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),original);
  await tutorial.locator('.tutorial-skip').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Comercial/);
  await page.getByRole('tab',{name:'Nico'}).click();
  const areaGuide=page.locator('.manager-area-guide');
  await areaGuide.locator('summary').click();
  assert.match(await areaGuide.innerText(),/Lo que tú puedes controlar/);
  assert.match(await areaGuide.innerText(),/En qué indicadores fijarte/);
  assert.match(await areaGuide.innerText(),/riesgo y el costo/);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-i2-v1')).reveal),false);
  await page.getByRole('tab',{name:'Decisión'}).click();
  for(let i=0;i<6;i++)await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Picking/);
  await page.getByRole('tab',{name:'Indicadores'}).click();
  const card=page.locator('.picking-capacity-teaching');
  assert.match(await card.innerText(),/2.300 SKU\/día/);
  await card.locator('summary').click();
  assert.match(await card.innerText(),/2× SKU A \+ 1× SKU B \+ 1× SKU C/);
  assert.match(await card.innerText(),/día 13/);
  assert.doesNotMatch(await card.innerText(),/280 pedidos|demanda real observada/);
  await page.getByRole('tab',{name:'Decisión'}).click();
  await page.locator('.game-choice').first().click();
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.game-choice.chosen').count(),1);
  await page.locator('#gameNext').click(); // Transporte
  await page.locator('#gameNext').click(); // Sorpresa sin revelar
  assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/280 pedidos/);
  await page.locator('#gameNext').click(); // revelar
  assert.match(await page.locator('#gameScene').innerText(),/se observaron 280/);
  const retained=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
  await page.locator('#managerTutorial summary').click();
  assert.equal(await page.locator('.manager-tutorial-chapter').count(),7);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),retained);
  await page.locator('#gameNext').click(); // resultado
  const final=page.locator('.picking-outcome');
  assert.equal(await final.count(),1);
  assert.match(await final.innerText(),/Preparados completos/);
  assert.match(await final.innerText(),/Preparados aún sin salir/);
  await final.locator('summary').click();
  assert.match(await final.innerText(),/Pedido mixto/);
  assert.match(await final.innerText(),/Pedido combinado/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'untouched-v1');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
test('I2-24: apertura/tutorial y Picking sin scroll exterior ni CTA tapado',
 {timeout:75000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:760}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#managerTutorial summary').click();
  for(const [w,h] of [[320,568],[360,640],[390,844],[430,932],[740,360]]){
   await page.setViewportSize({width:w,height:h});
   const b=await page.evaluate(()=>{
    const d=document.documentElement,r=document.querySelector('#gameNext').getBoundingClientRect();
    return {scrollWidth:d.scrollWidth,width:d.clientWidth,scrollHeight:d.scrollHeight,
      height:d.clientHeight,bottom:r.bottom,hit:r.height};
   });
   assert.ok(b.scrollWidth<=b.width+2&&b.scrollHeight<=b.height+2,'Sin scroll externo');
   assert.ok(b.bottom<=h+2&&b.hit>=44,'CTA fijo visible');
  }
  await page.locator('.tutorial-skip').click();
  for(let i=0;i<6;i++)await page.locator('#gameNext').click();
  await page.getByRole('tab',{name:'Nico'}).click();
  await page.locator('.manager-area-guide summary').click();
  const d=await page.evaluate(()=>{
   const a=document.documentElement;return {w:a.scrollWidth,cw:a.clientWidth,h:a.scrollHeight,ch:a.clientHeight};
  });
  assert.ok(d.w<=d.cw+2&&d.h<=d.ch+2);
 }finally{await browser.close()}
});
