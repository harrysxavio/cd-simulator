import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {createRecoveryBaseline,recoveryBaselineKey,assertRecoveryBaseline} from '../src/recovery-baseline.js';
import {createSkuSessionCache} from '../src/sku-session.js';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {campaignSnapshot} from '../src/campaign.js';

const scenario={
 policy:'service',plannedOrders:200,actualOrders:280,
 plannedForecastPercent:80,planningCoveragePercent:70,
 supplierFill:{A:80,B:90,C:70},delayDays:{A:4,B:1},
 receivingUnitCapacity:30,qualityReleasePercent:65,
 inventoryAccuracyPercent:90,days:12,reservePercent:20
};
const options=['wait','reserve','overtime','emergency','combined'];
const select=(baseline,choice,params={})=>recoveryComparison({
 ...scenario,option:choice,urgentArrivalDay:2,purchaseCoveragePercent:50,
 baselineSnapshot:baseline,...params
});

test('M5-20: five choices share one object with exactly the same original purchases, orders, SKU stock and physical baseline',()=>{
 const baseline=createRecoveryBaseline(scenario);
 const comparisons=options.map(choice=>select(baseline,choice));
 assert.equal(baseline.stage,'before-recovery');
 assert.equal(baseline.scope,'sku-cohort');
 assert.equal(baseline.version,1);
 assert.equal(baseline.plannedOrders,200);
 assert.equal(baseline.actualOrders,280);
 assert.equal(baseline.days,12);
 assert.equal(baseline.openingState.totals.physicalSkuUnits,
  baseline.openingState.totals.pickFaceSkuUnits+baseline.openingState.totals.reserveSkuUnits);
 assert.equal(assertRecoveryBaseline(baseline,scenario),baseline);
 for(const comparison of comparisons){
  assert.equal(comparison.baselineSnapshot,baseline);
  assert.equal(comparison.integrated,baseline.integrated);
  assert.equal(comparison.base,baseline.integrated.actual);
  assert.equal(comparison.integrated.planned,comparisons[0].integrated.planned);
  assert.equal(comparison.integrated.actual,comparisons[0].integrated.actual);
  assert.equal(comparison.openingState,baseline.openingState);
  assert.equal(comparison.originalPurchaseOrders,baseline.integrated.originalPurchaseOrders);
  assert.deepEqual(comparison.originalPurchase,baseline.integrated.purchase);
  assert.deepEqual(comparison.base.ordersDetail,comparisons[0].base.ordersDetail);
  assert.equal(comparison.baselineKey,baseline.scenarioKey);
  assert.deepEqual(comparison.openingState.openingBySku,comparison.recovered.initial);
  assert.ok(Object.isFrozen(comparison.baselineSnapshot));
  assert.ok(Object.isFrozen(comparison.baselineSnapshot.integrated.actual));
  assert.ok(Object.isFrozen(comparison.baselineSnapshot.integrated.actual.ledger[0]));
 }
 assert.throws(()=>{baseline.integrated.actual.ledger[0].shipped=1000000},TypeError);
 assert.throws(()=>{baseline.integrated.originalPurchaseOrders.rows[0].orderedQty=500},TypeError);
 assert.throws(()=>{baseline.openingState.openingBySku.A=0},TypeError);
});

test('M5-20: selected recovery and its original event book still reconcile with canonical SKU inventory/economic audit',()=>{
 const baseline=createRecoveryBaseline(scenario);
 for(const option of options){
  const r=select(baseline,option);
  const campaign=campaignSnapshot({comparison:r,campaignId:'M5-20-'+option,plannedOrders:200});
  assert.equal(campaign.passed,true,JSON.stringify({option,checks:campaign.checks}));
  assert.ok(campaign.economicAudit.passed);
  assert.equal(campaign.plan.originalPurchaseOrders,baseline.integrated.originalPurchaseOrders.rows);
  assert.equal(campaign.inventoryLedger.totals.openingSkuUnits,
   baseline.openingState.totals.physicalSkuUnits);
  assert.equal(campaign.shipments.length,r.recovered.completed);
 }
});

test('M5-20: intervention-only amounts and modes never alter the baseline seed or its original stock and purchases',()=>{
 const baseline=createRecoveryBaseline(scenario);
 for(const option of options){
  const r=select(baseline,option,{
   unitRevenue:15500,emergencySurchargeRate:0.5,
   latePenaltyPerOrderDay:1000,holdingRatePerDay:0,
   extraCapacityDailyCost:135000,
   urgentArrivalDay:13,purchaseCoveragePercent:10,
   separateTransport:true
  });
  assert.equal(r.baselineSnapshot,baseline);
  assert.equal(r.base,baseline.integrated.actual);
  assert.equal(r.originalPurchaseOrders,baseline.integrated.originalPurchaseOrders);
  assert.ok(r.recovered.ledger[0].received!==undefined);
  assert.equal(r.urgent.every(x=>x.day===13),true);
 }
 const renamed={...scenario,
  delayDays:{B:1,A:4},supplierFill:{C:70,A:80,B:90},
  stock:undefined};
 assert.equal(recoveryBaselineKey(renamed),recoveryBaselineKey(scenario));
 assert.equal(createRecoveryBaseline(renamed).scenarioKey,baseline.scenarioKey);
});

test('M5-20: changing a real baseline premise invalidates any former shared seed and rejects reuse',()=>{
 const baseline=createRecoveryBaseline(scenario);
 const variants=[
  {...scenario,actualOrders:281},
  {...scenario,plannedOrders:201},
  {...scenario,policy:'lean'},
  {...scenario,plannedForecastPercent:85},
  {...scenario,planningCoveragePercent:40},
  {...scenario,supplierFill:{...scenario.supplierFill,A:10}},
  {...scenario,delayDays:{...scenario.delayDays,A:9}},
  {...scenario,stock:{A:149,B:90,C:55}},
  {...scenario,reservePercent:0},
  {...scenario,qualityReleasePercent:15},
  {...scenario,inventoryAccuracyPercent:40},
  {...scenario,receivingUnitCapacity:0},
  {...scenario,pickingUnitCapacity:0},
  {...scenario,transportUnitCapacity:2},
  {...scenario,days:5}
 ];
 for(const changed of variants){
  assert.notEqual(recoveryBaselineKey(changed),baseline.scenarioKey);
  assert.throws(()=>recoveryComparison({...changed,
   option:'emergency',baselineSnapshot:baseline}),/Baseline SKU/);
 }
 assert.equal(recoveryBaselineKey({...scenario,option:'combined',urgentArrivalDay:8}),baseline.scenarioKey);
 const unfrozen={...baseline};
 assert.throws(()=>recoveryComparison({...scenario,baselineSnapshot:unfrozen}),/Baseline SKU/);
 const invalid={...baseline,scenarioKey:'altered'};
 Object.freeze(invalid);
 assert.throws(()=>recoveryComparison({...scenario,baselineSnapshot:invalid}),/Baseline SKU/);
});

test('M5-20: one cache session computes original/actual baseline only once, regardless of five choices and arrival or coverage adjustments',()=>{
 const contract=campaignSkuContract({
  campaignId:'M5-BASELINE-CACHE',policy:'service',plannedSampleOrders:200,
  decisions:{commercial:'under',planning:'partial',purchasing:'reliable'},
  scenario:{demand:1000,actualDemand:1400,lockUpstream:true}
 });
 let builds=0,replays=0;
 const cache=createSkuSessionCache({
  baselineBuilder:p=>{builds++;return createRecoveryBaseline(p)},
  replay:p=>{replays++;return recoveryComparison(p)}
 });
 const optionsFor=(option,day=2,coverage=50)=>({
  contract,skuInputs:contract.skuInputs,option,
  urgentArrivalDay:day,purchaseCoveragePercent:coverage
 });
 const trials=options.map(o=>cache.getComparison(optionsFor(o)));
 const fixed=trials[0].baselineSnapshot;
 assert.equal(builds,1);
 assert.equal(replays,5);
 assert.ok(trials.every(x=>x.baselineSnapshot===fixed&&x.base===fixed.integrated.actual));
 assert.equal(cache.getComparison(optionsFor('emergency',8,100)).baselineSnapshot,fixed);
 assert.equal(cache.getComparison(optionsFor('combined',13,0)).baselineSnapshot,fixed);
 assert.equal(builds,1);
 assert.equal(replays,7);
 assert.equal(cache.getProjection(optionsFor('wait')).comparison.baselineSnapshot,fixed);
 assert.ok(Object.isFrozen(fixed));
 assert.throws(()=>{fixed.integrated.actual.completed=999},TypeError);
 cache.clear();
 const next=cache.getComparison(optionsFor('wait'));
 assert.notEqual(next.baselineSnapshot,fixed);
 assert.deepEqual(next.base,fixed.integrated.actual);
 assert.equal(builds,2);
 assert.equal(replays,8);
});

test('M5-20: cache creates a different immutable baseline for changed real demand, supplier delay or opening reserve',()=>{
 const contract=campaignSkuContract({
  campaignId:'M5-BASELINE-SCOPE',policy:'service',plannedSampleOrders:200,
  scenario:{demand:1000,actualDemand:1300,lockUpstream:true}
 });
 const cache=createSkuSessionCache();
 const request=(inputs,option='wait')=>({
  contract,skuInputs:inputs,option,urgentArrivalDay:2,purchaseCoveragePercent:50
 });
 const a=cache.getComparison(request(contract.skuInputs));
 const b=cache.getComparison(request({...contract.skuInputs,delayDays:{A:8}}));
 const c=cache.getComparison(request({...contract.skuInputs,reservePercent:25},'reserve'));
 const d=cache.getComparison(request(contract.skuInputs,'combined'));
 assert.notEqual(a.baselineSnapshot,b.baselineSnapshot);
 assert.notEqual(a.baselineSnapshot,c.baselineSnapshot);
 assert.equal(a.baselineSnapshot,d.baselineSnapshot);
 assert.equal(a.baselineSnapshot.integrated.originalPurchaseOrders,
  d.baselineSnapshot.integrated.originalPurchaseOrders);
 assert.equal(c.baselineSnapshot.openingState.reservePercent,25);
 assert.ok(c.baselineSnapshot.openingState.totals.reserveSkuUnits>0);
 assert.equal(c.baselineSnapshot.openingState.totals.physicalSkuUnits,
  a.baselineSnapshot.openingState.totals.physicalSkuUnits);
});
