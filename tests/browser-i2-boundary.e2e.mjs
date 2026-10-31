import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

test('I2-06: mobile game keeps PII off storage and labels modeled cost as partial, not profit',
 {timeout:90000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[],external=[];
 page.on('pageerror',e=>errors.push('JS '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('Console '+m.text())});
 page.on('request',r=>{if(!r.url().startsWith(BASE)&&!r.url().startsWith('data:'))external.push(r.url())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  assert.equal(await page.getByText('Costo total: desconocido').count(),0,
   'Do not show post-reveal economic scores on the briefing');
  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++){
   assert.equal(await page.locator('.game-choice.chosen').count(),1);
   assert.equal((await page.locator('#gameScene').innerText()).includes('Gasto incremental modelado:'),false,
    'Pre-reveal physical expense must remain hidden');
   await page.locator('#gameNext').click();
  }
  assert.match(await page.locator('#gameScene h1').innerText(),/Algo cambió/);
  await page.locator('#gameNext').click();
  await page.locator('.i2-classic-recovery summary').click();
  await page.locator('.impact-btn').click();
  const impact=await page.locator('.impact-result').innerText();
  assert.match(impact,/Gasto incremental modelado:/);
  assert.match(impact,/Costo total: desconocido/);
  assert.doesNotMatch(impact,/EBITDA: \$0|Utilidad neta: \$0/);
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameScene h1').innerText(),/consecuencias/);
  assert.equal(await page.locator('.metric-card').count(),2);
  await page.locator('.learn-more summary').click();
  const content=await page.locator('#gameScene').innerText();
  assert.match(content,/Compromiso de compras originales:/);
  assert.match(content,/Variación del proxy económico:/);
  assert.match(content,/no representa utilidad ni EBITDA/);
  assert.match(content,/El costo operacional total es desconocido/);
  const stored=await page.evaluate(k=>localStorage.getItem(k),KEY);
  assert.equal(JSON.parse(stored).schema,2);
  assert.doesNotMatch(stored,/actualOrders|shippedOrders|incrementalExpense|netProfit|EBITDA|originalPurchaseOrders|tracking|customerName/i);
  assert.deepEqual(errors,[]);
  assert.deepEqual(external,[],'The public game must have no hidden network calls');
 }finally{await context.close();await browser.close()}
});
