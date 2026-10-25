import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

test('I2-20: proveedor confiable, POs originales, recepción y demanda sellada en móvil',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)
  errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','untouched'));
  for(let i=0;i<3;i++)await page.locator('#gameNext').click(); // Purchasing
  assert.match(await page.locator('#gameScene h1').innerText(),/Compras/);
  await page.getByRole('tab',{name:'Indicadores'}).click();
  assert.match(await page.locator('.supplier-purchasing-teaching').innerText(),/75 %/);
  const before=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
  await page.locator('.supplier-sku-detail summary').click();
  assert.equal(await page.locator('.supplier-sku-row').count(),3);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),before);
  await page.getByRole('tab',{name:'Decisión'}).click();
  await page.locator('.game-choice').nth(1).click(); // 95 % supplier
  await page.getByRole('tab',{name:'Indicadores'}).click();
  const expected=await page.evaluate(async()=>{
   const state=JSON.parse(localStorage.getItem('supply-lab-i2-v1'));
   const {i2SupplierCommitmentPreview}=await import('/src/i2-supplier-purchasing.js');
   return i2SupplierCommitmentPreview(state);
  });
  assert.equal(expected.supplierFillPercent,95);
  assert.equal(expected.originalCommittedSkuUnits,
   expected.modeledSupplierFulfilledSkuUnits+expected.modeledSupplierShortfallSkuUnits);
  assert.match(await page.locator('.supplier-purchasing-teaching').innerText(),/95 %/);
  assert.doesNotMatch(await page.locator('.supplier-purchasing-teaching').innerText(),
   /280 pedidos|demanda real observada/);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.game-choice.chosen').count(),1);
  for(let i=0;i<6;i++)await page.locator('#gameNext').click(); // reveal gate
  assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/280 pedidos/);
  await page.locator('#gameNext').click(); // reveal explicitly
  assert.match(await page.locator('#gameScene').innerText(),/se observaron 280/);
  await page.locator('#gameNext').click(); // keep wait, final
  const result=page.locator('.supplier-purchasing-outcome');
  assert.equal(await result.count(),1);
  assert.match(await result.innerText(),/Comprometidas/);
  assert.match(await result.innerText(),/Llegaron al CD/);
  assert.match(await result.innerText(),/Recibidas en bodega/);
  const numbers=await result.locator('.supplier-metric strong').allInnerTexts();
  assert.equal(numbers[0],new Intl.NumberFormat('es-CL').format(expected.originalCommittedSkuUnits));
  assert.equal(numbers[1],new Intl.NumberFormat('es-CL').format(expected.modeledSupplierFulfilledSkuUnits));
  await result.locator('.supplier-sku-detail summary').click();
  assert.match(await result.locator('.supplier-sku-detail').innerText(),/SKU A/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'untouched');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
test('I2-20: tarjeta proveedor y CTA permanecen dentro del viewport', {timeout:65000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:760}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  for(let i=0;i<3;i++)await page.locator('#gameNext').click();
  await page.getByRole('tab',{name:'Indicadores'}).click();
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[740,360]]){
   await page.setViewportSize({width,height});
   const g=await page.evaluate(()=>{
    const d=document.documentElement,b=document.querySelector('#gameNext').getBoundingClientRect();
    return {width:d.scrollWidth,clientWidth:d.clientWidth,height:d.scrollHeight,
     clientHeight:d.clientHeight,buttonBottom:b.bottom,buttonHeight:b.height};
   });
   assert.ok(g.width<=g.clientWidth+2&&g.height<=g.clientHeight+2);
   assert.ok(g.buttonBottom<=height+2&&g.buttonHeight>=44);
  }
 }finally{await browser.close()}
});
