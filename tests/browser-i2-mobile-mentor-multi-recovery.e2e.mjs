import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

/** New default journey: Nico's seven-step lesson is separate; the multi-action
 * workbench opens directly and remains independent from the classic fallback. */
test('I2-36: Nico dialog and visible multiple-actions route work on mobile',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  const before=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
  await page.getByRole('button',{name:/Conocer el juego con Nico/}).click();
  const dialog=page.locator('.nico-journey-dialog');
  assert.equal(await dialog.count(),1);
  assert.match(await dialog.locator('.nico-journey-progress').innerText(),/1 DE 7/);
  assert.equal(await dialog.locator('.nico-journey-portrait').count(),1);
  await dialog.locator('.nico-journey-next').click();
  assert.match(await dialog.locator('.nico-journey-progress').innerText(),/2 DE 7/);
  await dialog.locator('.nico-journey-back').click();
  assert.match(await dialog.locator('.nico-journey-progress').innerText(),/1 DE 7/);
  await dialog.locator('.nico-journey-skip').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),before);
  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++)await page.locator('#gameNext').click();
  assert.equal(await page.locator('.multi-lever-panel').count(),0,
   'No recovery or future operational signals before explicit reveal');
  await page.locator('#gameNext').click();
  assert.equal(await page.locator('.multi-lever-panel').count(),1);
  assert.equal(await page.locator('.multi-lever-panel').evaluate(x=>x.open),true,
   'Multiple-actions workbench is primary and open by default');
  assert.equal(await page.locator('.i2-classic-recovery').evaluate(x=>x.open),false,
   'Five one-click classics are still accessible, but not the primary choice');
  assert.ok(await page.locator('.i2-operational-alerts').innerText());
  await page.locator('#multiNicoHint').click();
  assert.match(await page.locator('#multiHintText').innerText(),/Pista:|Hipótesis:/);
  await page.locator('#multiBuy').check();
  await page.locator('#multiBoost').check();
  assert.equal(await page.locator('#multiBuy').isChecked(),true);
  assert.equal(await page.locator('#multiBoost').isChecked(),true);
  assert.match(await page.locator('.multi-lever-params').first().innerText(),/Día 13/);
  await page.locator('#multiBuyDay').selectOption('13');
  await page.locator('#multiCompare').click();
  assert.match(await page.locator('.multi-compare-conclusion').innerText(),/Gasto incremental/);
  await page.locator('.multi-confirm-decision summary').click();
  await page.locator('#multiCommit').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/combinación/);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-i2-v1')));
  assert.equal(saved.recoveryConfirmation.actions.urgentPurchase.enabled,true);
  assert.equal(saved.recoveryConfirmation.actions.capacityBoost.enabled,true);
  assert.equal(saved.recoveryConfirmation.actions.urgentPurchase.arrivalDay,13);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
