import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const URL=(process.env.E2E_BASE_URL||'http://127.0.0.1:8000')+'/juego/';
const KEY='supply-lab-i2-v1';
const V1='supply-lab-v90';

async function phone(run){
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{await page.goto(URL,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[])}
 finally{await context.close();await browser.close()}
}

test('I2-05: confirmed decisions are consult-only and a reloaded phone returns to same stage',
 {timeout:60000},()=>phone(async page=>{
 await page.locator('#gameNext').click();
 await page.locator('.game-choice').last().click();
 await page.locator('#gameNext').click(); // confirm Comercial; enter Planning
 const original=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 assert.equal(original.schema,2);
 assert.equal(original.substep,'decision');
 assert.deepEqual(original.confirmedAreas,['commercial']);
 await page.locator('#gameBack').click(); // consult confirmed Comercial
 assert.equal(await page.locator('.game-choice:disabled').count(),3);
 assert.equal(await page.locator('.game-choice.chosen').count(),1);
 await page.reload({waitUntil:'networkidle'});
 assert.match(await page.locator('#gameStage').innerText(),/Área 1 de 8/);
 assert.equal(await page.locator('.game-choice:disabled').count(),3);
 await page.locator('#gameNext').click(); // next without changing confirmed choice
 const after=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 assert.deepEqual(after.confirmedAreas,['commercial']);
 assert.equal(after.choices.commercial,original.choices.commercial);
 assert.equal(after.index,1);
}));

test('I2-05: v1 save migrates and corrupted JSON resets only the game state',
 {timeout:60000},()=>phone(async page=>{
 await page.locator('#gameNext').click();
 await page.locator('.game-choice').first().click();
 const current=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 await page.evaluate(([key,v1,state])=>{
  localStorage.setItem(v1,'{"keepV1":"safe"}');
  localStorage.setItem(key,JSON.stringify({
   ...state,schema:1,secretCustomerEmail:'private@example.com',
   physicalLedger:[{qty:1234}]
  }));
 },[KEY,V1,current]);
 await page.reload({waitUntil:'networkidle'});
 assert.match(await page.locator('#gameStage').innerText(),/Área 1 de 8/);
 const migrated=await page.evaluate(k=>localStorage.getItem(k),KEY);
 assert.equal(JSON.parse(migrated).schema,2);
 assert.doesNotMatch(migrated,/secretCustomerEmail|private@example.com|physicalLedger/);
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),V1),'{"keepV1":"safe"}');
 await page.evaluate(key=>localStorage.setItem(key,'{broken'),KEY);
 await page.reload({waitUntil:'networkidle'});
 assert.match(await page.locator('h1').first().innerText(),/Hoy tú diriges/);
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),V1),'{"keepV1":"safe"}');
}));
