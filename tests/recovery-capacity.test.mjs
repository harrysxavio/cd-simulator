import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {capacityReinforcementTraceReadModel} from '../src/recovery-capacity.js';
import {SKU_COST_DEFAULTS} from '../src/sku-cost-catalog.js';

// One physical SKU cohort: compare alternatives without replaying in the auditor.
const defaults={policy:'service',plannedOrders:200,actualOrders:280,
 plannedForecastPercent:80,planningCoveragePercent:70,days:12,reservePercent:20};
const make=(settings={})=>{
 const comparison=recoveryComparison({...defaults,option:'overtime',...settings});
 const campaign=campaignSnapshot({comparison,campaignId:'M5-24',plannedOrders:200});
 return {comparison,campaign,trace:campaign.capacityTrace};
};
const args=s=>({comparison:s.comparison,operationalCost:s.campaign.operationalCost,
 picks:s.campaign.picks,shipments:s.campaign.shipments,
 inventoryLedger:s.campaign.inventoryLedger});
const sum=(rows,k)=>rows.reduce((n,r)=>n+r[k],0);

test('M5-24: reinforcement capacity/cost only read real Picking and Transport events',()=>{
 const s=make({dailyCapacity:0,actualOrders:120,days:3});
 const {comparison,campaign,trace}=s;
 assert.equal(campaign.passed,true,JSON.stringify(campaign.checks));
 assert.equal(campaign.checks.capacityTrace,true);
 assert.equal(trace.passed,true);
 assert.equal(trace.baselineKey,comparison.baselineSnapshot.scenarioKey);
 assert.equal(trace.horizonDays,3);
 assert.equal(trace.option,'overtime');
 assert.equal(trace.resourceScope,'shared-daily-order-cap-for-picking-and-dispatch');
 assert.equal(trace.totals.baseOrderSlotsPerStagePerDay,0);
 assert.equal(trace.totals.extraOrderSlotsPerStagePerDay,80);
 assert.ok(trace.totals.extraSlotsUsed>0);
 assert.ok(trace.totals.shiftDaysActivated>0);
 assert.equal(trace.totals.extraSlotsAssigned,
  trace.totals.extraSlotsUsed+trace.totals.extraSlotsIdle);
 assert.equal(trace.totals.reinforcementCostCLP,
  trace.totals.shiftDaysActivated*SKU_COST_DEFAULTS.recovery.addedCapacityCLPPerDay);
 assert.equal(trace.totals.reinforcementCostCLP,comparison.extraLabor);
 assert.equal(trace.totals.netDispatchChangeOrders,
  comparison.recovered.completed-comparison.base.completed);
 assert.equal(sum(trace.daily,'dispatchedDeltaToday'),trace.totals.netDispatchChangeOrders);
 assert.ok(trace.daily.every((d,i)=>
  d.pickedCompleteOrders===comparison.recovered.ledger[i].pickedOrders
  &&d.dispatchedCompleteOrders===comparison.recovered.ledger[i].shipped
  &&d.extraOrderSlotsAssigned===d.extraOrderSlotsUsed+d.extraOrderSlotsIdle));
 assert.ok(Object.values(trace.checks).every(Boolean));
 assert.equal(trace.actualWorkerCount,null);
 assert.equal(trace.actualStaffHours,null);
 assert.equal(trace.actualPayrollPaidCLP,null);
 assert.deepEqual(capacityReinforcementTraceReadModel(args(s)),trace);
 assert.ok(Object.isFrozen(trace)&&Object.isFrozen(trace.daily[0]));
 assert.throws(()=>{trace.daily[0].extraOrderSlotsIdle=-1},TypeError);
});

test('M5-24: deployed but fully idle shifts are billed under stated policy',()=>{
 const {campaign,trace}=make({actualOrders:1});
 assert.equal(campaign.passed,true);
 assert.equal(trace.totals.shiftDaysActivated,1);
 assert.equal(trace.totals.extraSlotsAssigned,80);
 assert.equal(trace.totals.extraSlotsUsed,0);
 assert.equal(trace.totals.extraSlotsIdle,80);
 assert.equal(trace.totals.chargedShiftsWithoutUse,1);
 assert.equal(trace.totals.reinforcementCostCLP,SKU_COST_DEFAULTS.recovery.addedCapacityCLPPerDay);
 assert.equal(trace.totals.netDispatchChangeOrders,0);
});

test('M5-24: zero feasible SKU work means no shift, no fictitious shipment or billed reinforcement',()=>{
 const {comparison,campaign,trace}=make({stock:{A:0,B:0,C:0},
  supplierFill:{A:0,B:0,C:0},actualOrders:200});
 assert.equal(campaign.passed,true);
 assert.equal(comparison.recovered.completed,0);
 assert.equal(trace.totals.shiftDaysActivated,0);
 assert.equal(trace.totals.extraSlotsUsed,0);
 assert.equal(trace.totals.extraSlotsIdle,0);
 assert.equal(trace.totals.reinforcementCostCLP,0);
 assert.ok(trace.daily.every(d=>!d.reinforcementActivated
  &&d.pickedCompleteOrders===0&&d.dispatchedCompleteOrders===0));
});

test('M5-24: staging limited by transport does not falsely credit departed orders',()=>{
 const {comparison,campaign,trace}=make({option:'combined',
  actualOrders:300,urgentArrivalDay:2,separateTransport:true,
  transportUnitCapacity:0,pickingUnitCapacity:1000});
 assert.equal(campaign.passed,true,JSON.stringify(campaign.checks));
 assert.equal(trace.option,'combined');
 assert.equal(trace.totals.alternativeDispatchedOrders,0);
 assert.equal(trace.totals.netDispatchChangeOrders,0);
 assert.ok(trace.daily.some(d=>d.pickedCompleteOrders>0&&d.dispatchedCompleteOrders===0));
 assert.ok(trace.totals.shiftDaysActivated>0);
 assert.ok(trace.totals.reinforcementCostCLP>0);
 assert.match(trace.interpretation,/compra urgente/);
 assert.equal(trace.totals.reinforcementCostCLP,comparison.extraLabor);
 assert.equal(trace.totals.pendingOrdersAfterAlternative,300);
});

test('M5-24: options without capacity create a trace of zero extra slots without extra resource expense',()=>{
 for(const option of ['wait','reserve','emergency']){
  const s=make({option,urgentArrivalDay:2});
  assert.equal(s.campaign.passed,true,JSON.stringify(s.campaign.checks));
  assert.equal(s.trace.passed,true);
  assert.ok(s.trace.daily.every(d=>d.extraOrderSlotsAssigned===0
   &&d.extraOrderSlotsUsed===0&&d.extraOrderSlotsIdle===0
   &&d.dailyIncrementalCostCLP===0));
  assert.equal(s.trace.totals.reinforcementCostCLP,0);
  assert.equal(s.trace.totals.shiftDaysActivated,0);
  assert.equal(s.trace.totals.extraOrderSlotsPerStagePerDay,0);
 }
});

test('M5-24: detects forged shifts, charges, capacities, snapshots and order events',()=>{
 const s=make({days:3,actualOrders:100});
 const good=args(s);
 for(const cost of [
  {...good.operationalCost,rateCLPPerActivatedShift:0},
  {...good.operationalCost,extraCapacityOrdersPerDay:0},
  {...good.operationalCost,daily:[{...good.operationalCost.daily[0],costCLP:999},...good.operationalCost.daily.slice(1)]}
 ])assert.throws(()=>capacityReinforcementTraceReadModel({...good,operationalCost:cost}),
  /Refuerzo SKU/);
 const forged={...good.comparison,recovered:{...good.comparison.recovered,dailyCapacity:9999}};
 assert.throws(()=>capacityReinforcementTraceReadModel({...good,comparison:forged}),/Refuerzo SKU/);
 const invalidPicking=good.picks.length?good.picks.slice(1):[{id:'fake',day:0,orderId:'x'}];
 assert.throws(()=>capacityReinforcementTraceReadModel({...good,picks:invalidPicking}),/Refuerzo SKU/);
 const invalidShipment=[...good.shipments,...good.shipments.slice(0,1)];
 assert.throws(()=>capacityReinforcementTraceReadModel({...good,shipments:invalidShipment}),/Refuerzo SKU/);
});

test('M5-24: compare unit-capacity limits without counting hypothetical staff-hours',()=>{
 for(const limits of [
  {receivingUnitCapacity:0},{qualityReleasePercent:0},
  {inventoryAccuracyPercent:0},{transportUnitCapacity:0},
  {pickingUnitCapacity:0}
 ]){
  const {campaign,trace}=make(limits);
  assert.equal(campaign.passed,true,JSON.stringify({limits,checks:campaign.checks}));
  assert.equal(trace.totals.extraSlotsAssigned,trace.totals.extraSlotsUsed+trace.totals.extraSlotsIdle);
  assert.equal(trace.actualStaffHours,null);
  assert.ok(trace.daily.every(d=>d.pickedCompleteOrders>=0&&d.dispatchedCompleteOrders>=0));
 }
});
