import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
test('I2-14: configure score thresholds without modifying the game simulation or V1',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameScene h1').filter({hasText:'Hoy tú diriges'}).waitFor();
  assert.match(await page.locator('#managementTarget').innerText(),/Meta de servicio 90 %/);
  assert.equal(await page.locator('#gameNext').isVisible(),true);
  await page.locator('.management-settings summary').click();
  assert.equal(await page.locator('#gameGoal').isVisible(),true);
  await page.locator('#gameGoal').selectOption('service');
  await page.locator('#gameBudget').selectOption('0');
  assert.match(await page.locator('#managementTarget').innerText(),/Meta de servicio 95 %/);
  assert.match(await page.locator('#managementTarget').innerText(),/0/);
  const goalsKey='supply-lab-i2-objectives-v1',gameKey='supply-lab-i2-v1';
  const saved=await page.evaluate(([g,k])=>[localStorage.getItem(g),localStorage.getItem(k)],[goalsKey,gameKey]);
  assert.equal(JSON.parse(saved[0]).goal,'service');
  assert.equal(JSON.parse(saved[0]).incrementalBudgetCLP,0);
  assert.equal(saved[1],null,'Changing goals must not write or simulate the I2 campaign');
  await page.reload({waitUntil:'networkidle'});
  await page.locator('.management-settings summary').click();
  assert.equal(await page.locator('#gameGoal').inputValue(),'service');
  assert.equal(await page.locator('#gameBudget').inputValue(),'0');
  await page.locator('#gameNext').click();
  await page.locator('#gameNext').click(); // first choice locked
  await page.locator('#gameBack').click();
  await page.locator('#gameBack').click();
  await page.locator('.management-settings summary').click();
  assert.equal(await page.locator('#gameGoal').isDisabled(),true,
   'Goals cannot be moved retrospectively after first confirmation');
  assert.equal(await page.locator('#gameBudget').isDisabled(),true);
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameStage').innerText(),/Área 2 de 8/);
  for(let i=1;i<8;i++)await page.locator('#gameNext').click();
  const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),gameKey);
  assert.equal(before.reveal,false);
  await page.locator('#gameNext').click(); // reveal
  assert.match(await page.locator('#gameStage').innerText(),/Recuperación/);
  await page.locator('.i2-classic-recovery summary').click();
  await page.getByRole('button',{name:/Refuerzo operativo/}).click();
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/consecuencias/);
  assert.equal(await page.locator('.management-traffic-row').count(),2);
  assert.match(await page.locator('.management-evaluation').innerText(),/Gasto extra modelado/);
  assert.match(await page.locator('.management-evaluation').innerText(),/Crítico/);
  assert.match(await page.locator('.management-evaluation').innerText(),/Costo total y productividad persona-hora: sin datos/);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.management-traffic-row').count(),2);
  assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).goal,goalsKey),'service');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
