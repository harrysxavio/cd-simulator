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
 const imports=[...app.matchAll(/from ['"]([^'"]+)[?]v=([0-9]+)['"]/g)].map(x=>({module:x[1],version:x[2]}));
 assert.ok(imports.length>=10,'expected versioned imports');
 const stale=imports.filter(x=>x.version!==version);
 assert.deepEqual(stale,[],'outdated imports relative to app.js?v='+version);
 const css=html.match(/styles[.]css[?]v=([0-9]+)/)?.[1];
 assert.equal(css,version,'stylesheet and app entrypoint must share release version');
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

test('each diagnosis area offers an actionable improvement with accessible label',()=>{
 assert.match(app,/const decisionRow=add\(item,'div','improvement-decision'\)/);
 assert.match(app,/actionButton\.setAttribute\('aria-label','Explorar mejora de '\+f\.title\)/);
 assert.match(app,/actionButton\.onclick=\(\)=>\{phase='recover';showSection\('recovery'\);nav\(NODES\.findIndex\(n=>n\.id===f\.id\)\)/);
 const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
 assert.match(css,/@media\(max-width:760px\)\{\.improvement-decision\{grid-template-columns:minmax\(0,1fr\)/);
});

test('SKU decisions persist across reload and restart resets them',()=>{
 for(const key of ['skuPolicy','skuSupplierDelay','skuRecovery','skuUrgentArrival']){
  assert.match(app,new RegExp('JSON\\.stringify\\(\\{[^}]*'+key));
  assert.match(app,new RegExp(key+'='));
 }
 assert.match(app,/skuUrgentArrival=\[1,2,5,10,13\]\.includes\(s\.skuUrgentArrival\)/);
 assert.match(app,/skuRecovery=Object\.hasOwn\(RECOVERY_OPTIONS,s\.skuRecovery\)/);
 assert.ok(app.includes("skuPolicy='balanced';skuSupplierDelay=false;skuRecovery='wait';skuUrgentArrival=1;skuPurchaseCoverage=100;skuDecisions=[];save()"));
});

test('the percentage of urgent SKU purchases persists, drives the comparison and resets',()=>{
 assert.match(app,/skuPurchaseCoverage=100/);
 assert.ok(app.includes('skuRecovery,skuUrgentArrival,skuPurchaseCoverage,skuDecisions}'));
 assert.match(app,/skuPurchaseCoverage=\[0,25,50,75,100\]\.includes\(s\.skuPurchaseCoverage\)/);
 assert.match(app,/purchaseCoveragePercent:skuPurchaseCoverage/);
 assert.match(app,/coverInput\.onchange=\(\)=>\{skuPurchaseCoverage=Number\(coverInput\.value\);save\(\);renderSkuLab\(\)\}/);
 assert.ok(app.includes("skuPurchaseCoverage=100;skuDecisions=[];save();showSection('operations')"));
});


test('single campaign contract supplies physical SKU capacities and limits',()=>{
 const adapter=readFileSync(new URL('../src/campaign-contract.js',import.meta.url),'utf8');
 assert.ok(app.includes("import {campaignSkuContract} from './campaign-contract.js?v="));
 assert.ok(app.includes('const contract=campaignSkuContract('));
 for(const key of ['receivingUnitCapacity:area.receivingCapacity','pickingUnitCapacity:area.pickingCapacity','transportUnitCapacity:area.stages[7].capacity']){
  assert.ok(adapter.includes(key),'Missing SKU capacity: '+key);
 }
 assert.ok(app.includes('const chain=supplyBridge({...contract.skuInputs'));
 assert.ok(app.includes('const audit=skuAudit({...contract.skuInputs'));
 assert.ok(app.includes('comparisonResult:recovery'));
});

test('supplier and quality constraints in campaign adapter drive SKU reports',()=>{
 const adapter=readFileSync(new URL('../src/campaign-contract.js',import.meta.url),'utf8');
 for(const key of ["supplierRate=area.ordered>0?","supplierFill:Object.fromEntries(SKU_CATALOG.map","qualityReleasePercent:Math.max(0,Math.min(100,numericValue('quality',decisions)"]){
  assert.ok(adapter.includes(key),'Missing sourcing constraint: '+key);
 }
 assert.ok(app.includes('Object.entries(day.released)'));
 assert.ok(app.includes('sku-supplementary'));
 const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
 assert.ok(css.includes('.sku-supplementary summary'));
});

test('commercial and planning decisions feed frozen SKU purchases through adapter',()=>{
 const adapter=readFileSync(new URL('../src/campaign-contract.js',import.meta.url),'utf8');
 for(const key of ['plannedForecastPercent:commercialForecast','planningCoveragePercent:planningCoverage',
  'commercialForecast=area.plannedDemand>0',"planningCoverage=Math.max(0,Math.min(150,numericValue('planning',decisions)"]){
  assert.ok(adapter.includes(key),'Missing upstream constraint: '+key);
 }
 assert.ok(app.includes('Manifiesto SKU comprometido'));
 assert.ok(app.includes('Object.values(e.receivedUrgent)'));
 assert.ok(app.includes('const integrated=recovery.integrated'));
});

test('campaign ID persists and restarting creates a new campaign',()=>{
 assert.ok(app.includes('schemaVersion:2,campaignId,currentSection,decisions'));
 assert.ok(app.includes('campaignId=createCampaignId();decisions='));
 assert.ok(app.includes('campaignId=typeof s.campaignId'));
});

test('restart and operation review are available from every stage, including revealed sessions',()=>{
 for(const id of ['resetAnytime','goToOperations','sessionStatus']){
  assert.ok(html.includes('id="'+id+'"'),'Missing global control '+id);
 }
 assert.ok(app.includes("$('resetAnytime').onclick=restartCampaign"));
 assert.ok(app.includes("$('goToOperations').onclick=()=>{showSection('operations')"));
 assert.ok(!app.includes("if(name==='operations'&&revealed){name='preliminary'}"),'Revealed plan must be viewable');
 assert.ok(app.includes("currentSection=name;"),'Current stage must persist');
 assert.ok(app.includes("load();showSection(currentSection);"),'Resume last stage');
 assert.ok(app.includes("revealed?'preliminary':'operations'"),'Legacy v11.13 stage fallback');
});

test('returning to operation after revealing surprise is read-only and cannot re-plan purchases',()=>{
 assert.ok(app.includes("const planFrozen=phase==='plan'&&revealed"));
 assert.ok(app.includes("b.disabled=planFrozen"));
 assert.ok(app.includes("input.disabled=planFrozen"));
 assert.ok(app.includes("if(planFrozen)return;"));
 assert.ok(app.includes("if(!revealed&&!decisions[NODES[active].id])"));
});

test('U2 recovery mission has distinct preview and confirmation with auditable SKU decision persistence',()=>{
 const source=readFileSync(new URL('../src/sku-decision.js',import.meta.url),'utf8');
 for(const id of ['skuRecoveryMission','skuRecoveryDecision','skuRecoveryHeading'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(app.includes('renderSkuRecoveryMission();'));
 assert.ok(app.includes("skuDecisions=[...skuDecisions,record].slice(-25)"));
 assert.ok(app.includes('const record=createSkuRecoveryDecision('));
 assert.ok(app.includes("confirm('¿Registrar esta decisión en la campaña SKU?"));
 assert.ok(app.includes('const currentSkuDecision=activeSkuDecision(contract)'));
 assert.ok(app.includes('coverInput.disabled=skuLocked'));
 assert.ok(app.includes('arrivalInput.disabled=skuLocked'));
 assert.ok(source.includes('campaignSnapshot({comparison,campaignId,plannedOrders:skuInputs.plannedOrders})'));
});
