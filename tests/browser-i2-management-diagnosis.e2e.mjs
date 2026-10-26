import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

for(const seed of ['alpha-case-01','alpha-case-05']){
 test('I2-27: diagnóstico gerencial opt-in, '+seed+' en Android emulado', {timeout:120000},async()=>{
  const browser=await chromium.launch({headless:true,
   executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
  const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
   await page.evaluate(()=>localStorage.setItem('supply-lab-v90','original-protegida'));
   await page.locator('.management-settings summary').click();
   await page.locator('#gameChallenge').selectOption(seed);
   await page.locator('#gameNext').click();
   for(let i=0;i<8;i++)await page.locator('#gameNext').click();
   assert.equal(await page.locator('.management-diagnosis').count(),0,
    'Antes del reveal no debe existir lectura física de demanda');
   await page.locator('#gameNext').click();
   const diag=page.locator('.management-diagnosis');
   assert.equal(await diag.count(),1);
   assert.equal(await page.locator('.i2-observed-demand .metric-card').count(),2);
   assert.equal(await diag.evaluate(el=>el.open),false);
   await diag.locator('summary').first().click();
   assert.match(await diag.innerText(),/Servicio original/);
   assert.match(await diag.innerText(),/Error del pronóstico/);
   assert.match(await diag.innerText(),/Compra comprometida/);
   assert.match(await diag.innerText(),/sin recuperación/i);
   await diag.locator('.diagnosis-evidence > summary').click();
   assert.equal(await diag.locator('.diagnosis-evidence-row').count(),6);
   assert.match(await diag.locator('.diagnosis-evidence').innerText(),/Fuente:/);
   await diag.locator('.diagnosis-hypotheses > summary').click();
   assert.match(await diag.locator('.diagnosis-hypotheses').innerText(),/no causas confirmadas/);
   await diag.locator('.diagnosis-sku-explainer > summary').click();
   assert.match(await diag.locator('.diagnosis-sku-explainer').innerText(),/doce días/i);
   assert.equal(await diag.locator('.nico-manager-tutorial').count(),1);
   const geometry=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth,
    clientHeight:document.documentElement.clientHeight,
    scrollHeight:document.documentElement.scrollHeight,
    bottom:document.querySelector('#gameNext').getBoundingClientRect().bottom
   }));
   assert.ok(geometry.scrollWidth<=geometry.width+2);
   assert.ok(geometry.scrollHeight<=geometry.clientHeight+2);
   assert.ok(geometry.bottom<=geometry.clientHeight);
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('.management-diagnosis').count(),1);
   assert.equal(await page.locator('.management-diagnosis').evaluate(x=>x.open),false);
   assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'original-protegida');
   assert.deepEqual(errors,[]);
  }finally{await context.close();await browser.close()}
 });
}
