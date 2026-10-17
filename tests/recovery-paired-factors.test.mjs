import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveryBaseline} from '../src/recovery-baseline.js';
import {availablePairedFactorTrials,pairedCounterfactualReadModel} from '../src/recovery-paired-factors.js';

const defaults={policy:'service',plannedOrders:200,actualOrders:260,days:12};
const noStock={A:0,B:0,C:0};
const evaluate=(params,first,second,a,b)=>{
 const baseline=createRecoveryBaseline({...defaults,...params});
 const result=pairedCounterfactualReadModel({
  baselineSnapshot:baseline,factorA:first,factorB:second,targetA:a,targetB:b
 });
 return {baseline,result};
};

test('M6-30: Receiving + Quality together unblock physical stock despite zero isolated effects',()=>{
 const {baseline,result}=evaluate({
  stock:noStock,receivingUnitCapacity:0,qualityReleasePercent:0
 },'receivingUnitCapacity','qualityReleasePercent',500,100);
 assert.equal(result.passed,true);
 assert.equal(result.baseline.dispatched,0);
 assert.equal(result.onlyA.deltaDispatched,0);
 assert.equal(result.onlyB.deltaDispatched,0);
 assert.ok(result.joint.deltaDispatched>0);
 assert.equal(result.interactionOrders,result.joint.deltaDispatched);
 assert.equal(result.nonAdditive,true);
 assert.equal(result.additivePredictionDelta,0);
 assert.equal(result.joint.dispatched+result.joint.pending,260);
 assert.equal(result.incrementalCostCLP,null);
 assert.equal(result.uniqueRootCauseProven,false);
 assert.ok(Object.values(result.checks).every(Boolean));
 assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.daily[0]));
 assert.throws(()=>{result.daily[0].jointCompleted=999},TypeError);
 assert.deepEqual(baseline.seed.stock,noStock);
});

test('M6-30: Picking and Transport are serial constraints only with staging enabled',()=>{
 const {result}=evaluate({
  separateTransport:true,stock:{A:1000,B:1000,C:1000},
  pickingUnitCapacity:0,transportUnitCapacity:0
 },'pickingUnitCapacity','transportUnitCapacity',1000,1000);
 assert.equal(result.onlyA.deltaDispatched,0);
 assert.equal(result.onlyB.deltaDispatched,0);
 assert.ok(result.joint.deltaDispatched>0);
 assert.ok(result.daily.some(day=>day.jointShipped>0));
 assert.ok(result.daily.every(d=>d.baselineCompleted<=260&&d.jointCompleted<=260));
});

test('M6-30: four alternatives reconcile daily cumulative orders with no synthetic additive orders',()=>{
 const {result}=evaluate({
  receivingUnitCapacity:100,qualityReleasePercent:80,
  stock:{A:200,B:100,C:60}
 },'receivingUnitCapacity','qualityReleasePercent',600,100);
 assert.equal(result.daily.length,13);
 assert.equal(result.daily.at(-1).baselineCompleted,result.baseline.dispatched);
 assert.equal(result.daily.at(-1).onlyACompleted,result.onlyA.dispatched);
 assert.equal(result.daily.at(-1).onlyBCompleted,result.onlyB.dispatched);
 assert.equal(result.daily.at(-1).jointCompleted,result.joint.dispatched);
 assert.equal(result.interactionOrders,
  result.joint.deltaDispatched-result.onlyA.deltaDispatched-result.onlyB.deltaDispatched);
 assert.ok(result.daily.every(d=>d.baselineCompleted+d.baselinePending===260&&
   d.jointCompleted+d.jointPending===260));
 assert.equal(result.daily.reduce((n,d)=>n+d.jointShipped,0),result.joint.dispatched);
 assert.equal(result.incrementalCostCLP,null);
});

test('M6-30: no fabricated independent Transport in coupled mode',()=>{
 const baseline=createRecoveryBaseline({...defaults,
  receivingUnitCapacity:100,qualityReleasePercent:80,transportUnitCapacity:0});
 assert.ok(!availablePairedFactorTrials(baseline).some(x=>x.factor==='transportUnitCapacity'));
 assert.throws(()=>pairedCounterfactualReadModel({
  baselineSnapshot:baseline,factorA:'receivingUnitCapacity',factorB:'transportUnitCapacity',
  targetA:200,targetB:300
 }),/Contrafactual conjunto SKU/);
});

test('M6-30: rejects duplication, invalid limits and modified baseline',()=>{
 const baseline=createRecoveryBaseline({...defaults,stock:noStock,
  receivingUnitCapacity:0,qualityReleasePercent:0});
 const run=(patch={})=>pairedCounterfactualReadModel({
  baselineSnapshot:baseline,factorA:'receivingUnitCapacity',
  factorB:'qualityReleasePercent',targetA:500,targetB:100,...patch
 });
 for(const patch of [
  {factorB:'receivingUnitCapacity'},
  {factorA:'not-a-factor'},
  {factorB:'inventoryAccuracyPercent'},
  {targetA:0},{targetA:-1},{targetA:100001},{targetA:1.5},{targetB:101},
  {baselineSnapshot:{...baseline,scenarioKey:'false'}}
 ])assert.throws(()=>run(patch),/(Contrafactual SKU|Contrafactual conjunto SKU|Baseline SKU)/);
});

test('M6-30: deterministic repeated replay cannot alter baseline or original PO',()=>{
 const baseline=createRecoveryBaseline({...defaults,stock:noStock,
  receivingUnitCapacity:0,qualityReleasePercent:0});
 const original=JSON.stringify(baseline);
 const input={baselineSnapshot:baseline,factorA:'receivingUnitCapacity',
  factorB:'qualityReleasePercent',targetA:500,targetB:100};
 const a=pairedCounterfactualReadModel(input),b=pairedCounterfactualReadModel(input);
 assert.deepEqual(a,b);
 assert.equal(JSON.stringify(baseline),original);
 assert.equal(a.baselineKey,baseline.scenarioKey);
 assert.equal(baseline.integrated.actual.completed,0);
});
