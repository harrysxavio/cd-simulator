import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const sizes=[
 [320,568,'very small phone'],
 [360,640,'small phone'],
 [360,760,'Pixel-like phone'],
 [390,844,'regular portrait'],
 [412,915,'large Android'],
 [430,932,'large phone'],
 [740,360,'landscape'],
 [200,460,'narrow CSS viewport (zoom approximation)']
];
async function ensureShell(page,label){
 const v=await page.evaluate(()=>{
  const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height,width:r.width,left:r.left,right:r.right}};
  const cs=getComputedStyle(document.querySelector('#gameScene'));
  return {height:innerHeight,width:document.documentElement.clientWidth,
   totalHeight:document.documentElement.scrollHeight,
   totalWidth:document.documentElement.scrollWidth,
   action:rect('#gameNext'),scene:rect('#gameScene'),
   footer:rect('.action-bar'),overflow:cs.overflowY};
 });
 assert.ok(v.totalWidth<=v.width+2,label+': horizontal document overflow '+JSON.stringify(v));
 assert.ok(v.totalHeight<=v.height+2,label+': exterior scroll '+JSON.stringify(v));
 assert.ok(v.action.height>=44,label+': primary action below touch target');
 assert.ok(v.action.top>=0&&v.action.bottom<=v.height+2,label+': CTA clipped '+JSON.stringify(v));
 assert.ok(v.footer.bottom<=v.height+2,label+': sticky footer off viewport');
 assert.ok(v.scene.bottom<=v.footer.top+2,label+': scene overlays CTA');
 assert.equal(v.overflow,'auto');
}
test('I2-08: one-screen shell never loses footer in mobile sizes, landscape and narrow zoom-equivalent layout',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const ctx=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameScene h1').filter({hasText:'Hoy tú diriges'}).waitFor();
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameStage').innerText(),/Área 1 de 8/);
  for(const [w,h,label] of sizes){
   await page.setViewportSize({width:w,height:h});
   await ensureShell(page,label);
   // Long scene help must scroll INSIDE the scene, not the whole document.
   await page.locator('.learn-more summary').first().click();
   await page.locator('#gameScene').evaluate(e=>{e.scrollTop=e.scrollHeight});
   await ensureShell(page,label+' with explanation expanded');
   await page.locator('.learn-more summary').first().click();
  }
  await page.setViewportSize({width:360,height:640});
  await page.locator('#gameNext').focus();
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'gameNext');
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#gameStage').innerText(),/Área 2 de 8/);
  await ensureShell(page,'keyboard navigation');
  await page.emulateMedia({reducedMotion:'reduce'});
  const transition=await page.evaluate(()=>getComputedStyle(document.querySelector('.progress-fill')).transitionDuration);
  assert.equal(transition,'0s','Reduced-motion preference must prevent progress animation');
  assert.deepEqual(errors,[]);
 }finally{await ctx.close();await browser.close()}
});
