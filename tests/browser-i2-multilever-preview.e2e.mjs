import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
async function play(page){
 await page.locator('#gameNext').click();
 for(let i=0;i<8;i++)await page.locator('#gameNext').click();
 assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
 assert.equal(await page.locator('.multi-lever-panel').count(),0,
  'No physical scenario is available before explicit demand reveal');
 await page.locator('#gameNext').click();
 assert.equal(await page.locator('.game-choice').count(),5);
}
for(const reservePrelocated of [false,true]){
 test('I2-29: simulador de 0/1/2/3 palancas en móvil · reserva '+
  (reservePrelocated?'preubicada':'no existente'),{timeout:120000},async()=>{
  const browser=await chromium.launch({headless:true,
   executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
  const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)
   errors.push('HTTP '+r.status())});
  try{
   await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
   await page.evaluate(()=>localStorage.setItem('supply-lab-v90','V1-isolated'));
   if(reservePrelocated){
    await page.locator('.advanced-settings summary').click();
    await page.locator('#advancedReserve').selectOption('25');
    await page.locator('#advancedSave').click();
    assert.match(await page.locator('#advancedFeedback').innerText(),/guardada/);
   }
   await play(page);
   const saved=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
   const panel=page.locator('.multi-lever-panel');
   assert.equal(await panel.count(),1);
   await panel.locator('summary').first().click();
   assert.equal(await page.locator('#multiReserve').isDisabled(),!reservePrelocated);
   await page.locator('#multiCompare').click();
   assert.match(await page.locator('.multi-compare-conclusion').innerText(),/No|Servicio|Gasto/);
   assert.equal(await page.locator('.multi-compare-row').count(),0);
   await page.locator('#multiBuy').check();
   await page.locator('#multiBuyDay').selectOption('13');
   await page.locator('#multiCoverage').selectOption('100');
   await page.locator('#multiCompare').click();
   assert.match(await page.locator('.multi-compare-conclusion').innerText(),/día 13|corte día 12/);
   await page.locator('#multiBoost').check();
   if(reservePrelocated){
    await page.locator('#multiReserve').check();
    await page.locator('#multiRelease').selectOption('2');
   }
   await page.locator('#multiBuyDay').selectOption('2');
   await page.locator('#multiCompare').click();
   assert.match(await page.locator('.multi-compare-conclusion').innerText(),/Aporte marginal/);
   const detail=page.locator('.multi-scenario-details');
   await detail.locator('summary').click();
   assert.equal(await page.locator('.multi-compare-row').count(),reservePrelocated?6:4);
   assert.match(await page.locator('.multi-scenario-details').innerText(),/No intervenir/);
   assert.match(await page.locator('.multi-scenario-details').innerText(),/Combinación conjunta/);
   const layout=await page.evaluate(()=>({
    scroll:document.documentElement.scrollWidth,
    width:document.documentElement.clientWidth,
    height:document.documentElement.scrollHeight,
    view:document.documentElement.clientHeight,
    cta:document.querySelector('#gameNext').getBoundingClientRect().bottom
   }));
   assert.ok(layout.scroll<=layout.width+2,'no horizontal overflow');
   assert.ok(layout.height<=layout.view+2,'no body vertical scroll');
   assert.ok(layout.cta<=layout.view+2,'fixed footer stays visible');
   assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),saved,
    'What-if does not save or confirm an intervention');
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('.multi-compare-conclusion').count(),0,
    'I2-29 preview is deliberately non-persistent until I2-30');
   assert.equal(await page.locator('.game-choice').count(),5);
   assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'V1-isolated');
   assert.deepEqual(errors,[]);
  }finally{await context.close();await browser.close()}
 });
}
