import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS} from '../src/engine.js';
import {DEFAULT_SCENARIO} from '../src/scenario.js';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';
import {skuServiceBrief} from '../src/sku-service.js';

// Reuse the canonical shipment/read-model; never simulate a separate forecast.
function observe(option='wait',settings={}){
 const contract=campaignSkuContract({
  decisions:{...DEFAULTS,commercial:'under',planning:'partial',purchasing:'reliable'},
  scenario:{...DEFAULT_SCENARIO,demand:1000,actualDemand:1400,lockUpstream:true},
  policy:'service',campaignId:'SERVICE-23',plannedSampleOrders:200
 });
 const comparison=recoveryComparison({...contract.skuInputs,option,...settings});
 const campaign=campaignSnapshot({comparison,campaignId:contract.campaignId,plannedOrders:200});
 const areas=campaignAreaReadModel({comparison,campaign,campaignId:contract.campaignId,plannedOrders:200});
 return {areas,service:skuServiceBrief(areas)};
}

test('M2/M3: same order totals appear in service diagnosis and canonical areas',()=>{
 for(const [option,settings] of [['wait',{}],['reserve',{reservePercent:20,urgentArrivalDay:1}],['emergency',{urgentArrivalDay:1}],['emergency',{urgentArrivalDay:13}]]){
  const {areas,service}=observe(option,settings);
  assert.equal(service.scope,'sku-cohort');
  assert.equal(service.actualOrders,areas.metrics.actualOrders);
  assert.equal(service.shippedOrders,areas.metrics.shippedOrders);
  assert.equal(service.pendingOrders,areas.metrics.pendingOrders);
  assert.equal(service.shippedOrders+service.pendingOrders,service.actualOrders);
  assert.equal(service.horizonDays,areas.horizonDays);
  // M2-01: these values share a cohort and a day horizon, not an aggregate shift.
  assert.equal(areas.measurements.actualOrders.unit,'orders');
  assert.equal(areas.measurements.shippedSkuUnits.unit,'sku-units');
  assert.equal(areas.measurements.actualOrders.horizonDays,areas.horizonDays);
  assert.deepEqual(service.measurements,areas.measurements);
  assert.equal(service.completionPercent,100*service.shippedOrders/service.actualOrders);
  assert.match(service.boundary,/no son unidades de una jornada ni entregas confirmadas/);
  assert.ok(Object.isFrozen(service));
 }
});

test('M2/M3: no false root cause is assigned when Receiving or Picking is blocked',()=>{
 for(const restriction of [{receivingUnitCapacity:0},{qualityReleasePercent:0},{pickingUnitCapacity:0},{transportUnitCapacity:0}]){
  const {areas,service}=observe('wait',restriction);
  assert.equal(service.shippedOrders,areas.metrics.shippedOrders);
  assert.equal(service.pendingOrders,areas.metrics.pendingOrders);
  assert.ok(service.pendingOrders>0);
  assert.match(service.reading,/Revisa Compras, Recepción, Calidad/);
  assert.ok(!('rootCause' in service));
 }
});

test('M2/M3: invalid, nonreconciled or tampered read models are rejected',()=>{
 const {areas}=observe();
 assert.throws(()=>skuServiceBrief(),/conciliada/);
 assert.throws(()=>skuServiceBrief({...areas,passed:false}),/conciliada/);
 assert.throws(()=>skuServiceBrief({...areas,checks:{...areas.checks,allOrders:false}}),/conciliada/);
 assert.throws(()=>skuServiceBrief({...areas,metrics:{...areas.metrics,pendingOrders:3}}),/no concilian/);
 assert.throws(()=>skuServiceBrief({...areas,measurements:{...areas.measurements,shippedOrders:{...areas.measurements.shippedOrders,unit:'sku-units'}}}),/unidades/);
});
