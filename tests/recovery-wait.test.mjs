import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {createRecoveryBaseline,recoveryBaselineKey} from '../src/recovery-baseline.js';
import {waitWithoutInterventionReadModel} from '../src/recovery-wait.js';
import {campaignSnapshot} from '../src/campaign.js';
import {createSkuSessionCache} from '../src/sku-session.js';
import {campaignSkuContract} from '../src/campaign-contract.js';

const options={
 policy:'service',plannedOrders:200,actualOrders:280,
 plannedForecastPercent:80,planningCoveragePercent:70,
 supplierFill:{A:65,B:70,C:85},delayDays:{A:2},
 days:12,receivingUnitCapacity:25,qualityReleasePercent:50,
 inventoryAccuracyPercent:85,reservePercent:20
};
const create=(updates={})=>{
 const args={...options,...updates},baseline=createRecoveryBaseline(args);
 const comparison=recoveryComparison({...args,option:'wait',
  urgentArrivalDay:13,purchaseCoveragePercent:0,baselineSnapshot:baseline});
 return {args,baseline,comparison,evidence:comparison.waitEvidence};
};
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,JSON.stringify({a,b}));

test('M5-21: wait is the EXACT frozen baseline physical replay and costs no incremental actions',()=>{
 const {baseline,comparison,evidence}=create();
 assert.equal(comparison.recovered,baseline.integrated.actual);
 assert.equal(comparison.base,comparison.recovered);
 assert.equal(comparison.integrated,baseline.integrated);
 assert.equal(comparison.baselineSnapshot,baseline);
 assert.equal(comparison.urgent.length,0);
 assert.equal(comparison.urgentBase,0);
 assert.equal(comparison.urgentSurcharge,0);
 assert.equal(comparison.extraLabor,0);
 assert.equal(comparison.incrementalExpense,0);
 assert.equal(comparison.incrementalRevenue,0);
 assert.equal(comparison.netCashDelta,0);
 assert.equal(comparison.economicProxyDelta,0);
 assert.equal(comparison.penaltySaved,0);
 assert.equal(comparison.holdingDelta,0);
 assert.equal(comparison.operationalCost.totals.chargeableShifts,0);
 assert.equal(evidence.passed,true);
 assert.equal(evidence.stage,'no-intervention');
 assert.ok(Object.values(evidence.checks).every(Boolean));
 assert.equal(evidence.baselineKey,baseline.scenarioKey);
 assert.equal(evidence.totals.demandOrders,baseline.actualOrders);
 assert.equal(evidence.totals.shippedCompleteOrders,comparison.base.completed);
 assert.equal(evidence.totals.pendingAfterHorizon,comparison.base.pending);
 assert.equal(evidence.totals.urgentPurchaseSkuUnits,0);
 assert.equal(evidence.totals.reserveTransfersSkuUnits,0);
 assert.equal(evidence.totals.extraCapacityShifts,0);
 assert.equal(evidence.totals.incrementalExpenseCLP,0);
 assert.equal(evidence.totals.incrementalRevenueProxyCLP,0);
 assert.equal(evidence.totals.incrementalCashProxyCLP,0);
 assert.equal(evidence.totals.incrementalEconomicProxyCLP,0);
 assert.equal(evidence.unshippedPromises.count,comparison.base.pending);
 assert.equal(evidence.unshippedPromises.promisedDispatchDay,null);
 assert.equal(evidence.unshippedPromises.confirmedCustomerDeliveryDay,null);
 assert.equal(evidence.unshippedPromises.unknownBeyondHorizon,true);
 assert.ok(Object.isFrozen(evidence.daily[0]));
 assert.throws(()=>{evidence.daily[0].pendingAtDayEnd=0},TypeError);
 assert.throws(()=>{evidence.totals.shippedCompleteOrders=999},TypeError);
});

test('M5-21: day-by-day backlog and each order departure date match the baseline without inventing an ETA',()=>{
 const {baseline,comparison,evidence}=create({days:5,actualOrders:350,qualityReleasePercent:25});
 assert.equal(evidence.daily.length,6);
 const shipDays=new Map();
 for(const o of comparison.base.ordersDetail)if(o.fulfilledDay!==null)
  shipDays.set(o.fulfilledDay,(shipDays.get(o.fulfilledDay)||0)+1);
 let cumulative=0;
 for(const row of evidence.daily){
  const baselineDay=baseline.integrated.actual.ledger[row.day];
  const departures=shipDays.get(row.day)||0;
  cumulative+=departures;
  assert.equal(row.shippedOrders,departures);
  assert.equal(row.shippedOrders,baselineDay.shipped);
  assert.equal(row.shippedToDate,cumulative);
  assert.equal(row.pendingAtDayEnd,baselineDay.backlog);
  assert.equal(row.pendingAtDayEnd,baseline.actualOrders-cumulative);
  assert.equal(row.urgentSkuUnitsReceived,0);
  assert.equal(row.reserveSkuUnitsTransferred,0);
  assert.equal(row.addedCapacityShiftCount,0);
  assert.equal(row.incrementalExpenseCLP,0);
  assert.equal(row.customerDeliveryConfirmed,false);
 }
 assert.equal(evidence.totals.backlogOrderDaysBeforeFinalCutoff,
  baseline.integrated.actual.ledger.slice(0,-1).reduce((sum,d)=>sum+d.backlog,0));
 assert.equal(evidence.totals.shippedAfterDayZero,comparison.base.late);
 assert.equal(evidence.totals.shippedOnDayZero,comparison.base.onTime);
 assert.ok(evidence.totals.pendingAfterHorizon>0);
 assert.equal(evidence.unshippedPromises.promisedDispatchDay,null);
});

test('M5-21: waiting remains exact with FIFO staging, no trucks, a reserve not released and no shipments',()=>{
 const {baseline,comparison,evidence}=create({
  separateTransport:true,transportUnitCapacity:0,
  pickingUnitCapacity:1000,actualOrders:300,
  supplierFill:{A:0,B:0,C:0},reservePercent:30
 });
 assert.equal(baseline.seed.separateTransport,true);
 assert.equal(comparison.base.separateTransport,true);
 assert.equal(comparison.recovered,comparison.base);
 assert.equal(comparison.recovered.completed,0);
 assert.equal(evidence.totals.shippedCompleteOrders,0);
 assert.equal(evidence.totals.pendingAfterHorizon,300);
 assert.ok(comparison.recovered.ledger.some(day=>day.stagingOrders>0));
 assert.equal(evidence.totals.stagedAwaitingTransport,comparison.recovered.endingStagingOrders);
 assert.ok(comparison.recovered.ledger.every(day=>day.reserveEvents.length===0));
 assert.equal(comparison.recovered.reserveReleaseDay,null);
 assert.equal(comparison.recovered.extraDeliveries.length,0);
 assert.equal(evidence.totals.incrementalExpenseCLP,0);
 assert.equal(evidence.transportMode,'picking-staging-transport');
 assert.equal(evidence.unshippedPromises.confirmedCustomerDeliveryDay,null);
});

test('M5-21: changing staging toggles the physical scenario baseline and never masquerades as recovery',()=>{
 const standard=createRecoveryBaseline(options);
 const staging=createRecoveryBaseline({...options,separateTransport:true});
 assert.notEqual(standard.scenarioKey,staging.scenarioKey);
 assert.notEqual(recoveryBaselineKey(options),recoveryBaselineKey({...options,separateTransport:true}));
 assert.notEqual(standard.integrated.actual,staging.integrated.actual);
 assert.equal(standard.integrated.actual.separateTransport,false);
 assert.equal(staging.integrated.actual.separateTransport,true);
 assert.throws(()=>recoveryComparison({...options,
  separateTransport:true,option:'wait',baselineSnapshot:standard}),/Baseline SKU/);
 assert.throws(()=>recoveryComparison({...options,
  separateTransport:false,option:'wait',baselineSnapshot:staging}),/Baseline SKU/);
 const w=recoveryComparison({...options,separateTransport:true,option:'wait',baselineSnapshot:staging});
 const urgent=recoveryComparison({...options,separateTransport:true,option:'emergency',baselineSnapshot:staging});
 assert.equal(w.baselineSnapshot,urgent.baselineSnapshot);
 assert.equal(w.base,urgent.base);
 assert.equal(w.recovered,w.base);
 assert.ok(urgent.recovered!==urgent.base);
 assert.equal(w.economicProxyDelta,0);
});

test('M5-21: waiting does not create extraordinary movements or receipts in canonical campaign',()=>{
 for(const params of [
  {},
  {days:0,actualOrders:100},
  {days:12,actualOrders:500,receivingUnitCapacity:0},
  {actualOrders:200,supplierFill:{A:0,B:0,C:0}},
  {qualityReleasePercent:0},
  {inventoryAccuracyPercent:0},
  {pickingUnitCapacity:0},
  {separateTransport:true,transportUnitCapacity:2},
  {separateTransport:true,transportUnitCapacity:0},
  {stock:{A:0,B:0,C:0},supplierFill:{A:0,B:0,C:0}}
 ]){
  const {comparison,evidence}=create(params);
  const campaign=campaignSnapshot({comparison,campaignId:'M5-21',plannedOrders:200});
  assert.equal(campaign.passed,true,JSON.stringify({params,checks:campaign.checks}));
  assert.equal(comparison.recovered,comparison.base);
  assert.equal(evidence.passed,true);
  assert.equal(campaign.reserveTransfers.length,0);
  assert.equal(campaign.purchaseOrders.filter(p=>p.source==='urgent').length,0);
  assert.equal(campaign.receipts.filter(p=>p.purchaseOrderId.startsWith('URG-')).length,0);
  assert.equal(campaign.shipments.length,evidence.totals.shippedCompleteOrders);
  assert.equal(campaign.operationalCost.totals.totalCostCLP,0);
  assert.equal(campaign.economicResult.totals.incrementalOperatingCostCLP,0);
  assert.equal(campaign.economicAudit.passed,true);
  approx(comparison.netCashDelta,0);
  assert.ok(evidence.daily.every(d=>d.pendingAtDayEnd>=0));
 }
});

test('M5-21: wait does not change when only recovery lead-time, coverage or financial proxies change',()=>{
 const baseline=createRecoveryBaseline(options);
 const runs=[
  {urgentArrivalDay:1,purchaseCoveragePercent:0},
  {urgentArrivalDay:13,purchaseCoveragePercent:100},
  {urgentArrivalDay:365,purchaseCoveragePercent:45},
  {urgentArrivalDay:2,purchaseCoveragePercent:10,
   unitRevenue:25000,extraCapacityDailyCost:500000,
   emergencySurchargeRate:0.6,latePenaltyPerOrderDay:30,holdingRatePerDay:0}
 ].map(x=>recoveryComparison({...options,...x,option:'wait',baselineSnapshot:baseline}));
 for(const r of runs){
  assert.equal(r.recovered,baseline.integrated.actual);
  assert.equal(r.base,baseline.integrated.actual);
  assert.equal(r.waitEvidence.totals.shippedCompleteOrders,runs[0].waitEvidence.totals.shippedCompleteOrders);
  assert.deepEqual(r.waitEvidence.daily,runs[0].waitEvidence.daily);
  assert.equal(r.waitEvidence.totals.incrementalExpenseCLP,0);
  assert.equal(r.penaltySaved,0);
  assert.equal(r.holdingDelta,0);
  assert.equal(r.economicProxyDelta,0);
 }
});

test('M5-21: repeated wait preview, cached campaign and reload preserve all physical dates and backlogs',()=>{
 const contract=campaignSkuContract({
  campaignId:'M5-WAIT-RELOAD',policy:'service',
  decisions:{commercial:'under',planning:'partial',purchasing:'reliable'},
  scenario:{demand:1000,actualDemand:1400,lockUpstream:true}
 });
 const request={contract,skuInputs:{...contract.skuInputs,separateTransport:true},
  option:'wait',urgentArrivalDay:3,purchaseCoveragePercent:40};
 const cache=createSkuSessionCache();
 const a=cache.getProjection(request);
 const b=cache.getComparison(request);
 assert.equal(a.comparison,b);
 assert.equal(a.comparison.recovered,a.comparison.base);
 assert.equal(a.comparison.waitEvidence.passed,true);
 assert.equal(a.chain.campaign.passed,true);
 const cacheReload=createSkuSessionCache();
 const restored=cacheReload.getProjection(request);
 assert.deepEqual(restored.comparison.waitEvidence,a.comparison.waitEvidence);
 assert.deepEqual(restored.chain.campaign.shipments,a.chain.campaign.shipments);
 assert.deepEqual(restored.chain.campaign.orders,a.chain.campaign.orders);
 assert.equal(restored.comparison.waitEvidence.unshippedPromises.promisedDispatchDay,null);
});

test('M5-21: forged wait proof and nonbaseline replay are rejected before display',()=>{
 const {baseline,comparison}=create();
 const good={baseline,recovered:comparison.recovered,comparison};
 assert.deepEqual(waitWithoutInterventionReadModel(good),comparison.waitEvidence);
 assert.throws(()=>waitWithoutInterventionReadModel({...good,
  recovered:{...comparison.recovered}}),/Espera sin intervenir/);
 assert.throws(()=>waitWithoutInterventionReadModel({...good,
  comparison:{...comparison,incrementalExpense:100}}),/Espera sin intervenir/);
 assert.throws(()=>waitWithoutInterventionReadModel({...good,
  comparison:{...comparison,urgent:[{id:'A',qty:1}]}}),/Espera sin intervenir/);
 assert.throws(()=>waitWithoutInterventionReadModel({...good,
  comparison:{...comparison,netCashDelta:1000}}),/Espera sin intervenir/);
 const forgedOrders={...comparison.base,ordersDetail:comparison.base.ordersDetail.map((o,i)=>i===0?
  {...o,fulfilledDay:999}:o)};
 assert.throws(()=>waitWithoutInterventionReadModel({...good,
  baseline:{...baseline,integrated:{...baseline.integrated,actual:forgedOrders}},
  recovered:forgedOrders}),/Espera sin intervenir/);
});
