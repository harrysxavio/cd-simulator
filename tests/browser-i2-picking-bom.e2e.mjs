import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const STORAGE='supply-lab-i2-v1';
test('I2-24: ejemplo BOM 3 SKU/12 días, Nico gerente y cierre Picking auditado en móvil',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','v1-preserved'));
  for(let i=0;i<7;i++)await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Picking/);
  await page.getByRole('tab',{name:'Indicadores'}).click();
  const card=page.locator('.picking-bom-teaching');
  assert.match(await card.innerText(),/2\.300|2300|2,300/);
  const before=await page.evaluate(k=>localStorage.getItem(k),STORAGE);
  await card.locator('summary').click();
  assert.match(await card.innerText(),/12 días/);
  assert.match(await card.innerText(),/Pedido combinado/);
  assert.match(await card.innerText(),/SKU B/);
  assert.match(await card.innerText(),/Pedido mixto/);
  assert.doesNotMatch(await card.innerText(),/280 pedidos reales|demanda observada 280/);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),STORAGE),before);
  await page.getByRole('tab',{name:'Nico'}).click();
  const manager=page.locator('.picking-manager-details');
  assert.equal(await manager.count(),1);
  await manager.locator('summary').click();
  assert.match(await manager.innerText(),/gerente/);
  assert.match(await manager.innerText(),/TODOS los productos/);
  assert.match(await manager.innerText(),/cliente/);
  assert.match(await manager.innerText(),/productividad persona-hora/);
  await page.getByRole('tab',{name:'Decisión'}).click();
  await page.locator('.game-choice').last().click();
  const chosen=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),STORAGE);
  assert.equal(chosen.choices.picking,'reinforce');
  assert.equal(chosen.reveal,false);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.game-choice.chosen').count(),1);
  await page.locator('#gameNext').click(); // Transporte
  await page.locator('#gameNext').click(); // Pre reveal
  assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/280 pedidos/);
  await page.locator('#gameNext').click(); // reveal
  assert.match(await page.locator('#gameScene').innerText(),/se observaron 280/);
  await page.locator('#gameNext').click(); // outcome
  const outcome=page.locator('.picking-outcome');
  assert.equal(await outcome.count(),1);
  assert.match(await outcome.innerText(),/Pedidos preparados/);
  assert.match(await outcome.innerText(),/Expedidos del CD/);
  assert.match(await outcome.innerText(),/Sin preparar al cierre/);
  assert.match(await outcome.innerText(),/modelo acopla preparación y expedición/);
  await outcome.locator('summary').click();
  assert.match(await outcome.innerText(),/Pedido combinado/);
  assert.match(await outcome.innerText(),/Día 0|Día 2|Día 5/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'v1-preserved');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
test('I2-24: guía de Picking ampliada permanece dentro del scroll interno y CTA visible',
 {timeout:90000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:760}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  for(let i=0;i<7;i++)await page.locator('#gameNext').click();
  await page.getByRole('tab',{name:'Nico'}).click();
  await page.locator('.picking-manager-details summary').click();
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[740,360]]){
   await page.setViewportSize({width,height});
   const metrics=await page.evaluate(()=>{
    const d=document.documentElement,b=document.querySelector('#gameNext').getBoundingClientRect();
    return {w:d.scrollWidth,cw:d.clientWidth,h:d.scrollHeight,ch:d.clientHeight,
     bottom:b.bottom,buttonHeight:b.height};
   });
   assert.ok(metrics.w<=metrics.cw+2&&metrics.h<=metrics.ch+2,'Sin scroll de página');
   assert.ok(metrics.bottom<=height+2&&metrics.buttonHeight>=44,'CTA visible');
  }
 }finally{await browser.close()}
});
