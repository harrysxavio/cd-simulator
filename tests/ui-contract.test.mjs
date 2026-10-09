import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('critical renderer dependencies must be explicitly imported',()=>{
 for(const [name,path] of [['laborAudit','labor.js'],['skuAudit','audit.js'],['attentionSignals','attention.js'],['recoveryComparison','recovery.js']]){
  assert.match(app,new RegExp('import\\s*\\{[^}]*\\b'+name+'\\b[^}]*\\}\\s*from\\s*[\\x27\\x22]\\./'+path.replace('.','\\.')+'\\?v=\\d+'));
 }
});
test('all navigation and control entrypoints remain wired',()=>{
 for(const id of ['setupTab','operationsTab','preliminaryTab','recoveryTab','dashboardTab','prev','next','reset','restartFinal','openReport','export','revealDemand','startRecovery','skipRecovery','beginExercise','resetScenario']){
  assert.match(app,new RegExp('\\$\\([\\x27\\x22]'+id+'[\\x27\\x22]\\)\\.onclick\\s*='));
  assert.match(html,new RegExp('id=[\\x27\\x22]'+id+'[\\x27\\x22]'));
 }
});
test('UI entrypoint cache version matches imported module versions',()=>{
 const version=html.match(/app[.]js[?]v=([0-9]+)/)?.[1];
 assert.ok(version,'versioned app module missing');
 const versions=[...app.matchAll(/from ['"][^'"]+[?]v=([0-9]+)['"]/g)].map(x=>x[1]);
 assert.ok(versions.length>=10);
 assert.ok(versions.every(x=>x===version),'stale imported module cache version');
});
test('render invokes all critical sections',()=>{
 for(const call of ['setup();','dashboard(r);','renderKpiLesson(r);','renderAttention();','renderLabor();','renderSkuLab();','renderDiagnosis(r);']){
  assert.ok(app.includes(call),'Missing render path: '+call);
 }
});

test('preliminary diagnosis reveals surprise before recovery',()=>{
 assert.match(app,/if\(name==='preliminary'&&!revealed\)revealSurprise\(\)/);
 assert.match(app,/function applyDemandOverride\(sign,percent\)/);
 assert.match(app,/scenario\.demandShockPercent=v;shockDirection=sign;revealed=true;actions=\{\}/);
 assert.match(html,/id="surpriseOverride"/);
 assert.match(app,/if\(!Number\.isFinite\(v\)\|\|!Number\.isInteger\(v\)\|\|v<0\|\|v>100\)/);
});

test('final mobile layout and purchasing lead-time control stay wired',()=>{
 const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
 assert.match(css,/#skuLab\.area-kpi-grid\{grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(app,/urgentArrivalDay:skuUrgentArrival/);
 assert.match(app,/\$\('restartFinal'\)\.onclick=restartCampaign/);
 assert.match(html,/id="restartFinal"/);
});
