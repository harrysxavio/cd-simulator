import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

/** Check the public six-question summary, including keyboard/scroll constraints. */
for(const mode of ['classic','multi']){
 test('I2-37.1: six questions visible on Pixel 7, '+mode,{timeout:120000},async()=>{
  const browser=await chromium.launch({headless:true,
   executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
  const context=await browser.newContext({...devices['Pixel 7'],
   viewport:{width:360,height:760}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
   await page.locator('#gameNext').click();
   for(let i=0;i<8;i++)await page.locator('#gameNext').click();
   // Before demand reveal, none of the six answers may be visible.
   assert.equal(await page.locator('.i2-six-question-summary').count(),0);
   await page.locator('#gameNext').click();
   if(mode==='classic'){
    await page.locator('#gameNext').click();
   }else{
    await page.locator('#multiBuy').check();
    await page.locator('#multiCompare').click();
    await page.locator('.multi-confirm-decision > summary').click();
    await page.locator('#multiCommit').click();
   }
   const panel=page.locator('.i2-six-question-summary');
   assert.equal(await panel.count(),1);
   assert.equal(await panel.locator('.i2-six-answer').count(),6);
   assert.match(await panel.innerText(),/no se mide entrega efectiva/i);
   assert.match(await panel.innerText(),/no es costo total ni utilidad/i);
   const size=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth,
    outerScroll:document.documentElement.scrollHeight,
    viewport:document.documentElement.clientHeight
   }));
   assert.ok(size.scrollWidth<=size.width+2);
   assert.ok(size.outerScroll<=size.viewport+2);
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('.i2-six-answer').count(),6);
   assert.deepEqual(errors,[]);
  }finally{await context.close();await browser.close()}
 });
}
