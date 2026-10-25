import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const IMG='/juego/assets/nico/';

test('Nico original: arte aprobado visible, guía amable optativa y ocho áreas sin spoilers',
 {timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:360,height:760}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 page.on('response',r=>{
  if(r.url().startsWith(BASE+IMG)&&r.status()!==200)
   errors.push('Imagen Nico: HTTP '+r.status()+' '+r.url());
 });
 try{
  await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
  const portrait=page.locator('.nico-avatar img');
  assert.equal(await portrait.getAttribute('src'),'./assets/nico/personaje/nico_chibi_cuerpo_completo.png');
  await portrait.evaluate(img=>img.decode());
  assert.equal(await portrait.evaluate(img=>img.naturalWidth>500&&img.naturalHeight>500),true);
  assert.equal(await page.locator('.mentor-toggle').getAttribute('aria-expanded'),'false');
  await page.evaluate(()=>localStorage.setItem('supply-lab-v90','legacy-preserved'));
  const before=await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1'));
  await page.locator('.mentor-toggle').click();
  assert.match(await page.locator('.mentor-response').innerText(),/Soy Nico|¡Hola!/);
  assert.match(await page.locator('.mentor-response').innerText(),/Por ejemplo:/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-i2-v1')),before);
  await page.locator('#gameNext').click();
  await page.getByRole('tab',{name:'Nico'}).click();
  const response=page.locator('#gameGuideText');
  assert.match(await response.innerText(),/Empecemos por una pregunta sencilla/);
  assert.match(await response.innerText(),/Por ejemplo:/);
  assert.match(await response.innerText(),/información de la campaña/);
  assert.doesNotMatch(await response.innerText(),/280 pedidos|demanda observada 280/);
  const face=page.locator('.mentor-response img');
  assert.equal(await face.getAttribute('src'),'./assets/nico/expresiones/individual/04_duda.png');
  await face.evaluate(img=>img.decode());
  assert.ok(await face.evaluate(img=>img.naturalWidth>100));
  assert.equal(await page.evaluate(()=>localStorage.getItem('supply-lab-v90')),'legacy-preserved');
  const start=await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-i2-v1')));
  assert.equal(start.reveal,false);
  await page.getByRole('tab',{name:'Decisión'}).click();
  await page.locator('#gameNext').click();
  await page.getByRole('tab',{name:'Nico'}).click();
  assert.match(await page.locator('#gameGuideText').innerText(),/faltan 10 unidades/);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('supply-lab-i2-v1')).reveal),false);
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close()}
});
