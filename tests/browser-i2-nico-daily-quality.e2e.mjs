import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';

/**
 * Pixel 7 verifies that images complement the actually observed day.
 * A manager must not see event art before the second incident is observed.
 */
test('I2-Nico: seven tutorial poses and dated Quality reaction use existing expansion files',
 {timeout:150000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],
  viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[],failedImages=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',res=>{
  if(res.url().includes('/expansion-2026-10-31/')&&res.status()!==200)
   failedImages.push(res.url()+' -> HTTP '+res.status());
 });
 const getAsset=async filename=>{
  const selector='img.nico-scene-portrait[src$="'+filename+'"]';
  const img=page.locator(selector);
  await img.waitFor();
  await img.evaluate(x=>x.decode());
  assert.ok(await img.evaluate(x=>x.naturalWidth>0),filename+' did not load');
  const dims=await page.evaluate(()=>({
   w:document.documentElement.clientWidth,
   scroll:document.documentElement.scrollWidth
  }));
  assert.ok(dims.scroll<=dims.w+2,'horizontal overflow on mobile');
 };
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  await page.locator('#gameOperationalDrill').click();
  await page.evaluate(key=>{
   const state=JSON.parse(localStorage.getItem(key));
   state.eventSeed='ops-combined-01';
   localStorage.setItem(key,JSON.stringify(state));
  },KEY);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#gameNext').click();
  for(let i=0;i<8;i++)await page.locator('#gameNext').click();
  await page.locator('#gameNext').click();
  // Day-2 Receiving stop: no hidden day-4 Quality illustration yet.
  assert.equal(await page.locator('img.nico-scene-portrait[src$="29_idea.png"]').count(),0);
  await page.getByRole('button',{name:'No intervenir',exact:true}).click();
  await page.getByRole('heading',{name:'Jornada 3 de 12'}).waitFor();
  await getAsset('14_presentar_informacion.png');
  assert.equal(await page.locator('img.nico-scene-portrait[src$="29_idea.png"]').count(),0);
  await page.locator('#gameNext').click();
  await page.getByRole('heading',{name:/Día 4 · Nuevo problema/}).waitFor();
  await getAsset('29_idea.png');
  await page.getByRole('button',{name:/Activar línea alternativa de Calidad/}).click();
  await page.getByRole('heading',{name:'Jornada 5 de 12'}).waitFor();
  await getAsset('17_explicar_impacto.png');
  const message=await page.locator('#gameScene').innerText();
  assert.match(message,/70.000/);
  await page.locator('#gameNext').click();
  await page.getByRole('heading',{name:'Jornada 6 de 12'}).waitFor();
  await getAsset('14_presentar_informacion.png');
  assert.deepEqual(failedImages,[]);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
