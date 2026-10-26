import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
for(const sample of [
 {seed:'alpha-case-03',expected:170,heading:/disminuyó un 15 %/,variance:'-30'},
 {seed:'alpha-case-04',expected:300,heading:/aumentó un 50 %/,variance:'+100'}
]){
 test('I2-26: reto '+sample.seed+' se revela solo con CTA y conserva semilla tras reload',
  {timeout:120000},async()=>{
  const browser=await chromium.launch({headless:true,
   executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
  const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)
   errors.push('HTTP '+r.status())});
  try{
   await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
   await page.evaluate(()=>localStorage.setItem('supply-lab-v90','v1-intact'));
   await page.locator('.management-settings summary').click();
   await page.locator('#gameChallenge').selectOption(sample.seed);
   await page.locator('#gameNext').click();
   for(let i=0;i<8;i++)await page.locator('#gameNext').click();
   assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
   const sealed=page.locator('.i2-sealed-demand');
   assert.equal(await sealed.count(),1);
   assert.match(await sealed.innerText(),/sigue sellada/);
   assert.match(await sealed.innerText(),/200 pedidos previstos/);
   assert.doesNotMatch(await page.locator('#gameScene').innerText(),sample.heading);
   assert.doesNotMatch(await sealed.innerText(),new RegExp(String(sample.expected)+' pedidos'));
   assert.equal(await page.locator('#gameNext').innerText(),'Revelar demanda →');
   let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-i2-v1')));
   assert.equal(state.reveal,false);
   assert.equal(state.seed,sample.seed);
   assert.equal(state.confirmedAreas.length,8);
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('.i2-sealed-demand').count(),1);
   await page.locator('#gameNext').click();
   state=await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-i2-v1')));
   assert.equal(state.reveal,true);
   assert.equal(state.seed,sample.seed);
   assert.match(await page.locator('#gameScene h1').innerText(),sample.heading);
   const observed=page.locator('.i2-observed-demand');
   assert.match(await observed.innerText(),new RegExp(String(sample.expected)+' pedidos'));
   assert.match(await observed.innerText(),new RegExp(sample.variance.replace('+','\\+')+' pedidos'));
   assert.match(await page.locator('#gameScene').innerText(),/no por tu desempeño/);
   await page.reload({waitUntil:'networkidle'});
   assert.match(await page.locator('.i2-observed-demand').innerText(),
    new RegExp(String(sample.expected)+' pedidos'));
   assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'v1-intact');
   assert.deepEqual(errors,[]);
  }finally{await context.close();await browser.close()}
 });
}
