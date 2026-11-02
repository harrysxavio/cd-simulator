import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {I2_CD_AREA_ORDER,i2CdSceneFor} from '../src/i2-cd-isometric-art.js';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

/** El arte debe ser visible sin desplazar las decisiones fuera del teléfono. */
test('I2-36.8: las ocho imágenes son compactas y las explicaciones completas se amplían',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:320,height:568}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  for(const key of I2_CD_AREA_ORDER){
   assert.equal(await page.locator('.cd-iso-compact').count(),0);
   const explore=page.locator('.i2-area-explore');
   const target=await explore.boundingBox();
   assert.ok(target.height>=44,'Botón para estudiar el área: '+key);
   const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
   await explore.click();
   const modal=page.locator('.i2-cd-area-guide-dialog');
   assert.equal(await modal.isVisible(),true);
   assert.ok((await modal.innerText()).includes(i2CdSceneFor(key).meaning));
   assert.equal(await modal.locator('img').count(),1);
   assert.equal(await modal.locator('.i2-cd-area-guide-topic').count(),6);
   await modal.getByRole('button',{name:/Cerrar explicación/}).click();
   await modal.waitFor({state:'detached'});
   assert.equal(await explore.evaluate(el=>document.activeElement===el),true);
   assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before);
   assert.equal(await page.locator('.game-choice').count(),3);
   const geometry=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth,
    height:document.documentElement.clientHeight,
    scrollHeight:document.documentElement.scrollHeight
   }));
   assert.ok(geometry.scrollWidth<=geometry.width+2);
   assert.ok(geometry.scrollHeight<=geometry.height+2);
   await page.locator('#gameNext').click();
  }
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
