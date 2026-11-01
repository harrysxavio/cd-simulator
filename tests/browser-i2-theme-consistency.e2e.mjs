import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium,devices} from 'playwright';

const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:8000';
const KEY='supply-lab-i2-v1';
const stylesheet=readFileSync(new URL('../juego/styles.css',import.meta.url),'utf8');

/** Catch regressions where dark game panels accidentally use light/blue colors. */
test('I2-36 theme contract: dark panels, orange accent, no light fallback in incident CSS',()=>{
 assert.match(stylesheet,/--primary:#f97316/);
 assert.match(stylesheet,/--panel:#172438/);
 const incident=stylesheet.slice(stylesheet.indexOf('/* I2-35.5c · Sorpresa'));
 assert.ok(incident.length>1000);
 assert.doesNotMatch(incident,/var\(--(?:surface|line|muted-surface)\b/);
 assert.doesNotMatch(incident,/#(?:fff|f8fafc|e2e8f0|2563eb|b45309)\b/i);
 for(const required of [
  '.i2-operational-drill-card','.i2-incident-outcome',
  '.i2-incident-event','.i2-incident-choice',
  '.i2-incident-first-commitment','.i2-two-decision-summary',
  '.i2-daily-incidents','.i2-operational-drill-button'
 ])assert.ok(incident.includes(required),required+' lacks theme ownership');
});

/** Validate the actual rendered CSS in Chromium, not just a source grep. */
for(const width of [360,412]){
 test('I2-36 theme: Pixel 7 dark orange panels through incident and daily journey at '+width+'px',
  {timeout:120000},async()=>{
   const browser=await chromium.launch({headless:true,
    executablePath:process.env.E2E_CHROMIUM_PATH||undefined});
   const context=await browser.newContext({
    ...devices['Pixel 7'],viewport:{width,height:780}
   });
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   const inspect=async selectors=>page.evaluate(selectors=>{
    const root=getComputedStyle(document.documentElement);
    const convert=name=>{
     const h=root.getPropertyValue(name).trim().slice(1);
     return 'rgb('+[0,2,4].map(p=>parseInt(h.slice(p,p+2),16)).join(', ')+')';
    };
    return {
     panel:convert('--panel'),detail:convert('--detail-bg'),
     border:convert('--border'),orange:convert('--primary'),
     selected:convert('--choice-selected-bg'),
     values:selectors.map(sel=>{
      const el=document.querySelector(sel);
      if(!el)return {selector:sel,missing:true};
      const cs=getComputedStyle(el);
      return {selector:sel,bg:cs.backgroundColor,color:cs.color,
       border:cs.borderTopColor,accent:cs.borderLeftColor};
     }),
     scrollWidth:document.documentElement.scrollWidth,
     viewport:document.documentElement.clientWidth
    };
   },selectors);
   const assertPanel=(snapshot,sel,bg='panel')=>{
    const x=snapshot.values.find(z=>z.selector===sel);
    assert.ok(x&&!x.missing,'not visible: '+sel);
    assert.equal(x.bg,snapshot[bg],sel+' background');
    assert.notEqual(x.bg,'rgb(255, 255, 255)');
    assert.ok(snapshot.scrollWidth<=snapshot.viewport+2,'unexpected horizontal scroll');
   };
   try{
    await page.goto(BASE+'/juego/',{waitUntil:'networkidle'});
    let snap=await inspect(['.i2-operational-drill-card','.i2-operational-drill-button']);
    assertPanel(snap,'.i2-operational-drill-card');
    const control=snap.values.find(x=>x.selector==='.i2-operational-drill-button');
    assert.equal(control.bg,snap.selected);
    assert.equal(control.border,snap.orange);

    await page.locator('#gameOperationalDrill').click();
    await page.evaluate(key=>{
     const state=JSON.parse(localStorage.getItem(key));
     state.eventSeed='ops-combined-01';
     localStorage.setItem(key,JSON.stringify(state));
    },KEY);
    await page.reload({waitUntil:'networkidle'});
    await page.locator('#gameNext').click();
    for(let n=0;n<8;n++)await page.locator('#gameNext').click();
    await page.locator('#gameNext').click();
    snap=await inspect(['.i2-incident-choice']);
    assertPanel(snap,'.i2-incident-choice');
    await page.getByRole('button',{name:'No intervenir',exact:true}).click();
    await page.getByRole('heading',{name:'Jornada 3 de 12'}).waitFor();
    await page.locator('#gameNext').click();
    await page.getByRole('heading',{name:/Día 4 · Nuevo problema/}).waitFor();
    snap=await inspect(['.i2-incident-first-commitment','.i2-incident-choice']);
    assertPanel(snap,'.i2-incident-first-commitment');
    assertPanel(snap,'.i2-incident-choice');
    await page.getByRole('button',{name:/Mantener decisiones · sin nuevo gasto/}).click();
    await page.getByRole('heading',{name:'Jornada 5 de 12'}).waitFor();
    snap=await inspect(['.i2-daily-incidents']);
    assertPanel(snap,'.i2-daily-incidents');
    const incident=snap.values[0];
    assert.equal(incident.accent,snap.orange,'daily incident accent must match game theme');
    for(let d=5;d<=12;d++)await page.locator('#gameNext').click();
    snap=await inspect(['.i2-incident-outcome','.i2-incident-event',
     '.i2-two-decision-summary']);
    assertPanel(snap,'.i2-incident-outcome');
    assertPanel(snap,'.i2-incident-event','detail');
    assertPanel(snap,'.i2-two-decision-summary');
    const summary=snap.values.find(x=>x.selector==='.i2-two-decision-summary');
    assert.equal(summary.accent,snap.orange,'decision summary must not be blue');
    assert.deepEqual(errors,[]);
   }finally{await context.close();await browser.close()}
 });
}
