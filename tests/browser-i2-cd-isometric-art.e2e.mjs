import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {I2_CD_ART,I2_CD_AREA_ORDER} from '../src/i2-cd-isometric-art.js';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

/** El navegador decodifica PNG reales, detecta 404 y audita al menos alpha declarado. */
test('I2-36: todas las imágenes reales del CD responden y decodifican',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage();
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  const dimensions=[];
  for(const [key,s] of Object.entries(I2_CD_ART)){
   const r=await page.request.get(BASE+'/juego/'+s.src.slice(2));
   assert.equal(r.status(),200,key+' no publicado');
   assert.match(r.headers()['content-type']||'',/image\/png/);
   const data=await r.body();
   assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
   dimensions.push({key,width:data.readUInt32BE(16),height:data.readUInt32BE(20),
    bytes:data.length,alphaChannel:[4,6].includes(data[25])});
  }
  console.log('I2-36 CD_ART_BROWSER_FILES '+JSON.stringify(dimensions));
  assert.equal(dimensions.length,10);
 }finally{await browser.close()}
});

/** Los visuales no deben revelar demanda, reescribir el guardado o tapar controles. */
test('I2-36: tutorial de Nico y ocho decisiones usan arte contextual en teléfono',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[],badAssets=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{
  if(r.url().includes('/cd-isometrico/')&&r.status()>=400)
   badAssets.push(r.url()+' '+r.status());
 });
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  const firstSave=await page.evaluate(k=>localStorage.getItem(k),KEY);
  await page.getByRole('button',{name:/Conocer el juego con Nico/}).click();
  const modal=page.locator('.nico-journey-dialog');
  assert.equal(await modal.locator('[data-cd-scene="overview"]').count(),1);
  await modal.locator('.nico-journey-next').click();
  assert.equal(await modal.locator('.cd-iso-route-list li').count(),8);
  await modal.locator('.nico-journey-next').click();
  assert.equal(await modal.locator('[data-cd-scene="planning"]').count(),1);
  await modal.locator('.nico-journey-skip').click();
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),firstSave);
  await page.locator('#gameNext').click();
  for(let i=0;i<I2_CD_AREA_ORDER.length;i++){
   const key=I2_CD_AREA_ORDER[i];
   const scene=page.locator('.cd-iso-compact');
   assert.equal(await scene.getAttribute('data-cd-scene'),key);
   assert.ok(await scene.locator('img').getAttribute('alt'));
   await scene.locator('img').evaluate(img=>img.decode());
   if(i===0){
    const expand=scene.getByRole('button',{name:/Ampliar ilustración/});
    await expand.click();
    assert.equal(await page.locator('.cd-iso-dialog[open]').count(),1);
    await page.getByRole('button',{name:'Cerrar imagen'}).click();
    assert.equal(await expand.evaluate(node=>document.activeElement===node),true);
   }
   const sizes=await page.evaluate(()=>({
    viewport:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth,
    footer:document.querySelector('#gameNext').getBoundingClientRect().bottom,
    height:document.documentElement.clientHeight
   }));
   assert.ok(sizes.scroll<=sizes.viewport+2,'overflow en '+key);
   assert.ok(sizes.footer<=sizes.height+2,'footer oculto en '+key);
   await page.locator('#gameNext').click();
  }
  assert.equal(await page.locator('.cd-iso-card').count(),0,
   'Pantalla sellada no sugiere incidente específico');
  await page.locator('#gameNext').click();
  assert.equal(await page.locator('[data-cd-scene="monitoring"]').count(),1,
   'Monitoreo solo después de revelar la demanda');
  assert.deepEqual(badAssets,[]);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});

/** Responsive básico adicional: 320 px, 430 px y horizontal. */
test('I2-36: escena general no desborda en anchos extremos u orientación horizontal',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage();
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:/Conocer el juego con Nico/}).click();
  for(const [width,height] of [[320,680],[430,860],[800,390]]){
   await page.setViewportSize({width,height});
   const info=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    content:document.documentElement.scrollWidth,
    modalBottom:document.querySelector('.nico-journey-dialog').getBoundingClientRect().bottom
   }));
   assert.ok(info.content<=info.width+2,'desbordamiento en '+width);
   assert.ok(info.modalBottom<=height+2,'diálogo inaccesible en '+width+'×'+height);
  }
 }finally{await browser.close()}
});
