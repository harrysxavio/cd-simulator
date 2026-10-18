import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveryBaseline} from '../src/recovery-baseline.js';
import {recoveryComparison} from '../src/recovery.js';
import {consolidatedRecoveryComparisonReadModel} from '../src/recovery-consolidated.js';
import {decisionExplanationReadModel} from '../src/recovery-decision-explanation.js';

const common={policy:'service',plannedOrders:200,actualOrders:280,days:12,
 plannedForecastPercent:80,planningCoveragePercent:70,reservePercent:20};
const make=(changes={},selectedOption='combined',arrival=2)=>{
 const i={...common,...changes},base=createRecoveryBaseline(i);
 const comparisons=['wait','reserve','overtime','emergency','combined'].map(option=>
  recoveryComparison({...i,option,urgentArrivalDay:arrival,
   purchaseCoveragePercent:100,baselineSnapshot:base}));
 const comparison=consolidatedRecoveryComparisonReadModel({comparisons,selectedOption});
 return {base,comparison,comparisons};
};

test('M6-32: all five decisions have coherent didactic stages from the same immutable comparison',()=>{
 const {base,comparison}=make();
 const snapshot=JSON.stringify(base);
 for(const option of ['wait','reserve','overtime','emergency','combined']){
  const reading=decisionExplanationReadModel({comparison,option});
  const alternative=comparison.alternatives.find(x=>x.option===option);
  assert.equal(reading.passed,true);
  assert.equal(reading.scope,'sku-cohort');
  assert.equal(reading.type,'situation-action-effect-evidence');
  assert.equal(reading.baselineKey,base.scenarioKey);
  assert.equal(reading.orders,280);
  assert.equal(reading.option,option);
  assert.ok(reading.situation.includes('280 pedidos'));
  assert.ok(reading.action.length>20);
  assert.ok(reading.effect.includes(String(alternative.shippedOrders)));
  assert.ok(reading.interpretation.length>20);
  assert.deepEqual(reading.evidence.rows.map(x=>x.id),['orders','pending','waiting']);
  assert.equal(reading.evidence.rows[0].observed,alternative.shippedOrders);
  assert.equal(reading.evidence.rows[1].observed,alternative.pendingOrders);
  assert.equal(reading.evidence.rows[2].observed,alternative.backlogOrderDays);
  assert.ok(reading.limits.some(x=>x.includes('entrega final')));
  assert.ok(reading.limits.some(x=>x.includes('costo total')));
  assert.ok(Object.values(reading.checks).every(Boolean));
  assert.ok(Object.isFrozen(reading)&&Object.isFrozen(reading.evidence.rows[0]));
  assert.throws(()=>{reading.evidence.rows[0].observed=999},TypeError);
 }
 assert.equal(JSON.stringify(base),snapshot);
});

test('M6-32: no-action reads the unchanged original without inventing a charge',()=>{
 const {comparison}=make({},'wait');
 const r=decisionExplanationReadModel({comparison});
 assert.equal(r.option,'wait');
 assert.equal(r.status,'no-new-action');
 assert.equal(r.evidence.incrementalModeledCommitmentCLP,0);
 assert.equal(r.evidence.rows[0].baseline,r.evidence.rows[0].observed);
 assert.equal(r.evidence.rows[1].baseline,r.evidence.rows[1].observed);
 assert.match(r.action,/No activar/);
});

test('M6-32: reserve stock is existing inventory, no urgent PO and unpriced is not free',()=>{
 const {comparison}=make({reservePercent:40},'reserve');
 const r=decisionExplanationReadModel({comparison,option:'reserve'});
 assert.match(r.action,/stock que ya existe/);
 assert.match(r.evidence.costExplanation,/costo desconocido, NO CLP 0/);
 assert.equal(r.evidence.urgentPurchasePrincipalCLP,0);
 assert.ok(r.limits.some(x=>/reserva/.test(x)));
});

test('M6-32: all purchases and combined option label hypothetical costs, not bank payment',()=>{
 const {comparison}=make();
 for(const option of ['overtime','emergency','combined']){
  const r=decisionExplanationReadModel({comparison,option});
  assert.match(r.evidence.costExplanation,/Compromiso\/costo incremental ilustrativo/);
  assert.match(r.evidence.costExplanation,/No es caja pagada/);
  assert.ok(r.limits.some(x=>/caja ejecutada/.test(x)));
  if(option==='combined')assert.ok(r.limits.some(x=>/corrida física propia/.test(x)));
  if(option==='emergency'||option==='combined')
   assert.ok(r.limits.some(x=>/orden urgente no equivale/.test(x)));
 }
});

test('M6-32: no-gain urgent purchase cannot imply recovered service, late arrival or customer delivery',()=>{
 const {comparison}=make({
  stock:{A:0,B:0,C:0},supplierFill:{A:0,B:0,C:0},
  receivingUnitCapacity:0,days:2
 },'emergency',13);
 const r=decisionExplanationReadModel({comparison,option:'emergency'});
 assert.equal(r.status,'commitment-no-gain');
 assert.equal(r.evidence.rows[0].observed,0);
 assert.equal(r.evidence.rows[1].observed,280);
 assert.equal(r.evidence.dates,'No hay despacho desde el CD dentro del horizonte.');
 assert.match(r.interpretation,/compromiso adicional/);
 assert.ok(r.evidence.incrementalModeledCommitmentCLP>0);
 assert.ok(r.limits.some(x=>/OTIF/.test(x)));
});

test('M6-32: reject altered summaries, missing choices, bad costs, non-audited input and unknown option',()=>{
 const {comparison}=make({days:3});
 const read=x=>decisionExplanationReadModel({comparison:x,option:'combined'});
 assert.throws(()=>read({...comparison,passed:false}),/Explicación SKU/);
 assert.throws(()=>read({...comparison,checks:{...comparison.checks,realDispatchEvents:false}}),/Explicación SKU/);
 assert.throws(()=>read({...comparison,alternatives:comparison.alternatives.slice(0,4)}),/Explicación SKU/);
 assert.throws(()=>read({...comparison,alternatives:comparison.alternatives.map(x=>
  x.option==='combined'?{...x,pendingOrders:x.pendingOrders+1}:x)}),/Explicación SKU/);
 assert.throws(()=>read({...comparison,alternatives:comparison.alternatives.map(x=>
  x.option==='combined'?{...x,incrementalCommitmentAndCostProxyCLP:-1}:x)}),/Explicación SKU/);
 assert.throws(()=>decisionExplanationReadModel({comparison,option:'fake'}),/Explicación SKU/);
});
