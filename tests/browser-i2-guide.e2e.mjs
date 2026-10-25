import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

test('I2-12: Nico is opt-in, persists per browser and never changes the campaign or V1',
 {timeout:90000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:640}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameScene h1').filter({hasText:'Hoy tú diriges'}).waitFor();
  const campaignKey='supply-lab-i2-v1',guideKey='supply-lab-i2-guide-v1',legacyKey='supply-lab-v90';
  const before=await page.evaluate(([g,l])=>[localStorage.getItem(g),localStorage.getItem(l)],[campaignKey,legacyKey]);
  const toggle=page.locator('.mentor-toggle');
  assert.equal(await toggle.innerText(),'Ver consejo de Nico');
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#gameGuideText').isVisible(),false);
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  assert.match(await page.locator('#gameGuideText').innerText(),/Nico/);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),guideKey),'shown');
  assert.deepEqual(await page.evaluate(([g,l])=>[localStorage.getItem(g),localStorage.getItem(l)],[campaignKey,legacyKey]),before);
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameGuideText').innerText(),/pronostica|Pronostica/);
  assert.doesNotMatch(await page.locator('#gameGuideText').innerText(),/280 pedidos|40 %/);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.mentor-toggle').getAttribute('aria-expanded'),'true');
  assert.match(await page.locator('#gameGuideText').innerText(),/Pronostica/);
  await page.getByRole('tab',{name:'Nico'}).click();
  await page.locator('.mentor-toggle').click();
  assert.equal(await page.locator('#gameGuideText').isVisible(),false);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),guideKey),'hidden');
  const choice=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),campaignKey);
  assert.equal(choice.phase,'area');
  assert.equal(choice.index,0);
  assert.deepEqual(errors,[]);
  for(const width of [320,360,390,430]){
   await page.setViewportSize({width,height:568});
   const g=await page.evaluate(()=>{
    const a=document.querySelector('#gameNext').getBoundingClientRect();
    return {docWidth:document.documentElement.scrollWidth,width:document.documentElement.clientWidth,
     docHeight:document.documentElement.scrollHeight,height:innerHeight,buttonBottom:a.bottom};
   });
   assert.ok(g.docWidth<=g.width+2&&g.docHeight<=g.height+2);
   assert.ok(g.buttonBottom<=g.height+2);
  }
 }finally{await context.close();await browser.close()}
});
