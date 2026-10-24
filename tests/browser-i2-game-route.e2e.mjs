// I2-02: the route is real, reversible and deliberately not yet a playable game.
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const CHROMIUM=process.env.E2E_CHROMIUM_PATH||undefined;
const STORAGE_KEY='supply-lab-v90';

async function inBrowser(phone,run){
 const browser=await chromium.launch({headless:true,executablePath:CHROMIUM});
 const context=await browser.newContext(phone?{
  ...devices['Pixel 7'],viewport:{width:360,height:760}
 }:{viewport:{width:1280,height:820}});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)errors.push('HTTP '+r.status())});
 try{await run(page);assert.deepEqual(errors,[],'Route or V1 browser errors');}
 finally{await context.close();await browser.close();}
}

test('I2-02: direct game route serves valid mobile page, assets and real return link',{timeout:60000},()=>inBrowser(true,async page=>{
 await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
 assert.match(await page.title(),/Misión CD/);
 assert.equal(await page.locator('html').getAttribute('lang'),'es');
 assert.equal(await page.locator('main h1').count(),1);
 assert.equal(await page.locator('a.action-primary').getAttribute('href'),'../');
 assert.match(await page.getByRole('status').innerText(),/todavía no están disponibles/i);
 for(const width of [320,360,390,412,430]){
  await page.setViewportSize({width,height:568});
  const geometry=await page.evaluate(()=>({
   viewport:document.documentElement.clientWidth,
   content:document.documentElement.scrollWidth,
   back:(()=>{const r=document.querySelector('.action-primary').getBoundingClientRect();return {width:r.width,height:r.height}})()
  }));
  assert.ok(geometry.content<=geometry.viewport+2,'Horizontal overflow '+width+'px: '+JSON.stringify(geometry));
  assert.ok(geometry.back.height>=44&&geometry.back.width>=44,'Back target too small');
 }
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('a.action-primary').count(),1);
 await page.locator('.action-primary').click();
 assert.equal(new URL(page.url()).pathname,'/');
 assert.equal(await page.locator('#operationsSection').isVisible(),true);
}));

test('I2-02: navigating the empty game route cannot overwrite V1 session',{timeout:60000},()=>inBrowser(false,async page=>{
 await page.goto(BASE+'/',{waitUntil:'networkidle'});
 const snapshot=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
 assert.ok(snapshot?.campaignId,'V1 session should exist');
 await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
 const whileInGame=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
 assert.deepEqual(whileInGame,snapshot);
 assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),null);
 await page.goBack({waitUntil:'networkidle'});
 assert.equal(await page.locator('#operationsSection').isVisible(),true);
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
 assert.equal(after.campaignId,snapshot.campaignId);
 assert.deepEqual(after.decisions,snapshot.decisions);
}));
