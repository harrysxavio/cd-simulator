import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

test('I2-19: Comercial confirmado -> cobertura 70%, compras SKU previas y plan congelado tras revelar',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','v1-safe'));
  await page.locator('#gameNext').click(); // Commercial
  await page.locator('#gameNext').click(); // Planning, commercial confirmed
  assert.match(await page.locator('#gameScene h1').innerText(),/Planning/);
  await page.getByRole('tab',{name:'Indicadores'}).click();
  const initial=await page.locator('.planning-coverage-teaching').innerText();
  assert.match(initial,/Cobertura 100 %/);
  assert.match(initial,/Pronóstico confirmado por Comercial: 200/);
  assert.match(initial,/Compra original proyectada/);
  assert.doesNotMatch(initial,/280 pedidos|demanda real observada/);
  const prior=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
  await page.locator('.planning-sku-detail summary').click();
  assert.equal(await page.locator('.planning-sku-row').count(),3);
  assert.match(await page.locator('.planning-sku-row').first().innerText(),/SKU A.*unidades/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),prior,
   'Leer compras antes del evento no altera el plan');
  await page.getByRole('tab',{name:'Decisión'}).click();
  await page.locator('.game-choice').first().click();
  await page.getByRole('tab',{name:'Indicadores'}).click();
  const partial=await page.locator('.planning-coverage-teaching').innerText();
  assert.match(partial,/Cobertura 70 %/);
  assert.match(partial,/Menor cobertura reduce el compromiso/);
  assert.doesNotMatch(partial,/280 pedidos|demanda real observada/);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-i2-v1')));
  assert.equal(saved.choices.planning,'partial');
  assert.equal(saved.reveal,false);
  const committed=await page.evaluate(async()=>{
   const s=JSON.parse(localStorage.getItem('supply-lab-i2-v1'));
   const {i2PlanningCoveragePreview}=await import('/src/i2-planning-coverage.js');
   return i2PlanningCoveragePreview(s);
  });
  assert.equal(committed.coveragePercent,70);
  assert.equal(committed.rows.length,3);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.game-choice.chosen').count(),1);
  await page.locator('#gameNext').click(); // Purchasing
  for(let i=2;i<8;i++)await page.locator('#gameNext').click(); // Reveal gate
  assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/280 pedidos/);
  await page.locator('#gameNext').click(); // Reveal -> recover
  assert.match(await page.locator('#gameScene').innerText(),/se observaron 280/);
  await page.locator('#gameNext').click(); // wait -> final results
  const final=page.locator('.planning-outcome');
  assert.equal(await final.count(),1);
  assert.match(await final.innerText(),/cobertura 70 %/);
  assert.match(await final.innerText(),/Valor de compromiso/);
  const numbers=await final.locator('.planning-coverage-number strong').allInnerTexts();
  assert.equal(numbers[0],new Intl.NumberFormat('es-CL').format(committed.totalCommittedSkuUnits));
  assert.ok(numbers[1].includes(new Intl.NumberFormat('es-CL').format(committed.totalCommittedValueCLP)));
  await final.locator('.planning-sku-detail summary').click();
  assert.match(await final.locator('.planning-sku-detail').innerText(),/SKU A:.*llegada prevista día/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'v1-safe');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});

test('I2-19: lectura compacta con CTA siempre visible en 320–740px', {timeout:60000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:760}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  await page.locator('#gameNext').click();
  await page.getByRole('tab',{name:'Indicadores'}).click();
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[740,360]]){
   await page.setViewportSize({width,height});
   const geo=await page.evaluate(()=>{
    const el=document.documentElement,btn=document.querySelector('#gameNext').getBoundingClientRect();
    return {w:el.scrollWidth,cw:el.clientWidth,h:el.scrollHeight,ch:el.clientHeight,b:btn.bottom,bh:btn.height};
   });
   assert.ok(geo.w<=geo.cw+2&&geo.h<=geo.ch+2,'No exterior scroll '+width);
   assert.ok(geo.b<=height+2&&geo.bh>=44,'CTA permanece fijo '+width);
  }
 }finally{await browser.close()}
});
