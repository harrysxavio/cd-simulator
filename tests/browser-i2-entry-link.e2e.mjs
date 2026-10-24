// I2-03: an accessible link makes the already existing /juego/ route reachable.
// It must never mutate the established V1 simulation session.
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const PATH='/juego/';
const KEY='supply-lab-v90';

async function verify(phone,run){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(phone?{...devices['Pixel 7'],viewport:{width:360,height:760}}:{viewport:{width:1280,height:820}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('JS '+e.message));
 page.on('console',x=>{if(x.type()==='error')errors.push(x.text())});
 page.on('response',x=>{if(x.url().startsWith(BASE)&&x.status()>=400)errors.push('HTTP '+x.status())});
 try{await run(page);assert.deepEqual(errors,[]);}
 finally{await context.close();await browser.close();}
}

test('I2-03: mobile V1 entry opens actual /juego/ page and returns without replacing session',{timeout:60000},()=>verify(true,async page=>{
 await page.goto(BASE+'/',{waitUntil:'networkidle'});
 const old=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 assert.ok(old?.campaignId);
 const link=page.locator('#gameEntry');
 assert.equal(await link.count(),1);
 assert.equal(await link.getAttribute('href'),'./juego/');
 assert.match(await link.innerText(),/vista previa/i);
 for(const width of [320,360,390,412,430]){
  await page.setViewportSize({width,height:640});
  const geometry=await page.evaluate(()=>{
   const r=document.getElementById('gameEntry').getBoundingClientRect();
   return {height:r.height,width:r.width,pageWidth:document.documentElement.scrollWidth,viewportWidth:document.documentElement.clientWidth};
  });
  assert.ok(geometry.height>=44&&geometry.width>=44,'Game link target too small');
  assert.ok(geometry.pageWidth<=geometry.viewportWidth+2,'New horizontal overflow at '+width);
 }
 await link.click();
 assert.equal(new URL(page.url()).pathname,PATH);
 assert.match(await page.title(),/Misión CD/);
 assert.match(await page.getByRole('status').innerText(),/todavía no están disponibles/);
 const now=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 assert.deepEqual(now,old,'Opening game route must not touch V1 storage');
 await page.locator('.return-link').click();
 assert.equal(new URL(page.url()).pathname,'/');
 const restored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 assert.equal(restored.campaignId,old.campaignId);
 assert.deepEqual(restored.decisions,old.decisions);
}));

test('I2-03: keyboard opens real game route without an inert control',{timeout:60000},()=>verify(false,async page=>{
 await page.goto(BASE+'/',{waitUntil:'networkidle'});
 await page.locator('#gameEntry').focus();
 await page.keyboard.press('Enter');
 assert.equal(new URL(page.url()).pathname,PATH);
 assert.equal(await page.locator('main h1').count(),1);
 await page.locator('.action-primary').focus();
 await page.keyboard.press('Enter');
 assert.equal(new URL(page.url()).pathname,'/');
}));
