import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

for(const mode of ['desktop','phone'])test('M3-10 inventory verified and physical SKU view '+mode,{timeout:150000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mode==='phone'?{...devices['Pixel 7']}:{viewport:{width:1240,height:860}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/?m3-inventory='+mode,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   const key='supply-lab-v90',s=JSON.parse(localStorage.getItem(key));
   s.revealed=true;s.shockDirection=1;s.phase='recover';s.currentSection='dashboard';
   s.scenario={...s.scenario,demand:1000,demandShockPercent:40};
   s.decisions={...s.decisions,commercial:'under',planning:'partial',purchasing:'reliable',inventory:'low'};
   s.skuPolicy='service';s.skuRecovery='reserve';s.skuReservePercent=20;s.skuUrgentArrival=2;
   localStorage.setItem(key,JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  const section=page.locator('#canonicalAreaView [data-area-id="inventory"]');
  await section.locator('summary').click();
  const value=await section.innerText();
  for(const word of ['PICK-FACE','RESERVA-CD','sin verificar','también existen físicamente','Traslados internos','inventoryLedger.daily'])assert.ok(value.includes(word),word);
  const daily=page.locator('#canonicalAreaView .canonical-day-detail');
  await daily.locator('summary').click();
  const rows=await daily.locator('.canonical-day-row').allInnerTexts();
  assert.equal(rows.length,13);
  for(const row of rows)for(const word of ['PICK-FACE','RESERVA-CD','verificable','sin verificar'])assert.ok(row.includes(word),word);
  const before=await section.locator('summary').innerText();
  await page.locator('#preliminaryTab').click();await page.locator('#dashboardTab').click();
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.equal(await section.locator('summary').innerText(),before);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resultTabs [data-result-target="areas"]').click();
  assert.equal(await section.locator('summary').innerText(),before);
  if(mode==='phone')for(const width of [360,412]){
   await page.setViewportSize({width,height:810});
   const o=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(o<=2,'horizontal overflow '+o);
  }
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
