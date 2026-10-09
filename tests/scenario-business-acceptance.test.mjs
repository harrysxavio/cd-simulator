import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS} from '../src/engine.js';
import {flow,diagnose} from '../src/flow.js';
import {DEFAULT_SCENARIO} from '../src/scenario.js';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {recoveryComparison} from '../src/recovery.js';
import {skuAudit} from '../src/audit.js';
import {campaignSnapshot} from '../src/campaign.js';

const decisions={...DEFAULTS,commercial:'under',planning:'partial',purchasing:'reliable'};
const scenario={...DEFAULT_SCENARIO,demand:1000,actualDemand:1400,lockUpstream:true};
const contract=()=>campaignSkuContract({decisions,actions:{},scenario,policy:'service',plannedSampleOrders:200,campaignId:'CASE-UNDERFORECAST'});
const run=(option,arrival=1,extras={})=>recoveryComparison({...contract().skuInputs,option,urgentArrivalDay:arrival,purchaseCoveragePercent:100,...extras});
const report=(name,r)=>console.log('SCENARIO_AUDIT '+JSON.stringify({case:name,plannedOrders:r.integrated.planned.orders,actualOrders:r.recovered.orders,forecastOrders:r.forecastOrders,plannedPurchase:r.originalPurchase,originalPurchaseCLP:r.committedPurchaseValue,extraPurchase:r.urgent.map(({id,qty,day})=>({sku:id,qty,arrivalDay:day})),shipped:r.recovered.completed,pending:r.recovered.pending,baselineShipped:r.base.completed,baselinePending:r.base.pending,incrementalCashCLP:Math.round(r.netCashDelta),extraExpenseCLP:Math.round(r.incrementalExpense),receivedExtra:r.recovered.ledger.reduce((n,d)=>n+Object.values(d.receivedUrgent).reduce((a,v)=>a+v,0),0)}));

test('CASE 1: low forecast and underpurchase followed by 40% demand shock, other areas normal',()=>{
 const planned=flow(decisions,{}, {...scenario,actualDemand:1000,lockUpstream:false});
 const actual=flow(decisions,{},scenario);
 assert.equal(planned.plannedDemand,1000);
 assert.equal(planned.estimated,800);
 assert.equal(planned.ordered,385);
 assert.equal(planned.delivered,365);
 assert.equal(actual.demand,1400);
 assert.equal(actual.ordered,planned.ordered,'No retroactive change to original purchase');
 assert.equal(actual.delivered,planned.delivered);
 assert.equal(actual.received,planned.received);
 assert.equal(actual.dispatched,planned.dispatched,'Demand shock must not create physical stock');
 assert.equal(actual.pending,1400-actual.dispatched);
 assert.ok(actual.pending>planned.pending);
 assert.ok(actual.pickingCapacity>actual.available,'Do not prescribe more picking workers if inventory is scarce');
 assert.ok(actual.stages[7].capacity>actual.dispatched,'Do not prescribe transport capacity when there is no stock');
 const d=diagnose(decisions,{},scenario);
 for(const id of ['commercial','planning','purchasing'])assert.equal(d.findings.find(f=>f.id===id).potential,0,'Historical purchase must remain frozen after demand reveal');
 console.log('SCENARIO_AGGREGATE '+JSON.stringify({planned:1000,forecast:planned.estimated,originalPurchaseUnits:planned.ordered,originalSupplierDeliveryUnits:planned.delivered,availableForPickingUnits:actual.available,shippedUnits:actual.dispatched,actualDemandUnits:1400,pendingUnits:actual.pending,pickingCapacity:actual.pickingCapacity,transportCapacity:actual.stages[7].capacity}));
});

test('CASE 2: same SKU campaign with frozen original POs; compare wait/overtime/urgent purchase and combined',()=>{
 const c=contract(),baseline=run('wait'),overtime=run('overtime'),urgent=run('emergency'),combined=run('combined');
 assert.equal(c.actualSampleOrders,280);
 assert.equal(c.plannedSampleOrders,200);
 assert.equal(c.skuInputs.plannedForecastPercent,80);
 assert.equal(c.skuInputs.planningCoveragePercent,70);
 assert.equal(baseline.forecastOrders,160);
 for(const r of [baseline,overtime,urgent,combined]){
  assert.deepEqual(r.originalPurchase,baseline.originalPurchase,'Purchases changed after shock');
  assert.equal(r.recovered.orders,280);
  assert.equal(r.recovered.completed+r.recovered.pending,280);
  assert.equal(skuAudit({...c.skuInputs,option:r.option,urgentArrivalDay:1,purchaseCoveragePercent:100,comparisonResult:r}).passed,true);
  assert.equal(campaignSnapshot({comparison:r,campaignId:'CASE-UNDERFORECAST'}).passed,true);
  report(r.option,r);
 }
 assert.ok(baseline.recovered.pending>0,'Expected demand shock to create shortage');
 assert.equal(overtime.recovered.completed,baseline.recovered.completed,'Extra labor should not help when inventory, not capacity, is the bottleneck');
 assert.ok(overtime.incrementalExpense>0,'Overtime should have explicit cost even with no service gain');
 assert.ok(urgent.urgent.reduce((n,p)=>n+p.qty,0)>0,'A new extraordinary order must be possible');
 assert.ok(urgent.recovered.completed>baseline.recovered.completed,'A day-1 urgent arrival with normal areas should rescue at least some orders');
 assert.ok(combined.recovered.completed>=urgent.recovered.completed);
 assert.ok(urgent.recovered.ledger.every(d=>d.receiptEvents.every(e=>e.day===d.day)));
 assert.ok(urgent.recovered.ledger[0].receivedUrgent.A===0,'Urgent purchases cannot arrive before day 1');
});

test('CASE 3: late emergency purchase cannot rescue orders within the 12-day campaign',()=>{
 const base=run('wait'),late=run('emergency',13);
 assert.deepEqual(base.originalPurchase,late.originalPurchase);
 assert.ok(late.urgent.length>0);
 assert.equal(late.recovered.completed,base.recovered.completed);
 assert.equal(late.recovered.pending,base.recovered.pending);
 assert.ok(late.recovered.ledger.every(d=>Object.values(d.receivedUrgent).every(q=>q===0)));
 assert.ok(late.incrementalExpense>0,'An irrevocable order carries an incremental modeled commitment even if not received');
 report('emergency-after-horizon',late);
});

test('CASE 4: zero receiving capacity blocks purchases despite supplier promises',()=>{
 const x=run('emergency',1,{receivingUnitCapacity:0});
 assert.equal(x.recovered.ledger.reduce((n,d)=>n+Object.values(d.received).reduce((s,v)=>s+v,0),0),0);
 assert.ok(x.recovered.waitingReceiving>0);
 assert.equal(x.recovered.completed,x.base.completed);
 assert.equal(campaignSnapshot({comparison:x}).passed,true);
 report('no-receiving-capacity',x);
});

test('CASE 5: Quality quarantine and delivery bottlenecks must be recognized before recommending purchases',()=>{
 for(const [label,opts] of [
  ['quality-not-releasing',{qualityReleasePercent:0}],
  ['picking-zero-capacity',{pickingUnitCapacity:0}],
  ['transport-zero-capacity',{transportUnitCapacity:0}]
 ]){
  const r=run('emergency',1,opts);
  assert.equal(campaignSnapshot({comparison:r}).passed,true,JSON.stringify({label}));
  assert.equal(skuAudit({...contract().skuInputs,option:'emergency',urgentArrivalDay:1,purchaseCoveragePercent:100,...opts,comparisonResult:r}).passed,true);
  if(label==='picking-zero-capacity'||label==='transport-zero-capacity')assert.equal(r.recovered.completed,0);
  assert.ok(r.urgent.length>0);
  report(label,r);
 }
});

test('CASE 6: downward surprise and overplanning retain original POs and physically conserve unsold inventory',()=>{
 const c=campaignSkuContract({decisions:{...DEFAULTS,commercial:'over',planning:'buffer',purchasing:'reliable'},scenario:{...DEFAULT_SCENARIO,demand:1000,actualDemand:600,lockUpstream:true},policy:'service',plannedSampleOrders:200});
 const planned=recoveryComparison({...c.skuInputs,actualOrders:200,option:'wait'}),lower=recoveryComparison({...c.skuInputs,option:'wait'});
 assert.deepEqual(planned.originalPurchase,lower.originalPurchase);
 assert.equal(lower.recovered.orders,120);
 assert.equal(lower.recovered.completed+lower.recovered.pending,120);
 assert.ok(lower.recovered.ledger.at(-1).stock.A>=0);
 assert.equal(campaignSnapshot({comparison:lower}).passed,true);
 report('downward-demand-surprise',lower);
});
