import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

test('I2-18: forecast cambia en Comercial sin mostrar demanda real y se compara al cierre SKU',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({
  headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined
 });
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','v1-preserved'));
  await page.locator('#gameNext').click();
  const indicators=page.getByRole('tab',{name:'Indicadores'});
  await indicators.click();
  assert.equal(await page.locator('.commercial-forecast-teaching').count(),1);
  assert.match(await page.locator('.commercial-forecast-teaching').innerText(),/200 pedidos de muestra/);
  assert.equal(await page.locator('.commercial-flow summary').isVisible(),true);
  await page.locator('.commercial-flow summary').click();
  assert.match(await page.locator('.commercial-flow').innerText(),/Planificación aplica cobertura/);
  assert.match(await page.locator('.commercial-flow').innerText(),/A 2 días.*B 5 días.*C 10 días/);
  await page.getByRole('tab',{name:'Decisión'}).click();
  await page.locator('.game-choice').first().click();
  await indicators.click();
  const teaching=await page.locator('.commercial-forecast-teaching').innerText();
  assert.match(teaching,/160 pedidos de muestra/);
  assert.match(teaching,/-40 pedidos/);
  assert.doesNotMatch(teaching,/280 pedidos|aumentó un 40 %|demanda observada 280/i);
  let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-i2-v1')));
  assert.equal(state.reveal,false);
  assert.equal(state.choices.commercial,'under');
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('.commercial-brief').innerText(),/hipótesis de compra/i);
  assert.equal(await page.locator('.game-choice.chosen').count(),1);
  for(let i=0;i<8;i++)await page.locator('#gameNext').click();
  state=await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-i2-v1')));
  assert.equal(state.confirmedAreas.length,8);
  assert.equal(state.reveal,false);
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/280 pedidos/);
  await page.locator('#gameNext').click(); // revelación
  assert.match(await page.locator('#gameScene').innerText(),/280/);
  await page.locator('#gameNext').click(); // recuperación wait
  const result=page.locator('.commercial-result');
  assert.equal(await result.count(),1);
  assert.match(await result.innerText(),/Pronóstico: 160 pedidos/);
  assert.match(await result.innerText(),/Observados: 280 pedidos/);
  assert.match(await result.innerText(),/\+120 pedidos/);
  assert.match(await result.innerText(),/Compras originales comprometidas: .* unidades SKU/);
  await page.locator('.commercial-commitment-details summary').click();
  assert.match(await page.locator('.commercial-commitment-details').innerText(),/SKU A: .*llegada prevista día/);
  assert.match(await page.locator('.commercial-commitment-details').innerText(),/SKU C:/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'v1-preserved');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});

test('I2-18: tarjeta Comercial compacta, CTA fijo y cero scroll exterior',
 {timeout:90000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:760}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  await page.getByRole('tab',{name:'Indicadores'}).click();
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[740,360]]){
   await page.setViewportSize({width,height});
   const bounds=await page.evaluate(()=>{
    const html=document.documentElement,button=document.querySelector('#gameNext').getBoundingClientRect();
    return {pageW:html.scrollWidth,viewportW:html.clientWidth,
     pageH:html.scrollHeight,viewportH:html.clientHeight,
     buttonBottom:button.bottom,buttonHeight:button.height};
   });
   assert.ok(bounds.pageW<=bounds.viewportW+2&&bounds.pageH<=bounds.viewportH+2);
   assert.ok(bounds.buttonBottom<=height+2&&bounds.buttonHeight>=44);
  }
 }finally{await browser.close()}
});
