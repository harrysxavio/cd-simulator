import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

test('I2-10: optional contextual dialog traps focus, Escape restores trigger and does not alter choices',
 {timeout:90000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  const previous=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
  assert.equal(await page.locator('.help-trigger').count(),2);
  const source=page.locator('.help-trigger').first();
  await source.click();
  const modal=page.locator('dialog.i2-help-dialog');
  assert.equal(await modal.isVisible(),true);
  assert.equal(await modal.getAttribute('aria-modal'),'true');
  assert.equal(await modal.getAttribute('aria-labelledby'),'i2-help-title');
  assert.match(await modal.innerText(),/Comercial/);
  assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('i2-help-close')),true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.querySelector('.i2-help-dialog')?.contains(document.activeElement)),true,
   'Focus must remain within modal');
  await page.keyboard.press('Escape');
  await modal.waitFor({state:'detached'});
  assert.equal(await source.evaluate(e=>e===document.activeElement),true,
   'Escape must return keyboard focus to help trigger');
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),previous,
   'Opening help must never recalculate or mutate decisions');
  // Visible UI is just ×; the accessible name still explains its action.
  await source.click();
  assert.equal(await page.locator('.i2-help-close').innerText(),'×');
  assert.match(await page.locator('.i2-help-close').getAttribute('aria-label'),/Cerrar explicación/);
  await modal.locator('.i2-help-content p').first().click();
  assert.equal(await modal.isVisible(),true,'Click inside dialog must not dismiss');
  await page.mouse.click(3,3);
  await modal.waitFor({state:'detached'});
  assert.equal(await source.evaluate(e=>e===document.activeElement),true,
   'Click outside must restore trigger focus');
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),previous);
  await source.click();
  await page.touchscreen.tap(3,3);
  await modal.waitFor({state:'detached'});
  assert.equal(await source.evaluate(e=>e===document.activeElement),true,
   'Touch outside must restore trigger focus');
  const second=page.locator('.help-trigger').nth(1);
  for(const [width,height] of [[320,568],[360,640],[430,932]]){
   await page.setViewportSize({width,height});
   await second.click();
   const data=await modal.evaluate(e=>{
    const d=e.getBoundingClientRect(),c=e.querySelector('.i2-help-close').getBoundingClientRect();
    return {top:d.top,left:d.left,right:d.right,bottom:d.bottom,
     closeTop:c.top,closeBottom:c.bottom,closeWidth:c.width,closeHeight:c.height,
     viewportWidth:document.documentElement.clientWidth,viewportHeight:innerHeight};
   });
   assert.ok(data.top>=0&&data.left>=0&&data.right<=data.viewportWidth+2);
   assert.ok(data.bottom<=data.viewportHeight+2);
   assert.ok(data.closeHeight>=44&&data.closeWidth>=44,'Close button must be touch accessible');
   await page.locator('.i2-help-close').click();
   await modal.waitFor({state:'detached'});
   assert.equal(await second.evaluate(e=>e===document.activeElement),true);
  }
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
