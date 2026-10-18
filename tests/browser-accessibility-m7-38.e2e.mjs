import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
async function verify(mobile){
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
 const context=await browser.newContext(mobile?{...devices['Pixel 7']}:
  {viewport:{width:1220,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)
  errors.push('HTTP '+r.status())});
 const active=()=>page.evaluate(()=>document.activeElement?.id);
 try{
  await page.goto(BASE+'/?m7-38='+(mobile?'mobile':'desktop'),{waitUntil:'networkidle'});
  const top=page.getByRole('tablist',{name:'Etapas del ejercicio'});
  assert.equal(await top.count(),1);
  assert.equal(await top.getByRole('tab').count(),4);
  assert.equal(await page.locator('#operationsTab').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#preliminaryTab').getAttribute('tabindex'),'-1');
  assert.equal(await page.getByRole('tabpanel',{name:/Operación/}).count(),1);
  // Skip link is invisible without focus, but first keyboard stop.
  const skip=page.locator('.skip-to-main');
  await skip.focus();
  assert.equal(await skip.isVisible(),true);
  await page.keyboard.press('Enter');
  assert.equal(new URL(page.url()).hash,'#mainContent');
  // Recreated area map must restore focus and expose a human-readable label.
  const map=page.locator('#roadmap button.node');
  assert.equal(await map.count(),8);
  assert.match(await map.nth(2).getAttribute('aria-label'),/Área 3 de 8/);
  assert.equal(await map.nth(2).locator('.node-icon').getAttribute('aria-hidden'),'true');
  await map.nth(2).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#roadmap button.node').nth(2).getAttribute('aria-current'),'step');
  assert.match(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),/Área 3 de 8/);
  // Select using keyboard: rerender must not send focus to document.body.
  const choices=page.locator('#choices button.choice');
  assert.ok(await choices.count()>=2);
  await choices.nth(1).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('choice')),true);
  assert.equal(await page.locator('#choices button.choice').nth(1).getAttribute('aria-pressed'),'true');
  // Main semantic tabs support Arrow navigation and update the active panel.
  await page.locator('#operationsTab').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await active(),'preliminaryTab');
  assert.equal(await page.locator('#preliminaryTab').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#operationsSection').getAttribute('hidden'),'');
  assert.equal(await page.locator('#preliminarySection').isVisible(),true);
  await page.keyboard.press('ArrowRight');
  assert.equal(await active(),'recoveryTab');
  await page.keyboard.press('End');
  assert.equal(await active(),'dashboardTab');
  assert.equal(await page.locator('#dashboardSection').isVisible(),true);
  // Nested tablist connects tab <=> panel; inactive panels truly hidden.
  const result=page.getByRole('tablist',{name:'Explorar resultados'});
  assert.equal(await result.getByRole('tab').count(),5);
  await page.locator('#resultTabOverview').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await active(),'resultTabAreas');
  assert.equal(await page.locator('#resultTabAreas').getAttribute('aria-controls'),'resultPanelAreas');
  assert.equal(await page.locator('#resultPanelAreas').getAttribute('aria-labelledby'),'resultTabAreas');
  assert.equal(await page.locator('#resultPanelOverview').getAttribute('hidden'),'');
  assert.equal(await page.locator('#resultPanelAreas').getAttribute('hidden'),null);
  await page.keyboard.press('End');
  assert.equal(await active(),'resultTabImprovement');
  await page.keyboard.press('Home');
  assert.equal(await active(),'resultTabOverview');
  assert.equal(await page.locator('#resultTabOverview').getAttribute('tabindex'),'0');
  assert.equal(await page.locator('#resultTabAreas').getAttribute('tabindex'),'-1');
  await page.locator('#setupTab').click();
  assert.equal(await page.locator('#setupTab').getAttribute('aria-current'),'page');
  assert.equal(await page.locator('#operationsTab').getAttribute('tabindex'),'0',
   'Main navigation remains reachable in configuration mode');
  await page.locator('#dashboardTab').click();
  // No keyboard-only implementation: same controls require 44px+ touch targets.
  if(mobile)for(const width of [360,412]){
   await page.setViewportSize({width,height:820});
   const selectors=['.section-tabs [role="tab"]','.result-tabs [role="tab"]',
    '#firstGuideToggle','#resetAnytime'];
   for(const selector of selectors){
    const touch=await page.locator(selector).evaluateAll(nodes=>nodes.map(n=>{
     const r=n.getBoundingClientRect();return {width:r.width,height:r.height};
    }));
    assert.ok(touch.length&&touch.every(r=>r.height>=44&&r.width>=36),
     'Small touch target '+selector+' at '+width+': '+JSON.stringify(touch));
   }
   // WCAG AA normal text contrast (4.5:1), computed from the actual UI.
   const colors=await page.locator('.section-tabs [role="tab"],.result-tabs [role="tab"]')
    .evaluateAll(nodes=>nodes.map(n=>{
     const st=getComputedStyle(n);
     const rgb=text=>(text.match(/[0-9.]+/g)||[]).slice(0,3).map(Number);
     const linear=v=>{
      const c=v/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);
     };
     const lum=values=>values.reduce((sum,value,i)=>sum+linear(value)*[.2126,.7152,.0722][i],0);
     const a=lum(rgb(st.color)),b=lum(rgb(st.backgroundColor));
     return {text:n.textContent,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
    }));
   assert.ok(colors.every(x=>x.ratio>=4.5),
    'Normal text contrast below WCAG AA: '+JSON.stringify({width,colors}));
   const geometry=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
   }));
   assert.ok(geometry.scroll<=geometry.width+2,
    'Horizontal overflow '+JSON.stringify({width,geometry}));
  }
  assert.deepEqual(errors,[]);
 }catch(e){
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/m7-38-'+(mobile?'phone':'desktop')+'.png',
   fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();await browser.close()}
}
test('M7-38 Android keyboard and touch: semantic tablists, roving focus, 360/412px',
 {timeout:150000},()=>verify(true));
test('M7-38 desktop: skip link, focus preservation and panel accessibility',
 {timeout:150000},()=>verify(false));
