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
  await page.locator('.i2-classic-recovery summary').click();
  await page.getByRole('button',{name:/Refuerzo operativo/}).click();
  await page.locator('#gameNext').click(); // commit recovery → result
  await page.locator('#gameScene h1').filter({hasText:'consecuencias'}).waitFor();
  assert.equal(await page.locator('.management-traffic-row').count(),2,
   'Replay cannot pollute objective evaluation selectors');
  const detail=page.locator('.i2-tradeoff-replay');
  assert.equal(await detail.count(),1);
  assert.equal(await detail.locator('.i2-replay-option-row').count(),0,
   'Five expensive canonical replays must not run before opening the panel');
  await detail.locator('summary').click();
  await detail.locator('.i2-replay-option-row').first().waitFor();
  assert.equal(await detail.locator('.i2-replay-option-row').count(),5);
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

/** I2-35: combined recovery result must expose the same optional classic lab. */
test('I2-35: confirmed multi-action still has a five-option retrospective lab',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({
  headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined
 });
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:390,height:780}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++)await page.locator('#gameNext').click();
  await page.locator('#gameNext').click();
  if(!(await page.locator('.multi-lever-panel').evaluate(el=>el.open)))await page.locator('.multi-lever-panel summary').first().click();
  await page.locator('#multiBuy').check();
  await page.locator('#multiBoost').check();
  await page.locator('#multiBuyDay').selectOption('13');
  await page.locator('#multiCompare').click();
  await page.locator('.multi-confirm-decision summary').click();
  await page.locator('#multiCommit').click();
  await page.locator('#gameScene h1').filter({hasText:'combinación'}).waitFor();
  const panel=page.locator('.i2-tradeoff-replay');
  assert.equal(await panel.count(),1);
  assert.equal(await panel.locator('.i2-replay-option-row').count(),0);
  await panel.locator('summary').click();
  await panel.locator('.i2-replay-option-row').first().waitFor();
  assert.equal(await panel.locator('.i2-replay-option-row').count(),5);
  assert.match(await panel.innerText(),/ni compara todas las combinaciones/);
  const saved=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
  await panel.locator('summary').click();
  await panel.locator('summary').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),saved,
   'Read-only lab cannot change a confirmed multi-action recovery');
  assert.deepEqual(errors,[]);
 }finally{
  await context.close();
  await browser.close();
 }
});
