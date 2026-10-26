import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

test('I2-25: Transporte móvil, sin spoilers, expedición auditada y V1 intacta',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','original-v1'));
  await page.locator('#gameNext').click(); // Desde intro comienza Comercial.
  for(let i=0;i<7;i++)await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Transporte/);
  await page.getByRole('tab',{name:'Indicadores'}).click();
  const preview=page.locator('.transport-capacity-teaching');
  assert.equal(await preview.count(),1);
  assert.match(await preview.innerText(),/800 SKU\/día|800 SKU\/día|800/);
  assert.doesNotMatch(await preview.innerText(),/280 pedidos|demanda real observada/);
  await page.getByRole('tab',{name:'Decisión'}).click();
  await page.locator('#gameNext').click(); // Cierra plan.
  assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
  await page.locator('#gameNext').click(); // Revela sorpresa.
  await page.locator('#gameNext').click(); // Abre recuperación.
  await page.locator('#gameNext').click(); // Resultados.
  const panel=page.locator('.transport-outcome');
  assert.equal(await panel.count(),1);
  assert.match(await panel.innerText(),/plan original sin recuperación/);
  assert.match(await panel.innerText(),/Preparados sin salir/);
  await panel.locator('summary').click();
  assert.match(await panel.innerText(),/Día 12/);
  assert.match(await panel.innerText(),/no de la recuperación|no de la recuperación seleccionada/i);
  const size=await page.evaluate(()=>({
   scrollWidth:document.documentElement.scrollWidth,
   clientWidth:document.documentElement.clientWidth,
   outerHeight:document.documentElement.scrollHeight,
   clientHeight:document.documentElement.clientHeight
  }));
  assert.ok(size.scrollWidth<=size.clientWidth+2);
  assert.ok(size.outerHeight<=size.clientHeight+2);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'original-v1');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
