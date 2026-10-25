import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

test('I2-16: Nico se presenta sin activar consejos y niveles no mutan campaña ni V1',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameScene h1').filter({hasText:'Hoy tú diriges'}).waitFor();
  const card=page.locator('.nico-welcome');
  assert.match(await card.innerText(),/¡Hola! Soy Nico, tu compañero de misión/i);
  assert.equal(await page.locator('.mentor-toggle').getAttribute('aria-expanded'),'false',
   'Mostrar el personaje no activa consejos automáticamente');
  const art=page.locator('.nico-avatar img');
  const expectedSrc=await page.evaluate(async()=>{
   const media=await import('/src/i2-nico-art.js');
   return media.i2NicoPortraitAsset().src;
  });
  assert.equal(await art.getAttribute('src'),expectedSrc);
  assert.equal(await art.getAttribute('alt'),'');
  await art.evaluate(img=>img.decode());
  assert.equal(await art.evaluate(img=>img.complete&&img.naturalWidth>0),true);
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','keep-v1'));
  const before=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
  await page.locator('.nico-lesson summary').click();
  assert.equal(await page.locator('#nicoLevel').inputValue(),'novato');
  assert.equal(await page.locator('#nicoTutorialSteps p').count(),3);
  await page.locator('#nicoLevel').selectOption('intermedio');
  assert.match(await page.locator('#nicoTutorialSteps').innerText(),/pronóstico|Revisa/);
  await page.locator('#nicoLevel').selectOption('avanzado');
  assert.match(await page.locator('#nicoTutorialSteps').innerText(),/baseline/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),before);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'keep-v1');
  await page.locator('.mentor-toggle').click();
  assert.equal(await page.locator('.mentor-toggle').getAttribute('aria-expanded'),'true');
  assert.match(await page.locator('.mentor-response').innerText(),/Por ejemplo:/);
  assert.equal(await page.locator('.mentor-question').count(),1);
  assert.match(await page.locator('.mentor-question').innerText(),/\\?/);
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameGuideText').innerText(),/demanda prevista|demanda observada/);
  assert.doesNotMatch(await page.locator('#gameGuideText').innerText(),/300 pedidos|50 %/);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.mentor-toggle').getAttribute('aria-expanded'),'true');
  await page.locator('#gameBack').click();
  await page.locator('.nico-lesson summary').click();
  assert.equal(await page.locator('#nicoLevel').inputValue(),'avanzado');
  assert.equal(await page.locator('#gameNext').innerText(),'Comenzar misión →');
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[740,360]]){
   await page.setViewportSize({width,height});
   const geometry=await page.evaluate(()=>({
    dw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,
    dh:document.documentElement.scrollHeight,h:innerHeight,
    bottom:document.querySelector('#gameNext').getBoundingClientRect().bottom
   }));
   assert.ok(geometry.dw<=geometry.cw+2&&geometry.dh<=geometry.h+2&&geometry.bottom<=geometry.h+2,
    'Portada sin scroll exterior y CTA fijo');
  }
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
