import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveryBaseline} from '../src/recovery-baseline.js';
import {recoveryComparison} from '../src/recovery.js';
import {consolidatedRecoveryComparisonReadModel} from '../src/recovery-consolidated.js';

const defaults={policy:'service',plannedOrders:200,actualOrders:280,days:12,
 plannedForecastPercent:80,planningCoveragePercent:70,reservePercent:20};
const make=(changes={},selectedOption='combined')=>{
 const i={...defaults,...changes};
 const base=createRecoveryBaseline(i);
 const comparisons=['wait','reserve','overtime','emergency','combined'].map(option=>
  recoveryComparison({...i,option,urgentArrivalDay:2,purchaseCoveragePercent:75,baselineSnapshot:base}));
 return {base,comparisons,view:consolidatedRecoveryComparisonReadModel({comparisons,selectedOption})};
};
const sum=(a,k)=>a.reduce((n,v)=>n+v[k],0);

test('M5-26: single-screen physical baseline / selected / difference reconciles every day',()=>{
 const {base,comparisons,view}=make({dailyCapacity:0,actualOrders:260,days:4},'combined');
 const chosen=comparisons.find(x=>x.option==='combined');
 assert.equal(view.passed,true);
 assert.equal(view.baselineKey,base.scenarioKey);
 assert.equal(view.horizonDays,4);
 assert.equal(view.daily.length,5);
 assert.equal(view.alternatives.length,5);
 assert.equal(view.demandOrders,260);
 assert.equal(view.baseline.completed,base.integrated.actual.completed);
 assert.equal(view.baseline.pending,base.integrated.actual.pending);
 assert.equal(view.selected.shippedOrders,chosen.recovered.completed);
 assert.equal(view.selected.pendingOrders,chosen.recovered.pending);
 assert.equal(view.differences.dispatchedOrders,chosen.recovered.completed-base.integrated.actual.completed);
 assert.equal(view.differences.pendingOrders,-view.differences.dispatchedOrders);
 assert.equal(view.selected.backlogOrderDays,chosen.backlogDaysRecovered);
 assert.equal(view.baseline.backlogOrderDays,chosen.backlogDaysBase);
 assert.equal(view.differences.backlogOrderDays,chosen.backlogDaysRecovered-chosen.backlogDaysBase);
 assert.equal(sum(view.daily,'dispatchedDelta'),view.differences.dispatchedOrders);
 assert.equal(view.daily.at(-1).cumulativeDelta,view.differences.dispatchedOrders);
 assert.equal(view.selected.firstDispatchDay===null,chosen.recovered.completed===0);
 assert.equal(view.selected.lastDispatchDay===null,chosen.recovered.completed===0);
 assert.equal(view.datePolicy,'day-index-of-simulated-campaign-not-customer-ETA');
 assert.equal(view.noPromisedDayForUnshipped,true);
 assert.ok(Object.values(view.checks).every(Boolean));
 assert.ok(Object.isFrozen(view)&&Object.isFrozen(view.selected)&&Object.isFrozen(view.daily[0]));
 assert.throws(()=>{view.daily[0].dispatchedDelta=99},TypeError);
});

test('M5-26: all five choices share one initial inventory, PO and baseline; one selected row',()=>{
 const {base,comparisons}=make();
 for(const option of ['wait','reserve','overtime','emergency','combined']){
  const view=consolidatedRecoveryComparisonReadModel({comparisons,selectedOption:option});
  const selected=comparisons.find(x=>x.option===option);
  assert.equal(view.selectedOption,option);
  assert.equal(view.selected.option,option);
  assert.equal(view.baselineKey,base.scenarioKey);
  assert.equal(view.selected.shippedOrders,selected.recovered.completed);
  assert.equal(view.selected.incrementalCommitmentAndCostProxyCLP,selected.incrementalExpense);
  assert.equal(view.differences.simplifiedNetDeltaCLP,selected.netCashDelta);
  assert.equal(view.differences.economicDecisionProxyDeltaCLP,selected.economicProxyDelta);
  assert.equal(view.observations.length,4);
  assert.equal(view.observations.find(x=>x.id==='pending').quantity,selected.recovered.pending);
  assert.ok(view.daily.every((d,i)=>d.baselineShipped===base.integrated.actual.ledger[i].shipped));
  assert.deepEqual(view.alternatives.map(x=>x.option),['wait','reserve','overtime','emergency','combined']);
 }
});

test('M5-26: waiting has identical physical dates and zero incremental cost',()=>{
 const {view}=make({},'wait');
 assert.equal(view.differences.dispatchedOrders,0);
 assert.equal(view.differences.pendingOrders,0);
 assert.equal(view.differences.backlogOrderDays,0);
 assert.equal(view.differences.incrementalExpenseCLP,0);
 assert.equal(view.differences.potentialDispatchValueDeltaCLP,0);
 assert.equal(view.differences.simplifiedNetDeltaCLP,0);
 assert.ok(view.daily.every(x=>x.dispatchedDelta===0&&x.cumulativeDelta===0));
 assert.equal(view.selected.firstDispatchDay,view.baseline.firstDispatchDay);
 assert.equal(view.selected.lastDispatchDay,view.baseline.lastDispatchDay);
});

test('M5-26: no physical stock, no receipts => no fictional first-dispatch promise',()=>{
 const {view}=make({stock:{A:0,B:0,C:0},supplierFill:{A:0,B:0,C:0},
  receivingUnitCapacity:0,days:3},'emergency');
 assert.equal(view.baseline.firstDispatchDay,null);
 assert.equal(view.selected.firstDispatchDay,null);
 assert.equal(view.selected.lastDispatchDay,null);
 assert.equal(view.selected.shippedOrders,0);
 assert.equal(view.selected.pendingOrders,280);
 assert.ok(view.selected.urgentPurchasePrincipalCLP>0);
 assert.ok(view.selected.incrementalCommitmentAndCostProxyCLP>0);
 assert.equal(view.differences.potentialDispatchValueDeltaCLP,0);
 assert.ok(view.daily.every(x=>x.alternativeShipped===0));
 assert.ok(view.observations.some(x=>x.id==='pending'&&x.quantity===280));
});

test('M5-26: with blocked transport and staging, do not label prepared as shipped',()=>{
 const {view,comparisons}=make({separateTransport:true,transportUnitCapacity:0,
  pickingUnitCapacity:1000,days:3,actualOrders:300},'combined');
 const joint=comparisons.find(x=>x.option==='combined');
 assert.equal(view.selected.shippedOrders,0);
 assert.equal(view.selected.pendingOrders,300);
 assert.equal(view.differences.dispatchedOrders,0);
 assert.ok(joint.recovered.ledger.some(x=>x.pickedOrders>0));
 assert.ok(view.observations.find(x=>x.id==='transport').quantity>0);
 assert.equal(view.selected.firstDispatchDay,null);
});

test('M5-26: arrival beyond horizon has commitment but no extra dispatch',()=>{
 const args={...defaults,stock:{A:0,B:0,C:0},supplierFill:{A:0,B:0,C:0},
  days:2};
 const base=createRecoveryBaseline(args);
 const comparisons=['wait','reserve','overtime','emergency','combined'].map(option=>
  recoveryComparison({...args,option,urgentArrivalDay:13,purchaseCoveragePercent:100,baselineSnapshot:base}));
 const view=consolidatedRecoveryComparisonReadModel({comparisons,selectedOption:'emergency'});
 assert.equal(view.selected.shippedOrders,0);
 assert.equal(view.differences.dispatchedOrders,0);
 assert.equal(view.selected.firstDispatchDay,null);
 assert.ok(view.selected.urgentPurchasePrincipalCLP>0);
 assert.equal(view.differences.pendingOrders,0);
});

test('M5-26: mismatched baseline, dates, prices, shipments and option duplicates are rejected',()=>{
 const {comparisons}=make({days:3});
 const rejects=edit=>assert.throws(()=>consolidatedRecoveryComparisonReadModel({
  selectedOption:'combined',comparisons:comparisons.map(edit)
 }),/Comparador consolidado SKU/);
 rejects(x=>x.option==='combined'?{...x,baselineSnapshot:{...x.baselineSnapshot}}:x);
 rejects(x=>x.option==='reserve'?{...x,urgentArrivalDay:13}:x);
 rejects(x=>x.option==='emergency'?{...x,incrementalExpense:x.incrementalExpense+1}:x);
 rejects(x=>x.option==='combined'?{...x,recovered:{...x.recovered,ledger:x.recovered.ledger.map((d,i)=>i===0?{...d,shipped:d.shipped+1}:d)}}:x);
 rejects(x=>x.option==='overtime'?{...x,unitRevenue:x.unitRevenue+1}:x);
 assert.throws(()=>consolidatedRecoveryComparisonReadModel({
  comparisons:[...comparisons.slice(0,4),comparisons[0]],selectedOption:'wait'}),/Comparador consolidado SKU/);
 assert.throws(()=>consolidatedRecoveryComparisonReadModel({
  comparisons,selectedOption:'unknown'}),/Comparador consolidado SKU/);
});
