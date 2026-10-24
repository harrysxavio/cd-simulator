import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
test('I2-13: first-time briefing on phone, start in one action, safe exit and resume',
 {timeout:90000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameScene h1').filter({hasText:'Hoy tú diriges'}).waitFor();
  assert.equal(await page.locator('.intro-fact').count(),3);
  assert.deepEqual((await page.locator('.intro-fact strong').allInnerTexts()),['8','3','12']);
  assert.equal(await page.locator('.briefing-step').count(),3);
  assert.match(await page.locator('#gameScene').innerText(),/centro de distribución \(CD\)/i);
  assert.match(await page.locator('#gameScene').innerText(),/200 pedidos previstos/);
  assert.doesNotMatch(await page.locator('#gameScene').innerText(),/280 pedidos|40 %/);
  assert.equal(await page.locator('#gameNext').innerText(),'Comenzar misión →');
  assert.equal(await page.locator('.return-link').getAttribute('href'),'../');
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[740,360]]){
   await page.setViewportSize({width,height});
   const geom=await page.evaluate(()=>{
    const r=document.querySelector('#gameNext').getBoundingClientRect();
    return {height:innerHeight,width:document.documentElement.clientWidth,
     docHeight:document.documentElement.scrollHeight,
     docWidth:document.documentElement.scrollWidth,buttonBottom:r.bottom,buttonHeight:r.height};
   });
   assert.ok(geom.docHeight<=geom.height+2&&geom.docWidth<=geom.width+2,
    'No outer scrolling: '+width+'x'+height);
   assert.ok(geom.buttonBottom<=geom.height+2&&geom.buttonHeight>=44,
    'First step CTA must remain in viewport');
  }
  await page.setViewportSize({width:360,height:760});
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','preserve-legacy'));
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameStage').innerText(),/Área 1 de 8/);
  assert.equal(await page.locator('.game-choice').count(),3);
  await page.locator('#gameNext').click(); // commit Comercial
  assert.match(await page.locator('#gameStage').innerText(),/Área 2 de 8/);
  await page.locator('#gameBack').click(); // consult Comercial
  await page.locator('#gameBack').click(); // return briefing
  assert.equal(await page.locator('#gameNext').innerText(),'Continuar mi plan →');
  assert.match(await page.locator('.intro-resume').innerText(),/1 de 8 decisiones/);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#gameNext').innerText(),'Continuar mi plan →');
  assert.equal(await page.locator('.intro-fact').count(),3);
  await page.locator('.return-link').click();
  await page.waitForURL(url=>url.pathname.endsWith('/cd-simulator/')||url.pathname==='/');
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'preserve-legacy');
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#gameNext').innerText(),'Continuar mi plan →');
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameStage').innerText(),/Área 2 de 8/);
  const session=await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-i2-v1')));
  assert.deepEqual(session.confirmedAreas,['commercial']);
  assert.equal(session.reveal,false);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
