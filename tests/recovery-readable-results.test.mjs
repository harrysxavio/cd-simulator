import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveryBaseline} from '../src/recovery-baseline.js';
import {recoveryComparison} from '../src/recovery.js';
import {consolidatedRecoveryComparisonReadModel} from '../src/recovery-consolidated.js';
import {readableRecoveryResultsReadModel} from '../src/recovery-readable-results.js';
const opts=['wait','reserve','overtime','emergency','combined'];
const setup=(patch={},selectedOption='combined')=>{
 const inputs={policy:'service',plannedOrders:200,actualOrders:280,days:12,
  plannedForecastPercent:80,planningCoveragePercent:70,reservePercent:20,...patch};
 const baseline=createRecoveryBaseline(inputs);
 const comparisons=opts.map(option=>recoveryComparison({...inputs,option,
  urgentArrivalDay:2,purchaseCoveragePercent:100,baselineSnapshot:baseline}));
 const summary=consolidatedRecoveryComparisonReadModel({comparisons,selectedOption});
 return {baseline,summary};
};

test('M7-36: the same five SKU scenarios reconcile for BOTH readable views',()=>{
 const {baseline,summary}=setup();const original=JSON.stringify(baseline);
 for(const view of ['service','commitments']){
  const x=readableRecoveryResultsReadModel({comparison:summary,view});
  assert.equal(x.passed,true);assert.equal(x.scope,'sku-cohort');
  assert.equal(x.baselineKey,baseline.scenarioKey);
  assert.equal(x.orders,280);assert.equal(x.dayCount,13);
  assert.equal(x.rows.length,5);assert.equal(x.selectedOption,'combined');
  assert.deepEqual(x.rows.map(r=>r.option),opts);
  assert.ok(x.rows.every(r=>r.dispatched+r.pending===280));
  assert.equal(x.rows.filter(r=>r.selected).length,1);
  assert.ok(Object.values(x.checks).every(Boolean));
  assert.equal(x.noFullCostKnown,true);
  assert.ok(Object.isFrozen(x)&&Object.isFrozen(x.rows[0]));
  assert.throws(()=>{x.rows[0].pending=9},TypeError);
 }
 assert.equal(JSON.stringify(baseline),original);
});

test('M7-36: reserve is always visibly unpriced, even if a proxy says CLP 0',()=>{
 for(const view of ['service','commitments']){
  const {summary}=setup({},'reserve'),x=readableRecoveryResultsReadModel({comparison:summary,view});
  const reserve=x.rows.find(r=>r.option==='reserve');
  assert.equal(reserve.selected,true);
  assert.equal(reserve.costStatus,'unknown-reserve-transfer');
  assert.equal(reserve.visibleCommitmentCLP,null);
  assert.equal(reserve.totalIncrementalCostCLP,null);
  assert.equal(x.rows.find(r=>r.option==='wait').costStatus,'no-new-modeled-action');
  assert.match(x.explanation,view==='commitments'?/no CLP 0/:/no demuestra entrega/);
 }
});

test('M7-36: no fake financial ranking; baseline and selected values stay physical',()=>{
 const {summary}=setup({stock:{A:0,B:0,C:0},
  receivingUnitCapacity:0,qualityReleasePercent:0},'emergency');
 const x=readableRecoveryResultsReadModel({comparison:summary,view:'commitments'});
 const selected=x.rows.find(r=>r.selected);
 assert.equal(selected.dispatched,summary.selected.shippedOrders);
 assert.equal(selected.pending,summary.selected.pendingOrders);
 assert.equal(x.baseline.dispatched,summary.baseline.completed);
 assert.equal(selected.totalIncrementalCostCLP,null);
 assert.ok(!Object.hasOwn(x,'economicWinner'));
 assert.ok(!Object.hasOwn(x,'recommended'));
});

test('M7-36: malformed scenarios, duplicated options, cost components or unknown view fail closed',()=>{
 const {summary}=setup();
 const bad=s=>assert.throws(()=>readableRecoveryResultsReadModel({comparison:s}),
  /Comparación legible SKU/);
 bad({...summary,passed:false});
 bad({...summary,checks:{...summary.checks,frozenBaseline:false}});
 bad({...summary,alternatives:summary.alternatives.slice(0,4)});
 bad({...summary,alternatives:summary.alternatives.map(a=>
  a.option==='combined'?{...a,pendingOrders:a.pendingOrders+1}:a)});
 bad({...summary,alternatives:summary.alternatives.map(a=>
  a.option==='emergency'?{...a,urgentSurchargeCLP:-1}:a)});
 bad({...summary,alternatives:summary.alternatives.map(a=>
  a.option==='combined'?{...a,option:'reserve'}:a)});
 assert.throws(()=>readableRecoveryResultsReadModel({comparison:summary,view:'profit'}),
  /Comparación legible SKU/);
});
