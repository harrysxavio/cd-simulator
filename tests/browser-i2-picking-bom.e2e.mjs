import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

test('I2-24: Picking BOM visible, antes no se revela demanda y después hay detalle por pedidos',
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
  const tutorial=page.locator('.nico-manager-tutorial').first();
  assert.equal(await tutorial.count(),1,'Se reutiliza tutorial ya integrado por PR114');
  await tutorial.locator('summary').first().click();
  assert.equal(await tutorial.locator('.nico-manager-chapter').count(),7);
  await tutorial.locator('.nico-skip-tutorial').click();
  for(let i=0;i<6;i++)await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Picking/);
  await page.getByRole('tab',{name:'Indicadores'}).click();
  const card=page.locator('.picking-capacity-teaching');
  assert.match(await card.innerText(),/2.300 SKU\/día/);
  await card.locator('summary').click();
  assert.match(await card.innerText(),/2× SKU A \+ 1× SKU B \+ 1× SKU C/);
  assert.match(await card.innerText(),/día 13/);
  assert.doesNotMatch(await card.innerText(),/280 pedidos|demanda real observada/);
  await page.getByRole('tab',{name:'Nico'}).click();
  assert.equal(await page.locator('.nico-manager-area').count(),1);
  await page.locator('.nico-manager-area > summary').click();
  assert.match(await page.locator('.nico-manager-area').innerText(),/pedidos completos|línea/);
  await page.getByRole('tab',{name:'Decisión'}).click();
  await page.locator('.game-choice').first().click();
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.game-choice.chosen').count(),1);
  await page.locator('#gameNext').click();
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/280 pedidos/);
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene').innerText(),/se observaron 280/);
  await page.locator('#gameNext').click();
  const panel=page.locator('.picking-outcome');
  assert.equal(await panel.count(),1);
  assert.match(await panel.innerText(),/plan original antes de tu recuperación/);
  assert.match(await panel.innerText(),/sin intervención/);
  await panel.locator('summary').click();
  assert.match(await panel.innerText(),/Pedido mixto/);
  assert.match(await panel.innerText(),/Pedido combinado/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'untouched-v1');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
test('I2-24: indicadores y CTA en Picking, scroll de documento exterior cero',
 {timeout:75000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:760}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  for(let i=0;i<6;i++)await page.locator('#gameNext').click();
  await page.getByRole('tab',{name:'Indicadores'}).click();
  for(const [w,h] of [[320,568],[360,640],[390,844],[430,932],[740,360]]){
   await page.setViewportSize({width:w,height:h});
   const x=await page.evaluate(()=>{
    const d=document.documentElement,b=document.querySelector('#gameNext').getBoundingClientRect();
    return {w:d.scrollWidth,cw:d.clientWidth,h:d.scrollHeight,ch:d.clientHeight,b:b.bottom,bh:b.height};
   });
   assert.ok(x.w<=x.cw+2&&x.h<=x.ch+2,'Sin scroll exterior');
   assert.ok(x.b<=h+2&&x.bh>=44,'CTA fijo');
  }
 }finally{await browser.close()}
});
