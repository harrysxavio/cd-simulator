import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {skuPartialContributionReadModel} from '../src/sku-economics.js';
import {SKU_COST_DEFAULTS} from '../src/sku-cost-catalog.js';

const make=(extra={})=>{
 const comparison=recoveryComparison({
  policy:'service',plannedOrders:200,actualOrders:280,
  plannedForecastPercent:80,planningCoveragePercent:70,...extra
 });
 const campaign=campaignSnapshot({comparison,campaignId:'M4-18',plannedOrders:200});
 return {comparison,campaign,economics:campaign.economicResult};
};
const inputs=({comparison,campaign})=>({
 shipments:campaign.shipments,inventoryValuation:campaign.inventoryValuation,
 purchaseCost:campaign.purchaseCost,operationalCost:campaign.operationalCost,
 comparison
});
const total=(items,key)=>items.reduce((n,x)=>n+x[key],0);
const close=(a,b)=>assert.ok(Math.abs(a-b)<0.00001,JSON.stringify({a,b}));

test('M4-18: value only complete SKU shipments and subtract material used plus extra deployed shifts once',()=>{
 const {comparison,campaign,economics}=make({
  option:'combined',urgentArrivalDay:2,receivingUnitCapacity:28,
  qualityReleasePercent:65,reservePercent:20,
  separateTransport:true,transportUnitCapacity:20
 });
 assert.equal(campaign.passed,true,JSON.stringify(campaign.checks));
 assert.equal(campaign.checks.economicResult,true);
 assert.equal(economics.passed,true);
 assert.equal(economics.scope,'sku-cohort');
 assert.equal(economics.currency,'CLP');
 assert.equal(economics.accountingStatus,'educational-estimate-not-PnL-or-cash');
 assert.equal(economics.concept,'estimated-partial-contribution-from-cd-dispatch');
 assert.equal(economics.daily.length,comparison.recovered.days+1);
 assert.equal(economics.totals.shippedOrders,campaign.shipments.length);
 assert.equal(economics.totals.potentialDispatchValueCLP,
  campaign.shipments.length*SKU_COST_DEFAULTS.recovery.revenueCLPPerShippedOrder);
 assert.equal(economics.totals.dispatchedMaterialCostCLP,
  campaign.inventoryValuation.totals.shippedToDateCLP);
 assert.equal(economics.totals.incrementalOperatingCostCLP,
  campaign.operationalCost.totals.totalCostCLP);
 close(economics.totals.partialContributionCLP,
  economics.totals.potentialDispatchValueCLP-economics.totals.dispatchedMaterialCostCLP-
  economics.totals.incrementalOperatingCostCLP);
 close(economics.totals.partialContributionCLP,total(economics.daily,'partialContributionCLP'));
 for(const day of economics.daily){
  const physical=comparison.recovered.ledger[day.day];
  const valuation=campaign.inventoryValuation.daily[day.day];
  const reinforcement=campaign.operationalCost.daily[day.day];
  assert.equal(day.shippedOrders,physical.shipped);
  assert.equal(day.shippedSkuUnits,physical.shippedUnits);
  assert.equal(day.dispatchedMaterialCostCLP,valuation.totals.shippedTodayCLP);
  assert.equal(day.incrementalOperatingCostCLP,reinforcement.costCLP);
  assert.equal(day.potentialDispatchValueCLP,physical.shipped*comparison.unitRevenue);
  close(day.partialContributionCLP,
   day.potentialDispatchValueCLP-day.dispatchedMaterialCostCLP-day.incrementalOperatingCostCLP);
 }
 assert.equal(economics.daily.at(-1).cumulativeShippedOrders,campaign.shipments.length);
 assert.equal(economics.excludedCommitments.originalPurchaseCommitmentCLP,
  campaign.purchaseCost.totals.originalCommitmentCLP);
 assert.equal(economics.excludedCommitments.urgentPurchaseCommitmentCLP,
  campaign.purchaseCost.totals.urgentCommitmentCLP);
 assert.equal(economics.excludedCommitments.urgentSurchargeCommitmentCLP,
  comparison.urgentSurcharge);
 assert.equal(economics.excludedCommitments.stockStillOnHandCLP,
  campaign.inventoryValuation.totals.closingPhysicalCLP);
 assert.equal(economics.decisionProxies.backlogPenaltyAssumptionCLP,
  comparison.penaltyRecovered);
 assert.equal(economics.decisionProxies.inventoryHoldingAssumptionCLP,
  comparison.holdingRecovered);
 assert.equal(economics.confirmedSalesInvoicesCLP,null);
 assert.equal(economics.confirmedCashReceivedCLP,null);
 assert.equal(economics.confirmedNetProfitCLP,null);
 assert.equal(economics.confirmedEBITDACLP,null);
 assert.equal(economics.confirmedCustomerDeliveries,null);
 assert.ok(Object.isFrozen(economics)&&Object.isFrozen(economics.totals)
  &&Object.isFrozen(economics.daily[0])&&Object.isFrozen(economics.excludedCommitments));
 assert.throws(()=>{economics.daily[0].partialContributionCLP=0},TypeError);
});

test('M4-18: late urgent purchase commitment never becomes campaign expense or physical revenue',()=>{
 const baseline=make({option:'wait',days:12});
 const future=make({option:'emergency',urgentArrivalDay:13,days:12});
 assert.ok(future.comparison.urgentBase>0);
 assert.deepEqual(future.campaign.shipments,baseline.campaign.shipments);
 assert.equal(future.economics.totals.potentialDispatchValueCLP,
  baseline.economics.totals.potentialDispatchValueCLP);
 assert.equal(future.economics.totals.dispatchedMaterialCostCLP,
  baseline.economics.totals.dispatchedMaterialCostCLP);
 assert.equal(future.economics.totals.partialContributionCLP,
  baseline.economics.totals.partialContributionCLP);
 assert.ok(future.economics.excludedCommitments.urgentPurchaseCommitmentCLP>0);
 assert.ok(future.economics.excludedCommitments.urgentSurchargeCommitmentCLP>0);
 assert.equal(future.campaign.purchaseCost.byPurchaseOrder.filter(x=>x.source==='urgent')
  .reduce((n,p)=>n+p.warehouseReceivedCLP,0),0);
 assert.equal(future.economics.confirmedCashReceivedCLP,null);
});

test('M4-18: warehouse dock queue and held Quality stock do not create dispatched order revenue',()=>{
 for(const params of [
  {option:'emergency',receivingUnitCapacity:0,urgentArrivalDay:1},
  {option:'combined',qualityReleasePercent:0},
  {option:'wait',inventoryAccuracyPercent:0},
  {option:'wait',pickingUnitCapacity:0},
  {option:'combined',separateTransport:true,transportUnitCapacity:0}
 ]){
  const {comparison,campaign,economics}=make(params);
  assert.equal(campaign.passed,true,JSON.stringify(params));
  assert.equal(economics.totals.shippedOrders,comparison.recovered.completed);
  assert.equal(economics.totals.potentialDispatchValueCLP,
   comparison.recovered.completed*comparison.unitRevenue);
  assert.ok(!campaign.orders.some(order=>order.status==='staged'
   &&campaign.shipments.some(shipment=>shipment.orderId===order.id)));
  assert.equal(economics.totals.dispatchedMaterialCostCLP,
   campaign.inventoryValuation.totals.shippedToDateCLP);
  close(economics.totals.partialContributionCLP,
   economics.totals.potentialDispatchValueCLP-economics.totals.dispatchedMaterialCostCLP-
   economics.totals.incrementalOperatingCostCLP);
 }
});

test('M4-18: no shipments yields no income; deployed reinforcement still costs CLP',()=>{
 const {campaign,economics}=make({
  option:'combined',separateTransport:true,transportUnitCapacity:0,
  pickingUnitCapacity:1000,actualOrders:300,urgentArrivalDay:2
 });
 assert.equal(campaign.passed,true);
 assert.equal(economics.totals.shippedOrders,0);
 assert.equal(economics.totals.potentialDispatchValueCLP,0);
 assert.equal(economics.totals.dispatchedMaterialCostCLP,0);
 assert.ok(economics.totals.incrementalOperatingCostCLP>0);
 assert.ok(economics.totals.partialContributionCLP<0);
 assert.equal(economics.totals.partialContributionRatePercent,null);
 assert.equal(economics.totals.partialContributionPerDispatchedOrderCLP,null);
 assert.ok(campaign.picks.length>0);
 assert.ok(economics.daily.every(x=>x.shippedOrders===0));
});

test('M4-18: negative incremental comparison revenue under FIFO staging does not imply negative gross shipped value',()=>{
 const {comparison,campaign,economics}=make({
  option:'wait',separateTransport:true,transportUnitCapacity:2,
  actualOrders:280
 });
 assert.equal(campaign.passed,true);
 assert.ok(comparison.base.completed>0);
 assert.ok(comparison.recovered.completed<=comparison.base.completed);
 assert.equal(comparison.incrementalRevenue,
  (comparison.recovered.completed-comparison.base.completed)*comparison.unitRevenue);
 assert.ok(economics.totals.potentialDispatchValueCLP>=0);
 assert.equal(economics.totals.potentialDispatchValueCLP,
  comparison.recovered.completed*comparison.unitRevenue);
 assert.equal(economics.totals.dispatchedMaterialCostCLP,
  campaign.inventoryValuation.totals.shippedToDateCLP);
 assert.equal(economics.totals.incrementalOperatingCostCLP,0);
 assert.equal(economics.totals.partialContributionCLP,
  economics.totals.potentialDispatchValueCLP-economics.totals.dispatchedMaterialCostCLP);
 assert.equal(economics.confirmedCustomerDeliveries,null);
});

test('M4-18: configured unit revenue is respected and traceable, not forced to defaults',()=>{
 const low=make({option:'wait',actualOrders:100,unitRevenue:100});
 const zero=make({option:'wait',actualOrders:100,unitRevenue:0});
 const high=make({option:'wait',actualOrders:100,unitRevenue:15000});
 assert.equal(low.campaign.passed,true);
 assert.equal(low.economics.revenueRateCLPPerCompleteShippedOrder,100);
 assert.match(low.economics.revenueRateSource,/custom scenario/);
 assert.equal(low.economics.totals.potentialDispatchValueCLP,100*low.campaign.shipments.length);
 assert.equal(zero.economics.totals.potentialDispatchValueCLP,0);
 assert.equal(zero.economics.totals.partialContributionRatePercent,null);
 assert.equal(high.economics.totals.potentialDispatchValueCLP,15000*high.campaign.shipments.length);
 assert.equal(high.economics.revenueRateCLPPerCompleteShippedOrder,15000);
 assert.equal(high.economics.totals.dispatchedMaterialCostCLP,
  low.economics.totals.dispatchedMaterialCostCLP);
 assert.equal(high.economics.totals.incrementalOperatingCostCLP,
  low.economics.totals.incrementalOperatingCostCLP);
});

test('M4-18: comparisons never confuse the hypothetical incremental cash proxy with profit',()=>{
 const {comparison,campaign,economics}=make({option:'combined',actualOrders:290});
 assert.equal(campaign.passed,true);
 assert.equal(comparison.incrementalExpense,
  comparison.urgentBase+comparison.urgentSurcharge+comparison.extraLabor);
 assert.equal(comparison.netCashDelta,comparison.incrementalRevenue-comparison.incrementalExpense);
 assert.equal(economics.totals.incrementalOperatingCostCLP,comparison.extraLabor);
 assert.notEqual(economics.concept,'netCashDelta');
 assert.notEqual(economics.accountingStatus,'profit');
 assert.equal(economics.confirmedSupplierPaymentsCLP,null);
 assert.equal(economics.confirmedCashReceivedCLP,null);
 assert.ok(economics.missingCosts.includes('transport-freight'));
 assert.match(economics.note,/NO es utilidad, EBITDA/);
});

test('M4-18: tampering with shipment dates, duplicates, tariff, stock or shift cost is rejected',()=>{
 const state=make({option:'combined',actualOrders:280,separateTransport:true});
 const args=inputs(state);
 assert.deepEqual(skuPartialContributionReadModel(args),state.economics);
 const first=args.shipments[0];
 assert.ok(first);
 assert.throws(()=>skuPartialContributionReadModel({...args,
  shipments:[...args.shipments,first]}),/duplicada/);
 assert.throws(()=>skuPartialContributionReadModel({...args,
  shipments:args.shipments.map((x,i)=>i===0?{...x,day:999}:x)}),/duplicada/);
 assert.throws(()=>skuPartialContributionReadModel({...args,
  inventoryValuation:{...args.inventoryValuation,currency:'USD'}}),/incompatibles/);
 assert.throws(()=>skuPartialContributionReadModel({...args,
  inventoryValuation:{...args.inventoryValuation,
   daily:args.inventoryValuation.daily.map((d,i)=>i!==2?d:
    {...d,totals:{...d.totals,shippedTodayCLP:d.totals.shippedTodayCLP+100}})}}),/consumo diario|identidades/);
 assert.throws(()=>skuPartialContributionReadModel({...args,
  operationalCost:{...args.operationalCost,totals:{...args.operationalCost.totals,totalCostCLP:0}}}),/identidades/);
 assert.throws(()=>skuPartialContributionReadModel({...args,
  comparison:{...args.comparison,unitRevenue:-1}}),/incompatibles/);
 assert.throws(()=>skuPartialContributionReadModel({...args,
  comparison:{...args.comparison,incrementalRevenue:1000000}}),/identidades/);
});
