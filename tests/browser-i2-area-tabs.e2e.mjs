import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

test('I2-17: tres pestañas, KPI previos, teclado, swipe optativo, Nico y avance fijo en ocho áreas',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','legacy-preserved'));
  await page.locator('#gameNext').click();
  const tabs=page.getByRole('tab');
  const selected=()=>page.getByRole('tab',{selected:true});
  assert.equal(await tabs.count(),3);
  assert.equal(await selected().innerText(),'Decisión');
  assert.equal(await page.getByRole('tablist').count(),1);
  assert.equal(await page.getByRole('tabpanel',{name:'Indicadores'}).isVisible(),false);
  let touched=false;
  for(let index=0;index<8;index++){
   assert.equal(await tabs.count(),3);
   assert.equal(await selected().innerText(),'Decisión');
   const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
   await page.getByRole('tab',{name:'Indicadores'}).click();
   const ind=page.getByRole('tabpanel',{name:'Indicadores'});
   assert.equal(await ind.isVisible(),true);
   assert.equal(await ind.locator('.area-assumption-metric').count(),2);
   assert.match(await ind.innerText(),/Fuente: NODES y DEFAULTS de V1/);
   assert.match(await ind.innerText(),/no.*resultado|no KPI observados|no predice/i);
   assert.doesNotMatch(await page.locator('#gameScene').innerText(),/280 pedidos|300 pedidos|aumentó un 40 %/i);
   assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before,
    'Cambiar pestaña no modifica estado');
   // Teclado: flechas, Inicio y Fin permiten navegar sin gesto.
   await page.getByRole('tab',{name:'Indicadores'}).focus();
   await page.keyboard.press('ArrowRight');
   assert.equal(await selected().innerText(),'Nico');
   await page.keyboard.press('Home');
   assert.equal(await selected().innerText(),'Decisión');
   await page.keyboard.press('End');
   assert.equal(await selected().innerText(),'Nico');
   // Nico no se activa automáticamente. Tiene control explícito para mostrarlo.
   assert.equal(await page.locator('#gameGuideText').isVisible(),false);
   if(index===0){
    await page.locator('.mentor-toggle').click();
    assert.equal(await page.locator('#gameGuideText').isVisible(),true);
    await page.locator('.mentor-toggle').click();
    assert.equal(await page.locator('#gameGuideText').isVisible(),false);
   }
   await page.getByRole('tab',{name:'Decisión'}).click();
   assert.equal(await page.locator('.game-choice').count(),3);
   if(index===3){
    await page.locator('.game-choice').first().click();
    await page.getByRole('tab',{name:'Indicadores'}).click();
    assert.match(await page.locator('.area-assumption-metric').first().innerText(),/350/);
    assert.match(await page.locator('.area-reference-row').innerText(),/650/);
    await page.getByRole('tab',{name:'Decisión'}).click();
   }
   // Swipe is an optional shortcut, not the sole way to navigate.
   if(index===0){
    const gesture=await page.evaluate(()=>{
     const shell=document.querySelector('.area-tabs-shell');
     const touch1=new Touch({identifier:8,target:shell,clientX:240,clientY:220});
     const touch2=new Touch({identifier:8,target:shell,clientX:140,clientY:225});
     shell.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,
      touches:[touch1],targetTouches:[touch1],changedTouches:[touch1]}));
     shell.dispatchEvent(new TouchEvent('touchend',{bubbles:true,
      touches:[],targetTouches:[],changedTouches:[touch2]}));
     return document.querySelector('.area-tab[aria-selected="true"]')?.textContent;
    });
    assert.equal(gesture,'Indicadores');
    await page.getByRole('tab',{name:'Decisión'}).click();
    touched=true;
   }
   assert.equal(await page.locator('.game-choice.chosen').count(),1);
   await page.locator('#gameNext').click();
  }
  assert.equal(touched,true);
  assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
  const committed=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(committed.confirmedAreas.length,8);
  assert.equal(committed.reveal,false);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'legacy-preserved');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});

test('I2-17: botón siempre visible, sin scroll exterior en móvil y modo horizontal',
 {timeout:65000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:760}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  for(const [w,h] of [[320,568],[360,640],[390,844],[430,932],[740,360]]){
   await page.setViewportSize({width:w,height:h});
   for(const tab of ['Decisión','Indicadores','Nico']){
    await page.getByRole('tab',{name:tab}).click();
    const metrics=await page.evaluate(()=>{
     const c=document.documentElement,r=document.querySelector('#gameNext').getBoundingClientRect();
     return {scrollWidth:c.scrollWidth,clientWidth:c.clientWidth,
      scrollHeight:c.scrollHeight,clientHeight:c.clientHeight,footerBottom:r.bottom,
      footerHeight:r.height,windowHeight:innerHeight};
    });
    assert.ok(metrics.scrollWidth<=metrics.clientWidth+2,'No ancho exterior '+w);
    assert.ok(metrics.scrollHeight<=metrics.clientHeight+2,'No alto exterior '+w);
    assert.ok(metrics.footerBottom<=metrics.windowHeight+2&&metrics.footerHeight>=44);
   }
  }
 }finally{await browser.close()}
});
