import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';

test('I2-11: chapter progress, non-skippable roadmap and mobile footer through complete mission',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameScene h1').filter({hasText:'Hoy tú diriges'}).waitFor();
  assert.match(await page.locator('#gameChapter').innerText(),/Capítulo 1 de 4/);
  assert.equal(await page.locator('#gameProgressTrack').getAttribute('role'),'progressbar');
  assert.equal(await page.locator('#gameProgressTrack').getAttribute('aria-valuenow'),'0');
  assert.equal(await page.locator('#gameMapOpen').getAttribute('aria-haspopup'),'dialog');
  const savedBefore=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
  await page.locator('#gameMapOpen').click();
  const dialog=page.locator('dialog.i2-help-dialog');
  await dialog.waitFor({state:'visible'});
  assert.match(await dialog.innerText(),/Capítulo 1 de 4/);
  assert.match(await dialog.innerText(),/Comercial/);
  assert.match(await dialog.innerText(),/Transporte/);
  assert.match(await dialog.innerText(),/no permite saltar pasos/);
  assert.doesNotMatch(await dialog.innerText(),/280 pedidos|40 %|expedidos reales/);
  assert.equal(await dialog.locator('a').count(),0);
  assert.equal(await page.locator('#gameNext').isVisible(),true);
  await page.keyboard.press('Escape');
  await dialog.waitFor({state:'detached'});
  assert.equal(await page.locator('#gameMapOpen').evaluate(e=>document.activeElement===e),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),savedBefore);

  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++){
   assert.match(await page.locator('#gameChapter').innerText(),/Capítulo 2 de 4/);
   const text=await page.locator('#gameProgressTrack').getAttribute('aria-valuetext');
   assert.match(text,new RegExp('Área '+(i+1)+' de 8'));
   const n=Number(await page.locator('#gameProgressTrack').getAttribute('aria-valuenow'));
   assert.equal(n,10+i*8);
   await page.locator('#gameNext').click();
  }
  assert.match(await page.locator('#gameChapter').innerText(),/Capítulo 3 de 4/);
  assert.equal(await page.locator('#gameProgressTrack').getAttribute('aria-valuenow'),'78');
  await page.locator('#gameMapOpen').click();
  assert.doesNotMatch(await dialog.innerText(),/280 pedidos|40 %/);
  await page.locator('.i2-help-close').click();
  await dialog.waitFor({state:'detached'});
  await page.locator('#gameNext').click();
  assert.equal(await page.locator('#gameProgressTrack').getAttribute('aria-valuenow'),'92');
  await page.locator('#gameBack').click();
  assert.match(await page.locator('#gameChapter').innerText(),/Capítulo 3 de 4/);
  assert.equal(await page.locator('#gameProgressTrack').getAttribute('aria-valuenow'),'92');
  await page.locator('#gameNext').click();
  await page.locator('#gameNext').click();
  assert.match(await page.locator('#gameChapter').innerText(),/Capítulo 4 de 4/);
  assert.equal(await page.locator('#gameProgressTrack').getAttribute('aria-valuenow'),'100');
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('#gameChapter').innerText(),/Capítulo 4 de 4/);

  for(const [w,h] of [[320,568],[360,640],[412,915],[740,360],[200,460]]){
   await page.setViewportSize({width:w,height:h});
   const g=await page.evaluate(()=>{
    const a=document.querySelector('#gameNext').getBoundingClientRect();
    const m=document.querySelector('#gameMapOpen').getBoundingClientRect();
    return {width:document.documentElement.clientWidth,
     docWidth:document.documentElement.scrollWidth,
     docHeight:document.documentElement.scrollHeight,
     height:innerHeight,ctaBottom:a.bottom,ctaHeight:a.height,
     mapWidth:m.width,mapHeight:m.height};
   });
   assert.ok(g.docWidth<=g.width+2&&g.docHeight<=g.height+2,'Outer overflow '+w+'x'+h);
   assert.ok(g.ctaBottom<=g.height+2&&g.ctaHeight>=44,'CTA clipped '+w+'x'+h);
   assert.ok(g.mapWidth>=44&&g.mapHeight>=44,'Map target undersized '+w+'x'+h);
  }
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
