import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

for(const mode of ['classic','multi']){
 test('I2-34: Nico evaluates measured outcome and awards only on evidence, Pixel 7 '+mode,
  {timeout:120000},async()=>{
  const browser=await chromium.launch({headless:true,
   executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
  const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
   await page.evaluate(()=>localStorage.setItem('supply-lab-v90','classic-unchanged'));
   await page.locator('#gameNext').click();
   for(let i=0;i<8;i++)await page.locator('#gameNext').click();
   assert.equal(await page.locator('.nico-learning-result').count(),0);
   await page.locator('#gameNext').click();
   assert.equal(await page.locator('.nico-learning-result').count(),0);
   if(mode==='classic')await page.locator('#gameNext').click();
   else{
    if(!(await page.locator('.multi-lever-panel').evaluate(el=>el.open)))await page.locator('.multi-lever-panel > summary').click();
    await page.locator('#multiBuy').check();
    await page.locator('#multiBoost').check();
    await page.locator('#multiCompare').click();
    await page.locator('.multi-confirm-decision > summary').click();
    await page.locator('#multiCommit').click();
   }
   const panel=page.locator('.nico-learning-result');
   assert.equal(await panel.count(),1);
   assert.equal(await panel.evaluate(x=>x.open),false);
   assert.equal(await page.locator('.metrics-grid > .metric-card').count()>=2,true);
   const saved=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
   await page.locator('.nico-learning-result > summary').click();
   assert.equal(await panel.locator('.nico-earned-award').count(),1);
   assert.equal(await panel.locator('.nico-learning-subsection').count(),6);
   for(const name of ['facts','good','risks','tradeoffs','hypotheses','next']){
    const section=panel.locator('.nico-learning-'+name);
    assert.equal(await section.count(),1);
    await section.locator('summary').click();
    assert.equal(await section.evaluate(x=>x.open),true);
    assert.ok((await section.locator('p').count())>=1);
   }
   assert.match(await panel.locator('.nico-learning-hypotheses').innerText(),/Hipótesis/);
   assert.match(await panel.innerText(),/insignia/i);
   assert.match(await panel.innerText(),/no es rentabilidad|sin rentabilidad|contribución parcial/i);
   const awardText=await panel.locator('.nico-earned-award').innerText();
   assert.match(awardText,/Insignia conseguida|Sin insignia esta ronda/);
   if(awardText.includes('Insignia conseguida')){
    assert.match(awardText,/Evidencia: servicio/);
    assert.doesNotMatch(awardText,/clic|botones pulsados/i);
   }
   const size=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth,
    height:document.documentElement.clientHeight,
    scrollHeight:document.documentElement.scrollHeight,
    next:document.querySelector('#gameNext').getBoundingClientRect().bottom
   }));
   assert.ok(size.scrollWidth<=size.width+2,'no horizontal body scroll');
   assert.ok(size.scrollHeight<=size.height+2,'no vertical body scroll');
   assert.ok(size.next<=size.height+2,'footer CTA accessible');
   assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),saved);
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('.nico-learning-result').count(),1);
   assert.equal(await page.locator('.nico-learning-result').evaluate(x=>x.open),false);
   assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'classic-unchanged');
   assert.deepEqual(errors,[]);
  }finally{await context.close();await browser.close()}
 });
}
