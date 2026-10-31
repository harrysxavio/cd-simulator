import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
async function toRecover(page){
 await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
 await page.evaluate(()=>localStorage.setItem('supply-lab-v90','isolated-classic'));
 await page.locator('#gameNext').click();
 for(let i=0;i<8;i++)await page.locator('#gameNext').click();
 assert.equal(await page.locator('.economic-manager-panel').count(),0);
 await page.locator('#gameNext').click();
 assert.equal(await page.locator('.economic-manager-panel').count(),0);
}
for(const mode of ['classic','multi']){
 test('I2-33: financial V1 audit on Pixel 7 '+mode,
  {timeout:120000},async()=>{
  const browser=await chromium.launch({headless:true,
   executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
  const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await toRecover(page);
   if(mode==='classic')await page.locator('#gameNext').click();
   else{
    if(!(await page.locator('.multi-lever-panel').evaluate(el=>el.open)))await page.locator('.multi-lever-panel > summary').click();
    await page.locator('#multiBuy').check();
    await page.locator('#multiBoost').check();
    await page.locator('#multiCompare').click();
    await page.locator('.multi-confirm-decision > summary').click();
    await page.locator('#multiCommit').click();
   }
   const economic=page.locator('.economic-manager-panel');
   assert.equal(await economic.count(),1);
   assert.equal(await economic.evaluate(x=>x.open),false);
   const saved=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
   await page.locator('.economic-manager-panel > summary').click();
   assert.equal(await economic.locator('.economic-manager-card').count(),4);
   assert.match(await economic.innerText(),/Contribución parcial/i);
   assert.match(await economic.innerText(),/Compras|comprometido/i);
   await economic.locator('.economic-purchase-book > summary').click();
   assert.ok(await economic.locator('.economic-purchase-row').count()>=3);
   assert.match(await economic.locator('.economic-purchase-book').innerText(),/pago/i);
   await economic.locator('.economic-days > summary').click();
   assert.equal(await economic.locator('#economicAuditDay option').count(),13);
   await economic.locator('#economicAuditDay').selectOption('12');
   assert.match(await economic.locator('.economic-day-detail').innerText(),/Día 12/);
   await economic.locator('.economic-nico-coach > summary').click();
   assert.match(await economic.locator('.economic-nico-coach').innerText(),/pedidos|contribución/);
   assert.match(await economic.innerText(),/EBITDA/);
   assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),saved);
   const sizes=await page.evaluate(()=>({
    bodyScroll:document.documentElement.scrollHeight,
    viewport:document.documentElement.clientHeight,
    wide:document.documentElement.scrollWidth,
    client:document.documentElement.clientWidth,
    footer:document.querySelector('#gameNext').getBoundingClientRect().bottom
   }));
   assert.ok(sizes.bodyScroll<=sizes.viewport+2);
   assert.ok(sizes.wide<=sizes.client+2);
   assert.ok(sizes.footer<=sizes.viewport+2);
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('.economic-manager-panel').count(),1);
   assert.equal(await page.locator('.economic-manager-panel').evaluate(x=>x.open),false);
   assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'isolated-classic');
   assert.deepEqual(errors,[]);
  }finally{await context.close();await browser.close()}
 });
}
