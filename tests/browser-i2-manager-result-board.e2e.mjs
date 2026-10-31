import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
async function toRecovery(page){
 await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
 await page.evaluate(()=>localStorage.setItem('supply-lab-v90','safe-v1'));
 await page.locator('#gameNext').click();
 for(let i=0;i<8;i++)await page.locator('#gameNext').click();
 assert.equal(await page.locator('.manager-result-board').count(),0,
  'A future result must not appear before revealing demand');
 await page.locator('#gameNext').click();
 assert.equal(await page.locator('.manager-result-board').count(),0);
}
for(const mode of ['classic','multi']){
 test('I2-31: four-axis manager scorecard + Nico on mobile '+mode,
  {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await toRecovery(page);
  if(mode==='classic'){
   await page.locator('#gameNext').click();
  }else{
   if(!(await page.locator('.multi-lever-panel').evaluate(el=>el.open)))await page.locator('.multi-lever-panel > summary').click();
   await page.locator('#multiBuy').check();
   await page.locator('#multiBoost').check();
   await page.locator('#multiCompare').click();
   await page.locator('.multi-confirm-decision > summary').click();
   await page.locator('#multiCommit').click();
  }
  const board=page.locator('.manager-result-board');
  assert.equal(await board.count(),1);
  assert.equal(await board.evaluate(x=>x.open),false);
  assert.equal(await page.locator('.manager-axis').count(),4);
  const kp=page.locator('.metrics-grid > .metric-card');
  assert.equal(await kp.count()>=2,true);
  await board.locator('summary').first().click();
  assert.equal(await board.locator('.manager-axis').count(),4);
  assert.deepEqual(await board.locator('.manager-axis').evaluateAll(
   ns=>ns.map(n=>n.dataset.axis)),['service','capacity','cost','time']);
  assert.match(await board.locator('[data-axis="capacity"]').innerText(),/Sin evaluación/);
  assert.match(await board.locator('[data-axis="time"]').innerText(),/pendientes/);
  await board.locator('[data-axis="service"] .manager-axis-detail > summary').click();
  assert.match(await board.locator('[data-axis="service"] .manager-axis-detail').innerText(),/Fórmula:/);
  await board.locator('.manager-nico-view > summary').click();
  const nico=board.locator('.manager-nico-view');
  assert.match(await nico.innerText(),/Qué salió bien/);
  assert.match(await nico.innerText(),/Riesgos y sacrificios/);
  assert.match(await nico.innerText(),/Tres preguntas/);
  assert.match(await nico.innerText(),/consumidor/);
  await board.locator('.manager-original-context > summary').click();
  assert.match(await board.locator('.manager-original-context').innerText(),/plan original/i);
  const layout=await page.evaluate(()=>({
   outerScroll:document.documentElement.scrollHeight,
   height:document.documentElement.clientHeight,
   width:document.documentElement.clientWidth,
   scrollWidth:document.documentElement.scrollWidth,
   cta:document.querySelector('#gameNext').getBoundingClientRect().bottom
  }));
  assert.ok(layout.outerScroll<=layout.height+2);
  assert.ok(layout.scrollWidth<=layout.width+2);
  assert.ok(layout.cta<=layout.height+2);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.manager-result-board').count(),1);
  assert.equal(await page.locator('.manager-result-board').evaluate(x=>x.open),false);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'safe-v1');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
 });
}
