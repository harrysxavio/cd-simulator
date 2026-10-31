import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

/** I2-35: after-the-fact comparison must never leak unknown demand. */
test('I2-35: mobile replay lab is optional and never alters management evaluation',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({
  headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined
 });
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.i2-tradeoff-replay').count(),0,
   'No replay or actual-demand comparison before reveal');
  await page.locator('#gameNext').click(); // intro → first area
  for(let i=0;i<8;i++)await page.locator('#gameNext').click(); // eight choices
  assert.equal(await page.locator('.i2-tradeoff-replay').count(),0);
  await page.locator('#gameNext').click(); // reveal → recovery
  assert.equal(await page.locator('.i2-tradeoff-replay').count(),0);
  await page.getByRole('button',{name:/Refuerzo operativo/}).click();
  await page.locator('#gameNext').click(); // commit recovery → result
  await page.locator('#gameScene h1').filter({hasText:'consecuencias'}).waitFor();
  assert.equal(await page.locator('.management-traffic-row').count(),2,
   'Replay cannot pollute objective evaluation selectors');
  const detail=page.locator('.i2-tradeoff-replay');
  assert.equal(await detail.count(),1);
  assert.equal(await detail.locator('.i2-replay-option-row').count(),5);
  await detail.locator('summary').click();
  assert.match(await detail.innerText(),/Laboratorio|alternativas clásicas/);
  assert.match(await detail.innerText(),/no es una predicción/);
  assert.equal(await detail.locator('.i2-replay-option-row').first().isVisible(),true);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.management-traffic-row').count(),2);
  assert.deepEqual(errors,[]);
 }finally{
  await context.close();
  await browser.close();
 }
});
