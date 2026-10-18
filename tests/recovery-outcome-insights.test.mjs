import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveryBaseline} from '../src/recovery-baseline.js';
import {recoveryComparison} from '../src/recovery.js';
import {consolidatedRecoveryComparisonReadModel} from '../src/recovery-consolidated.js';
import {interpretRecoveryOutcomeReadModel} from '../src/recovery-outcome-insights.js';
const options=['wait','reserve','overtime','emergency','combined'];
const make=(inputs={},selectedOption='combined',urgentArrivalDay=2)=>{
 const i={policy:'service',plannedOrders:200,actualOrders:280,days:12,
  plannedForecastPercent:80,planningCoveragePercent:70,reservePercent:20,...inputs};
 const base=createRecoveryBaseline(i);
 const comparisons=options.map(option=>recoveryComparison({...i,option,
  urgentArrivalDay,purchaseCoveragePercent:100,baselineSnapshot:base}));
 return {base,comparison:consolidatedRecoveryComparisonReadModel({comparisons,selectedOption})};
};

test('M7-37: classify all three signals from the same frozen SKU ledger without replay',()=>{
 const {base,comparison}=make();
 const snapshot=JSON.stringify(base);
 const x=interpretRecoveryOutcomeReadModel({comparison});
 assert.equal(x.passed,true);assert.equal(x.type,'what-improved-what-worsened');
 assert.equal(x.baselineKey,base.scenarioKey);
 assert.equal(x.orders,280);assert.equal(x.horizonDays,12);
 assert.equal(x.selectedOption,'combined');
 assert.deepEqual(x.signals.map(s=>s.id),['service','waiting','cost']);
 assert.equal(x.signals[0].delta,comparison.selected.shippedOrders-comparison.baseline.completed);
 assert.equal(x.signals[1].delta,comparison.selected.backlogOrderDays-comparison.baseline.backlogOrderDays);
 assert.equal(x.current.dispatched+x.current.pending,280);
 assert.ok(x.signals.every(s=>s.text.length>32));
 assert.ok(Object.values(x.checks).every(Boolean));
 assert.ok(x.limitations.some(s=>s.includes('entrega confirmada')));
 assert.ok(x.limitations.some(s=>s.includes('costo total')));
 assert.ok(Object.isFrozen(x)&&Object.isFrozen(x.signals[0]));
 assert.throws(()=>{x.signals[0].status='fake'},TypeError);
 assert.equal(JSON.stringify(base),snapshot);
});

test('M7-37: wait correctly means no change, not cost-free overall operation',()=>{
 const {comparison}=make({},'wait');
 const x=interpretRecoveryOutcomeReadModel({comparison});
 assert.equal(x.signals[0].status,'same');
 assert.equal(x.signals[1].status,'same');
 assert.equal(x.signals[2].status,'same');
 assert.match(x.signals[2].text,/costo total de la operación no es CLP 0/);
 assert.match(x.headline,/Mismos pedidos/);
});

test('M7-37: reserve always reports unknown cost, even with zero modeled proxy',()=>{
 const {comparison}=make({reservePercent:40},'reserve');
 const x=interpretRecoveryOutcomeReadModel({comparison});
 assert.equal(x.signals[2].status,'unknown');
 assert.equal(x.signals[2].delta,null);
 assert.match(x.signals[2].text,/sin tarifa/);
 assert.match(x.signals[2].text,/costo total es desconocido/);
 assert.match(x.caution,/tarifar el traslado/);
});

test('M7-37: urgent purchase spending without additional shipments is a warning, not a gain',()=>{
 const {comparison}=make({stock:{A:0,B:0,C:0},receivingUnitCapacity:0,
  qualityReleasePercent:0,days:3},'emergency',2);
 const x=interpretRecoveryOutcomeReadModel({comparison});
 assert.equal(x.signals[0].status,'same');
 assert.equal(x.current.dispatched,comparison.baseline.completed);
 assert.ok(comparison.selected.incrementalCommitmentAndCostProxyCLP>0);
 assert.match(x.caution,/sin mejora en pedidos expedidos/);
 assert.equal(x.signals[2].status,'partial');
});

test('M7-37: classify improvement, deterioration and wait direction independently',()=>{
 const {comparison}=make();
 const x=interpretRecoveryOutcomeReadModel({comparison});
 const service=comparison.selected.shippedOrders-comparison.baseline.completed;
 const waiting=comparison.selected.backlogOrderDays-comparison.baseline.backlogOrderDays;
 const label=d=>d===0?'same':d>0?'better':'worse';
 assert.equal(x.signals[0].status,label(service));
 assert.equal(x.signals[1].status,waiting===0?'same':waiting<0?'better':'worse');
 assert.ok(x.limitations.every(s=>!s.includes('100% garantizado')));
});

test('M7-37: fail closed on tampered audit, pending orders and backlog',()=>{
 const {comparison}=make();
 const fail=cmp=>assert.throws(()=>interpretRecoveryOutcomeReadModel({comparison:cmp}),
  /Comparación legible SKU|Lectura de resultado/);
 fail({...comparison,passed:false});
 fail({...comparison,checks:{...comparison.checks,realDispatchEvents:false}});
 fail({...comparison,alternatives:comparison.alternatives.slice(1)});
 fail({...comparison,selected:{...comparison.selected,
  shippedOrders:comparison.selected.shippedOrders+1}});
 fail({...comparison,selected:{...comparison.selected,backlogOrderDays:-1}});
 fail({...comparison,selected:{...comparison.selected,
  ordersDelta:comparison.selected.ordersDelta+1}});
});
