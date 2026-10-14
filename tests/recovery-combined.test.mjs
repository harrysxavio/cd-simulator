import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveryBaseline} from '../src/recovery-baseline.js';
import {recoveryComparison} from '../src/recovery.js';
import {combinedInterventionReadModel} from '../src/recovery-combined.js';
import {campaignSnapshot} from '../src/campaign.js';

const input={
 policy:'service',plannedOrders:200,actualOrders:280,
 plannedForecastPercent:80,planningCoveragePercent:70,
 days:12,reservePercent:20
};
// Build the four alternatives from ONE frozen baseline, as the UI cache does.
const run=(updates={})=>{
 const options={...input,...updates};
 const baseline=createRecoveryBaseline(options);
 const comparisons=['wait','emergency','overtime','combined'].map(option=>
  recoveryComparison({...options,option,urgentArrivalDay:2,
   purchaseCoveragePercent:75,baselineSnapshot:baseline}));
 const evidence=combinedInterventionReadModel({comparisons});
 return {comparisons,baseline,evidence};
};
const total=(rows,key)=>rows.reduce((n,x)=>n+x[key],0);
test('M5-25: combined result reads ONE physical joint replay, not isolated gains summed',()=>{
 const {comparisons,baseline,evidence}=run({dailyCapacity:0,actualOrders:260,days:5});
 const by=Object.fromEntries(comparisons.map(x=>[x.option,x]));
 assert.equal(evidence.passed,true);
 assert.equal(evidence.scope,'sku-cohort');
 assert.equal(evidence.option,'combined');
 assert.equal(evidence.baselineKey,baseline.scenarioKey);
 assert.equal(evidence.daily.length,6);
 assert.equal(evidence.totals.baselineDispatchedOrders,by.wait.recovered.completed);
 assert.equal(evidence.totals.urgentOnlyDispatchedOrders,by.emergency.recovered.completed);
 assert.equal(evidence.totals.capacityOnlyDispatchedOrders,by.overtime.recovered.completed);
 assert.equal(evidence.totals.combinedDispatchedOrders,by.combined.recovered.completed);
 assert.equal(evidence.totals.actualCombinedGainOrders,
  by.combined.recovered.completed-by.wait.recovered.completed);
 assert.equal(evidence.totals.interactionOrders,
  evidence.totals.actualCombinedGainOrders-evidence.totals.hypotheticalSumOfIsolatedGainsOrders);
 assert.equal(total(evidence.daily,'actuallyDispatchedToday'),by.combined.recovered.completed);
 assert.equal(evidence.totals.combinedPendingOrders,by.combined.recovered.pending);
 assert.ok(Object.values(evidence.checks).every(Boolean));
 assert.equal(evidence.customerDeliveriesConfirmed,null);
 assert.ok(Object.isFrozen(evidence)&&Object.isFrozen(evidence.totals)&&Object.isFrozen(evidence.daily[0]));
 assert.throws(()=>{evidence.daily[0].interactionOrdersToDate=999},TypeError);
 const actual=campaignSnapshot({comparison:by.combined,campaignId:'M5-25'});
 assert.equal(actual.passed,true,JSON.stringify(actual.checks));
 assert.equal(actual.shipments.length,evidence.totals.combinedDispatchedOrders);
});

test('M5-25: same urgent SKU commitment in standalone and combined; deployed labor only once',()=>{
 const {comparisons,evidence}=run({dailyCapacity:5,actualOrders:350,days:8,
  supplierFill:{A:40,B:50,C:70},receivingUnitCapacity:35,qualityReleasePercent:65});
 const by=Object.fromEntries(comparisons.map(x=>[x.option,x]));
 assert.deepEqual(by.combined.urgent,by.emergency.urgent);
 assert.ok(by.combined.urgent.length>0);
 assert.equal(evidence.totals.urgentPrincipalCommitmentCLP,by.emergency.urgentBase);
 assert.equal(evidence.totals.urgentSurchargeAssumptionCLP,by.emergency.urgentSurcharge);
 assert.equal(evidence.totals.activatedReinforcementCLP,by.combined.operationalCost.totals.totalCostCLP);
 assert.equal(evidence.totals.combinedIncrementalExpenseCLP,
  by.combined.urgentBase+by.combined.urgentSurcharge+by.combined.extraLabor);
 assert.equal(total(evidence.daily,'staffShiftCostCLP'),by.combined.extraLabor);
 assert.ok(evidence.daily.every((d,i)=>d.urgentDockArrivalsSkuUnits===
  by.combined.recovered.ledger[i].dockArrivals.filter(x=>x.urgent).reduce((n,x)=>n+x.qty,0)));
 assert.equal(evidence.totals.combinedEconomicProxyDeltaCLP,by.combined.economicProxyDelta);
});

test('M5-25: no stock + zero supplier fulfillment cannot create a combined recovery',()=>{
 const {comparisons,evidence}=run({stock:{A:0,B:0,C:0},
  supplierFill:{A:0,B:0,C:0},urgentArrivalDay:13,purchaseCoveragePercent:0,
  days:3,receivingUnitCapacity:0});
 const joint=comparisons.find(x=>x.option==='combined');
 // The helper fixes urgent arrival to day 2 and coverage 75: dock capacity 0
 // prevents any physical receipt even if a PO is hypothetically issued.
 assert.equal(joint.recovered.completed,0);
 assert.equal(evidence.totals.actualCombinedGainOrders,0);
 assert.equal(evidence.totals.combinedDispatchedOrders,0);
 assert.equal(evidence.totals.interactionOrders,0);
 assert.ok(evidence.daily.every(x=>x.actuallyDispatchedToday===0));
});

test('M5-25: optional staging physically blocks joint expedition despite Picking effort',()=>{
 const {comparisons,evidence}=run({actualOrders:350,separateTransport:true,
  transportUnitCapacity:0,pickingUnitCapacity:1000,days:4});
 const joint=comparisons.find(x=>x.option==='combined');
 assert.equal(joint.recovered.completed,0);
 assert.equal(evidence.totals.actualCombinedGainOrders,0);
 assert.ok(joint.recovered.ledger.some(d=>d.pickedOrders>0));
 assert.equal(evidence.daily.at(-1).pendingAtDayEnd,350);
});

test('M5-25: no recovery when extra PO arrives beyond horizon, even with spare capacity',()=>{
 const options={...input,dailyCapacity:200,actualOrders:350,days:4,
  supplierFill:{A:0,B:0,C:0},stock:{A:0,B:0,C:0}};
 const baseline=createRecoveryBaseline(options);
 const comparisons=['wait','emergency','overtime','combined'].map(option=>recoveryComparison({
  ...options,option,urgentArrivalDay:13,purchaseCoveragePercent:100,
  baselineSnapshot:baseline
 }));
 const evidence=combinedInterventionReadModel({comparisons});
 assert.equal(evidence.totals.actualCombinedGainOrders,0);
 assert.equal(evidence.totals.combinedDispatchedOrders,0);
 assert.equal(evidence.totals.activatedReinforcementCLP,0);
 assert.ok(evidence.totals.urgentPrincipalCommitmentCLP>0);
 assert.ok(evidence.daily.every(x=>x.urgentDockArrivalsSkuUnits===0));
});

test('M5-25: reject mismatch in common baseline, cost, urgent PO or physical ledger',()=>{
 const {comparisons}=run({days:3,dailyCapacity:0});
 const testBad=(mutator)=>assert.throws(()=>combinedInterventionReadModel({
  comparisons:comparisons.map(mutator)}),/Acción combinada SKU/);
 testBad(x=>x.option==='combined'?{...x,urgent:[...x.urgent,{id:'A',qty:1,day:2,unitCost:1800}]}:x);
 testBad(x=>x.option==='combined'?{...x,incrementalExpense:x.incrementalExpense+1}:x);
 testBad(x=>x.option==='combined'?{...x,baselineSnapshot:{...x.baselineSnapshot}}:x);
 testBad(x=>x.option==='overtime'?{...x,urgentArrivalDay:3}:x);
 testBad(x=>x.option==='combined'?{...x,recovered:{...x.recovered,ledger:x.recovered.ledger.map((r,i)=>i===0?{...r,shipped:r.shipped+1}:r)}}:x);
 assert.throws(()=>combinedInterventionReadModel({comparisons:[...comparisons,comparisons[0]]}),/Acción combinada SKU/);
 assert.throws(()=>combinedInterventionReadModel({comparisons:comparisons.filter(x=>x.option!=='wait')}),/Acción combinada SKU/);
});
