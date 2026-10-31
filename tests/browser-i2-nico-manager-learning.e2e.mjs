import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

/** The tutorial is a separate, reversible lesson; it never advances the game. */
test('Nico teaches in seven separate dialog steps with a large portrait and returns to play',
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
  const launcher=page.locator('.nico-manager-tutorial').first();
  assert.equal(await launcher.count(),1);
  assert.equal(await page.locator('.nico-journey-dialog').count(),0);
  await launcher.click();
  const dialog=page.locator('.nico-journey-dialog');
  assert.equal(await dialog.getAttribute('open'),'');
  assert.equal(await dialog.locator('.nico-journey-portrait').count(),1);
  assert.match(await dialog.locator('.nico-journey-progress').innerText(),/1 DE 7/);
  for(let i=1;i<7;i++)await dialog.locator('.nico-journey-next').click();
  assert.match(await dialog.locator('.nico-journey-progress').innerText(),/7 DE 7/);
  assert.match(await dialog.innerText(),/Aprende de la partida/i);
  await dialog.locator('.nico-journey-back').click();
  assert.match(await dialog.locator('.nico-journey-progress').innerText(),/6 DE 7/);
  await dialog.locator('.nico-journey-skip').click();
  await dialog.waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),before);
  await page.locator('#gameNext').click();
  await page.getByRole('tab',{name:'Nico'}).click();
  const guide=page.locator('.nico-manager-area');
  await guide.locator('summary').click();
  assert.equal(await guide.locator('.nico-manager-topic').count(),8);
  assert.equal(await guide.locator('.nico-manager-option').count(),3);
  await page.locator('.nico-manager-tutorial').first().click();
  assert.equal(await page.locator('.nico-journey-dialog').count(),1);
  await page.keyboard.press('Escape');
  await page.locator('.nico-journey-dialog').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'protected');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});

/** A real modal may scroll INSIDE itself on short screens; main CTA stays where it was. */
test('Nico tutorial remains usable on short 320–430 px mobile screens',
 {timeout:70000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:760}});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('.nico-manager-tutorial').first().click();
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[740,360]]){
   await page.setViewportSize({width,height});
   const a=await page.evaluate(()=>{
    const d=document.querySelector('.nico-journey-dialog');
    return {dw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,
     dialogWidth:d.getBoundingClientRect().width,
     dialogHeight:d.getBoundingClientRect().height,
     dialogMax:innerHeight,buttons:d.querySelectorAll('button').length};
   });
   assert.ok(a.dw<=a.cw+2,'no horizontal overflow');
   assert.ok(a.dialogWidth<=width,'dialog within viewport');
   assert.ok(a.dialogHeight<=height,'dialog within viewport height');
   assert.ok(a.buttons>=4);
  }
  await page.locator('.nico-journey-close').click();
  await page.locator('.nico-journey-dialog').waitFor({state:'detached'});
 }finally{await browser.close()}
});
