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
 for(const id of ['setupTab','operationsTab','preliminaryTab','recoveryTab','dashboardTab','prev','next','reset','openReport','export','revealDemand','startRecovery','skipRecovery','beginExercise','resetScenario']){
  assert.match(app,new RegExp('\\$\\([\\x27\\x22]'+id+'[\\x27\\x22]\\)\\.onclick\\s*='));
  assert.match(html,new RegExp('id=[\\x27\\x22]'+id+'[\\x27\\x22]'));
 }
});
test('UI entrypoint cache version matches imported module versions',()=>{
 const version=html.match(/src\\/app\\.js\\?v=(\\d+)/)?.[1];
 assert.ok(version,'versioned app module missing');
 const versions=[...app.matchAll(/from ['"][^'"]+\\?v=(\\d+)['"]/g)].map(x=>x[1]);
 assert.ok(versions.length>=10);
 assert.ok(versions.every(x=>x===version),'stale imported module cache version');
});
test('render invokes all critical sections',()=>{
 for(const call of ['setup();','dashboard(r);','renderKpiLesson(r);','renderAttention();','renderLabor();','renderSkuLab();','renderDiagnosis(r);']){
  assert.ok(app.includes(call),'Missing render path: '+call);
 }
});
