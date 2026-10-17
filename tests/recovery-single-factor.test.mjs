import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveryBaseline} from '../src/recovery-baseline.js';
import {availableSingleFactorTrials,singleFactorCounterfactualReadModel} from '../src/recovery-single-factor.js';

const common={policy:'service',plannedOrders:200,actualOrders:260,days:12};
const zeroStock={A:0,B:0,C:0};
const run=(inputs,factor,targetValue)=>{
 const baseline=createRecoveryBaseline({...common,...inputs});
 const result=singleFactorCounterfactualReadModel({baselineSnapshot:baseline,factor,targetValue});
 return {baseline,result};
};

test('M6-29: one receiving change unblocks real PO flow without rewriting purchases or stock',()=>{
 const {baseline,result}=run({stock:zeroStock,receivingUnitCapacity:0},
  'receivingUnitCapacity',500);
 assert.equal(result.passed,true);
 assert.equal(result.type,'one-factor-sensitivity');
 assert.equal(result.beforeValue,0);
 assert.equal(result.afterValue,500);
 assert.deepEqual(result.changedFactors,['receivingUnitCapacity']);
 assert.equal(result.baseline.dispatched,0);
 assert.ok(result.alternative.dispatched>0);
 assert.ok(result.delta.dispatched>0);
 assert.equal(result.alternative.dispatched+result.alternative.pending,260);
 assert.equal(result.incrementalCostCLP,null,'unknown cost is not zero');
 assert.equal(result.uniqueRootCauseProven,false);
 assert.deepEqual(baseline.seed.stock,zeroStock);
 assert.ok(Object.values(result.checks).every(Boolean));
 assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.daily[0]));
 assert.throws(()=>{result.daily[0].afterPending=42},TypeError);
});

test('M6-29: each supported factor can be tested alone; staging distinguishes Transport',()=>{
 for(const [factor,inputs,value] of [
  ['qualityReleasePercent',{stock:zeroStock,qualityReleasePercent:0},100],
  ['inventoryAccuracyPercent',{inventoryAccuracyPercent:0},100],
  ['pickingUnitCapacity',{pickingUnitCapacity:0},500],
  ['transportUnitCapacity',{separateTransport:true,transportUnitCapacity:0},500],
  ['dailyCapacity',{dailyCapacity:0},200]
 ]){
  const {result}=run(inputs,factor,value);
  assert.equal(result.baseline.dispatched,0,factor);
  assert.ok(result.alternative.dispatched>0,factor);
  assert.equal(result.daily.length,13,factor);
  assert.equal(result.delta.pending,-result.delta.dispatched,factor);
  assert.equal(result.daily.at(-1).afterCumulative,result.alternative.dispatched,factor);
  assert.ok(result.daily.every(d=>d.beforePending+d.beforeCumulative===260&&
   d.afterPending+d.afterCumulative===260),factor);
 }
});

test('M6-29: a concurrent blocker can eliminate a benefit; never invent isolated root causes',()=>{
 const {result}=run({stock:zeroStock,receivingUnitCapacity:0,
  qualityReleasePercent:0},'receivingUnitCapacity',500);
 assert.equal(result.delta.dispatched,0);
 assert.equal(result.improvementObserved,false);
 assert.equal(result.uniqueRootCauseProven,false);
 assert.equal(result.alternative.pending,260);
});

test('M6-29: proposals omit unbounded and saturated parameters, without inventing physical caps',()=>{
 const baseline=createRecoveryBaseline(common);
 const options=availableSingleFactorTrials(baseline);
 assert.deepEqual(options.map(o=>o.factor),['dailyCapacity']);
 assert.equal(options[0].before,200);
 assert.equal(options[0].suggestedValue,240);
 const staged=createRecoveryBaseline({...common,separateTransport:true,
  receivingUnitCapacity:0,transportUnitCapacity:0,inventoryAccuracyPercent:80});
 assert.deepEqual(availableSingleFactorTrials(staged).map(o=>o.factor),[
  'receivingUnitCapacity','inventoryAccuracyPercent','transportUnitCapacity','dailyCapacity'
 ]);
 assert.equal(availableSingleFactorTrials(staged).find(x=>x.factor==='inventoryAccuracyPercent').suggestedValue,100);
 assert.ok(Object.isFrozen(options));
});

test('M6-29: invalid or mixed-factor requests are rejected',()=>{
 const baseline=createRecoveryBaseline({...common,receivingUnitCapacity:0});
 const read=(factor,targetValue,source=baseline)=>singleFactorCounterfactualReadModel({
  baselineSnapshot:source,factor,targetValue
 });
 assert.throws(()=>read('qualityReleasePercent',100),/Contrafactual SKU/);
 assert.throws(()=>read('receivingUnitCapacity',0),/Contrafactual SKU/);
 assert.throws(()=>read('receivingUnitCapacity',-5),/Contrafactual SKU/);
 assert.throws(()=>read('receivingUnitCapacity',100001),/Contrafactual SKU/);
 assert.throws(()=>read('receivingUnitCapacity',1.2),/Contrafactual SKU/);
 assert.throws(()=>read('transportUnitCapacity',10),/Contrafactual SKU/);
 assert.throws(()=>read('receivingUnitCapacity',10,{...baseline,scenarioKey:'alterado'}),/Baseline SKU/);
});

test('M6-29: repeated trial is deterministic and does not modify the existing baseline',()=>{
 const base=createRecoveryBaseline({...common,receivingUnitCapacity:0,stock:zeroStock});
 const before=JSON.stringify(base.integrated.actual.ledger);
 const input={baselineSnapshot:base,factor:'receivingUnitCapacity',targetValue:150};
 const a=singleFactorCounterfactualReadModel(input),b=singleFactorCounterfactualReadModel(input);
 assert.deepEqual(a,b);
 assert.equal(JSON.stringify(base.integrated.actual.ledger),before);
 assert.equal(a.baselineKey,base.scenarioKey);
 assert.equal(base.integrated.actual.completed,0);
});
