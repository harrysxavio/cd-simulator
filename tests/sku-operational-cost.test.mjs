import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {operationalCapacityCostReadModel} from '../src/sku-operational-cost.js';
import {SKU_COST_DEFAULTS} from '../src/sku-cost-catalog.js';

const PRICE=SKU_COST_DEFAULTS.recovery.addedCapacityCLPPerDay;
const get=(args={})=>{
 const comparison=recoveryComparison({policy:'service',plannedOrders:200,actualOrders:260,...args});
 const campaign=campaignSnapshot({comparison,campaignId:'M4-17',plannedOrders:200});
 return {comparison,campaign,operating:campaign.operationalCost};
};

test('M4-17: no reinforcement means no shift, extra capacity or incremental operating charge',()=>{
 for(const option of ['wait','reserve','emergency']){
  const {comparison,campaign,operating}=get({option,urgentArrivalDay:2,reservePercent:20});
  assert.equal(campaign.passed,true);
  assert.equal(campaign.checks.operationalCost,true);
  assert.equal(operating.passed,true);
  assert.equal(operating.scope,'sku-cohort');
  assert.equal(operating.currency,'CLP');
  assert.equal(operating.totals.chargeableShifts,0);
  assert.equal(operating.totals.assignedExtraSlots,0);
  assert.equal(operating.totals.utilizedExtraSlots,0);
  assert.equal(operating.totals.idleExtraSlots,0);
  assert.equal(operating.totals.totalCostCLP,0);
  assert.equal(comparison.extraLabor,0);
  assert.ok(operating.daily.every(x=>!x.activated&&x.costCLP===0));
  assert.equal(operating.actualEmployeesHired,null);
  assert.equal(operating.actualHoursWorked,null);
  assert.equal(operating.actualPayrollPaidCLP,null);
 }
});

test('M4-17: only physical work activates a daily shift; contracted idle slots remain chargeable',()=>{
 const {comparison,campaign,operating}=get({option:'overtime',actualOrders:1,days:12});
 assert.equal(campaign.passed,true);
 assert.equal(comparison.recovered.completed,1);
 assert.equal(operating.daily.length,13);
 assert.equal(operating.totals.chargeableShifts,1);
 assert.equal(operating.totals.unactivatedDays,12);
 assert.equal(operating.totals.totalCostCLP,PRICE);
 assert.equal(comparison.extraLabor,PRICE);
 assert.equal(operating.totals.assignedExtraSlots,80);
 assert.equal(operating.totals.utilizedExtraSlots,0);
 assert.equal(operating.totals.idleExtraSlots,80);
 assert.ok(operating.daily[0].activated);
 assert.ok(operating.daily.slice(1).every(x=>!x.activated&&x.costCLP===0));
 assert.equal(comparison.incrementalExpense,PRICE);
 assert.equal(comparison.netCashDelta,-PRICE);
 assert.equal(operating.chargePolicy,'on-demand-deployed-shift');
});

test('M4-17: an unworkable extra shift is not deployed or billed without any SKU activity',()=>{
 const args={option:'overtime',stock:{A:0,B:0,C:0},
  supplierFill:{A:0,B:0,C:0},actualOrders:200,days:12};
 const {comparison,campaign,operating}=get(args);
 assert.equal(campaign.passed,true);
 assert.equal(comparison.recovered.completed,0);
 assert.equal(comparison.recovered.ledger.every(x=>x.pickedOrders===0&&x.shipped===0),true);
 assert.equal(comparison.extraLabor,0);
 assert.equal(operating.totals.chargeableShifts,0);
 assert.equal(operating.totals.totalCostCLP,0);
 assert.equal(operating.daily.length,13);
 assert.equal(operating.daily.every(x=>!x.activated),true);
});

test('M4-17: zero base capacity can deploy operational reinforcement and consumes actual additional slots',()=>{
 const {comparison,campaign,operating}=get({option:'overtime',dailyCapacity:0,actualOrders:100,days:2});
 assert.equal(campaign.passed,true);
 assert.equal(comparison.base.completed,0);
 assert.ok(comparison.recovered.completed>0);
 assert.ok(operating.totals.chargeableShifts>0);
 assert.ok(operating.totals.utilizedExtraSlots>0);
 assert.equal(operating.totals.assignedExtraSlots,
  operating.totals.utilizedExtraSlots+operating.totals.idleExtraSlots);
 assert.equal(operating.totals.totalCostCLP,operating.totals.chargeableShifts*PRICE);
 for(const day of operating.daily){
  assert.equal(day.activated,day.pickedOrders>0||day.shippedOrders>0);
  assert.equal(day.costCLP,day.activated?PRICE:0);
 }
});

test('M4-17: staging with constrained transport can still require picking reinforcement',()=>{
 const {comparison,campaign,operating}=get({
  option:'combined',separateTransport:true,transportUnitCapacity:0,
  pickingUnitCapacity:1000,urgentArrivalDay:2,actualOrders:300
 });
 assert.equal(campaign.passed,true);
 assert.equal(comparison.recovered.completed,0);
 assert.ok(comparison.recovered.ledger.some(day=>day.pickedOrders>0));
 assert.ok(operating.totals.chargeableShifts>0);
 assert.ok(operating.daily.some(day=>day.activated&&day.shippedOrders===0&&day.pickedOrders>0));
 assert.equal(comparison.incrementalExpense,
  comparison.urgentBase+comparison.urgentSurcharge+operating.totals.totalCostCLP);
 assert.equal(comparison.netCashDelta,
  comparison.incrementalRevenue-comparison.incrementalExpense);
 assert.equal(comparison.economicProxyDelta,
  comparison.netCashDelta+comparison.penaltySaved-comparison.holdingDelta);
});

test('M4-17: recovery estimates cannot erase deployed but unused reinforcement',()=>{
 const {comparison,campaign,operating}=get({
  option:'overtime',actualOrders:200,days:3,transportUnitCapacity:1
 });
 assert.equal(campaign.passed,true);
 assert.ok(operating.totals.chargeableShifts>0);
 assert.ok(operating.totals.idleExtraSlots>0);
 assert.equal(operating.totals.totalCostCLP,comparison.extraLabor);
 assert.ok(operating.daily.filter(day=>day.activated).every(day=>day.costCLP===PRICE));
 assert.ok(operating.daily.every(day=>day.assignedExtraSlots===
  day.utilizedExtraSlots+day.idleExtraSlots));
 assert.equal(operating.actualPayrollPaidCLP,null);
});

test('M4-17: rejecting forged activity, capacity, cost or extra-scheduling policy',()=>{
 const {comparison}=get({option:'overtime',actualOrders:100,days:3});
 const good={recovered:comparison.recovered,baseline:comparison.base,
  option:'overtime',dailyCapacity:200,extraCapacity:80,extraCapacityDailyCost:PRICE};
 assert.deepEqual(operationalCapacityCostReadModel(good),comparison.operationalCost);
 assert.throws(()=>operationalCapacityCostReadModel({...good,extraCapacity:-1}),/incompatibles/);
 assert.throws(()=>operationalCapacityCostReadModel({...good,extraCapacity:0}),/incompatibles/);
 assert.throws(()=>operationalCapacityCostReadModel({...good,extraCapacityDailyCost:-1}),/incompatibles/);
 assert.throws(()=>operationalCapacityCostReadModel({...good,baseline:{...good.baseline,days:2}}),/incompatibles/);
 const altered=good.recovered.ledger.map((day,i)=>i?day:{...day,pickedOrders:1000});
 assert.throws(()=>operationalCapacityCostReadModel({...good,recovered:{...good.recovered,ledger:altered}}),/incompatible/);
 assert.throws(()=>{comparison.operationalCost.daily[0].costCLP=0},TypeError);
});

test('M4-17: default tariff is catalog backed; no fictitious staff-hours or unpriced activity costs',()=>{
 const {comparison,operating}=get({option:'combined',days:4,actualOrders:300});
 assert.equal(operating.rateCLPPerActivatedShift,SKU_COST_DEFAULTS.recovery.addedCapacityCLPPerDay);
 assert.equal(operating.extraCapacityOrdersPerDay,80);
 assert.equal(comparison.extraLabor,operating.totals.totalCostCLP);
 assert.ok(operating.note.includes('no horas ni personas verificadas'));
 assert.equal(operating.actualHoursWorked,null);
 assert.ok(!Object.hasOwn(operating.totals,'baseReceivingCostCLP'));
 assert.ok(!Object.hasOwn(operating.totals,'transportWageCLP'));
});
