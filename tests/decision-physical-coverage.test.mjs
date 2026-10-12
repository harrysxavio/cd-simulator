import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {recoveryComparison} from '../src/recovery.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';
import {decisionPhysicalCoverage} from '../src/decision-physical-coverage.js';

const decisions={
 commercial:'accurate',planning:'full',purchasing:'reliable',receiving:'normal',
 quality:'normal',inventory:'normal',picking:'normal',transport:'normal'
};
function sample({staging=false,shock=30,option='wait'}={}){
 const contract=campaignSkuContract({
  campaignId:'M2-04C',decisions,scenario:{demand:1000,actualDemand:1000+10*shock,lockUpstream:true}
 });
 const comparison=recoveryComparison({...contract.skuInputs,option,separateTransport:staging});
 const areaModel=campaignAreaReadModel({
  comparison,campaignId:contract.campaignId,plannedOrders:contract.plannedSampleOrders
 });
 return {contract,comparison,areaModel};
}
test('M2-04c: eight area decisions are hypotheses and only dated SKU events are physical evidence',()=>{
 const {contract,areaModel}=sample({staging:true});
 const audit=decisionPhysicalCoverage({boundaryAudit:contract.boundaryAudit,areaModel});
 assert.equal(audit.passed,true);
 assert.equal(audit.managementScope,'aggregate-shift');
 assert.equal(audit.scope,'sku-cohort');
 assert.equal(audit.assumptionsAreCalibrated,false);
 assert.equal(audit.eventEvidenceIsSimulated,true);
 assert.equal(audit.noCustomerDeliveryProof,true);
 assert.equal(audit.areas.length,8);
 assert.deepEqual(audit.areas.map(a=>a.area),
  ['commercial','planning','purchasing','receiving','quality','inventory','picking','transport']);
 assert.deepEqual(audit.areas.map(a=>a.evidenceClass),[
  'managerial-plan','managerial-plan',
  'dated-simulation','dated-simulation','dated-simulation',
  'dated-simulation','dated-simulation','dated-simulation'
 ]);
 assert.equal(audit.areas.find(a=>a.area==='inventory').evidenceSource,'inventoryLedger.daily');
 assert.ok(audit.areas.every(a=>a.inputClass==='hypothesis-from-aggregate-shift'));
 assert.ok(audit.areas.every(a=>a.dailyCapacityCalibrated===false));
 assert.ok(Object.isFrozen(audit)&&Object.isFrozen(audit.areas)&&Object.isFrozen(audit.areas[0]));
 assert.throws(()=>{audit.areas[0].evidenceClass='dated-simulation'},TypeError);
});

test('M2-04c: regular and staging modes keep a single SKU ledger and no delivery proof',()=>{
 for(const staging of [false,true]){
  const {contract,areaModel}=sample({staging,shock:40,option:'reserve'});
  const audit=decisionPhysicalCoverage({boundaryAudit:contract.boundaryAudit,areaModel});
  assert.equal(audit.passed,true);
  assert.equal(audit.horizonDays,12);
  assert.equal(audit.campaignId,contract.campaignId);
  assert.equal(areaModel.chainAudit.totals.orders,contract.actualSampleOrders);
  assert.equal(areaModel.metrics.customerDeliveries,null);
  assert.ok(staging||areaModel.metrics.stagedOrders===0);
 }
});

test('M2-04c: reject false outcome, altered evidence or mixing aggregate and SKU scopes',()=>{
 const {contract,areaModel}=sample();
 const build=(changes={})=>decisionPhysicalCoverage({
  boundaryAudit:changes.boundaryAudit??contract.boundaryAudit,
  areaModel:changes.areaModel??areaModel
 });
 const forgedStage=areaModel.stages.map((row,i)=>i===5?{...row,evidence:['flow.stock']} :row);
 assert.throws(()=>build({areaModel:{...areaModel,stages:forgedStage}}),/fuente o secuencia/);
 const forgedDelivery={...areaModel,metrics:{...areaModel.metrics,customerDeliveries:17}};
 assert.throws(()=>build({areaModel:forgedDelivery}),/no concilian/);
 const forgedDemand={...contract.boundaryAudit,sampleOrders:{planned:200,actual:999}};
 assert.throws(()=>build({boundaryAudit:forgedDemand}),/no concilian/);
 const wrongMode=areaModel.stages.map((row,i)=>i===7?{...row,scope:'aggregate-shift'}:row);
 assert.throws(()=>build({areaModel:{...areaModel,stages:wrongMode}}),/modo/);
});
