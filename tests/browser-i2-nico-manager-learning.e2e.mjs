import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

test('Tutorial de Nico puede saltarse o abrirse, y ocho áreas tienen guía profunda opcional',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','protected'));
  const before=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
  const tutorial=page.locator('.nico-manager-tutorial').first();
  assert.equal(await tutorial.count(),1);
  assert.equal(await tutorial.getAttribute('open'),null);
  await tutorial.locator('summary').first().click();
  assert.equal(await tutorial.locator('.nico-manager-chapter').count(),7);
  await tutorial.locator('.nico-manager-chapter').nth(3).locator('summary').click();
  assert.match(await tutorial.innerText(),/pedido combinado necesita 1 A y 1 B/i);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),before);
  await tutorial.locator('.nico-skip-tutorial').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/Comercial/);
  await page.getByRole('tab',{name:'Nico'}).click();
  const guide=page.locator('.nico-manager-area');
  assert.equal(await guide.count(),1);
  assert.equal(await guide.getAttribute('open'),null);
  await guide.locator('summary').click();
  assert.equal(await guide.locator('.nico-manager-topic').count(),7);
  assert.match(await guide.innerText(),/pronóstico|Comercial/i);
  assert.match(await guide.innerText(),/¿Qué podría salir bien o mal\?/);
  const stepBefore=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('supply-lab-i2-v1'))));
  await page.locator('.nico-manager-tutorial summary').first().click();
  assert.equal(await page.locator('.nico-manager-chapter').count(),7);
  assert.equal(await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('supply-lab-i2-v1')))),stepBefore);
  for(let i=0;i<8;i++){
   await page.getByRole('tab',{name:'Nico'}).click();
   const areaGuide=page.locator('.nico-manager-area');
   assert.equal(await areaGuide.count(),1);
   await areaGuide.locator('summary').click();
   assert.equal(await areaGuide.locator('.nico-manager-topic').count(),7);
   assert.doesNotMatch(await areaGuide.innerText(),/demanda real 280|se observaron 280/);
   if(i<7)await page.locator('#gameNext').click();
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'protected');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
test('Nico: panel pedagógico no produce scroll exterior ni tapa el CTA',
 {timeout:70000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:760}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('.nico-manager-tutorial summary').first().click();
  await page.locator('.nico-manager-chapter summary').first().click();
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[740,360]]){
   await page.setViewportSize({width,height});
   const rect=await page.evaluate(()=>{
    const d=document.documentElement,b=document.querySelector('#gameNext').getBoundingClientRect();
    return {w:d.scrollWidth,cw:d.clientWidth,h:d.scrollHeight,ch:d.clientHeight,
      bottom:b.bottom,height:b.height};
   });
   assert.ok(rect.w<=rect.cw+2&&rect.h<=rect.ch+2,'No scroll exterior');
   assert.ok(rect.bottom<=height+2&&rect.height>=44,'CTA visible');
  }
 }finally{await browser.close()}
});
