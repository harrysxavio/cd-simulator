import test from 'node:test';
import assert from 'node:assert/strict';
import {
 SESSION_SCHEMA_VERSION,SESSION_STORAGE_KEY,deserializeSession,serializeSession,
 normalizeSessionRecord
} from '../src/session-state.js';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {createSkuRecoveryDecision,skuDecisionStatus} from '../src/sku-decision.js';
import {DEFAULT_SCENARIO} from '../src/scenario.js';

const ID='CD-SESSION-TEST';
const options={fallbackCampaignId:ID};
const saved={campaignId:ID,currentSection:'dashboard',schemaVersion:2,
 decisions:{commercial:'under',planning:'partial',purchasing:'reliable',values:{quality:90,receiving:500}},
 actions:{receiving:25},active:6,phase:'recover',strategy:'balanced',revealed:true,shockDirection:-1,
 scenario:{...DEFAULT_SCENARIO,demand:1200,demandShockPercent:40},skuPolicy:'service',skuSupplierDelay:true,
 skuRecovery:'emergency',skuUrgentArrival:2,skuPurchaseCoverage:75,skuReservePercent:20,skuDecisions:[]};

test('M2-05: v2 session migrates to v3 preserving ID, decisions, demand and recovery',()=>{
 const r=deserializeSession(JSON.stringify(saved),options);
 assert.equal(r.status,'migrated');
 const s=r.state;
 assert.equal(s.schemaVersion,SESSION_SCHEMA_VERSION);
 assert.equal(SESSION_STORAGE_KEY,'supply-lab-v90','migrate in place, do not abandon user data');
 assert.equal(s.campaignId,ID);
 assert.equal(s.currentSection,'dashboard');
 assert.equal(s.decisions.commercial,'under');
 assert.equal(s.decisions.values.quality,90);
 assert.equal(s.actions.receiving,25);
 assert.equal(s.active,6);
 assert.equal(s.revealed,true);
 assert.equal(s.shockDirection,-1);
 assert.equal(s.scenario.demand,1200);
 assert.equal(s.skuPolicy,'service');
 assert.equal(s.skuRecovery,'emergency');
 assert.equal(s.skuPurchaseCoverage,75);
 assert.equal(s.skuReservePercent,20);
 assert.deepEqual(s.skuDecisions,[]);
 assert.equal(deserializeSession(serializeSession(s),options).status,'restored');
});

test('M2-05: legacy state without version receives safe defaults, no imaginary reveal',()=>{
 const r=deserializeSession(JSON.stringify({
  campaignId:ID,scenario:{demand:1500},decisions:{commercial:'over'},currentSection:'dashboard'
 }),options);
 assert.equal(r.status,'migrated');
 const s=r.state;
 assert.equal(s.revealed,false);
 assert.equal(s.currentSection,'operations');
 assert.equal(s.phase,'plan');
 assert.equal(s.shockDirection,null);
 assert.equal(s.decisions.commercial,'over');
 assert.equal(s.skuRecovery,'wait');
 assert.equal(s.skuUrgentArrival,1);
 assert.equal(s.scenario.demand,1500);
});

test('M2-05: malformed numbers, unknown choices, fake ID, broken shape never corrupt execution',()=>{
 const bad={...saved,campaignId:'../../not-a-campaign',active:999999,
  currentSection:'__proto__',phase:'recover',revealed:false,
  strategy:'unsafe',skuPolicy:'malicious',skuRecovery:'unrecognized',skuUrgentArrival:NaN,
  skuReservePercent:35,skuPurchaseCoverage:101,
  decisions:{commercial:'BROKEN',values:{receiving:Infinity,quality:-1,inventory:'92',picking:1000000}},
  actions:{receiving:1000000,picking:-1000,transport:'bad'},
  scenario:{demand:Infinity,initialStock:-999,demandShockPercent:999,actualDemand:Infinity},
  skuDecisions:[{campaignId:ID,version:1,status:'confirmed-in-simulator',option:'emergency',orderedExtraUnits:-5}]
 };
 const s=normalizeSessionRecord(bad,options);
 assert.equal(s.campaignId,ID);
 assert.equal(s.active,7);
 assert.equal(s.currentSection,'operations');
 assert.equal(s.phase,'plan');
 assert.equal(s.revealed,false);
 assert.equal(s.strategy,'balanced');
 assert.equal(s.skuPolicy,'balanced');
 assert.equal(s.skuRecovery,'wait');
 assert.equal(s.skuUrgentArrival,1);
 assert.equal(s.skuReservePercent,0);
 assert.equal(s.skuPurchaseCoverage,100);
 assert.equal(s.scenario.demand,1000);
 assert.equal(s.scenario.initialStock,0);
 assert.equal(s.scenario.demandShockPercent,100);
 assert.equal(s.scenario.actualDemand,1000);
 assert.equal(s.decisions.commercial,undefined);
 assert.equal(s.decisions.values.inventory,92);
 assert.equal(s.decisions.values.receiving,undefined);
 assert.equal(s.actions.receiving,1000);
 assert.equal(s.actions.transport,undefined);
 assert.deepEqual(s.skuDecisions,[]);
 assert.ok(Number.isFinite(s.scenario.actualDemand));
});

test('M2-05: malformed and future JSON states fail closed',()=>{
 for(const raw of ['{','[]','null','42','"string"',JSON.stringify({...saved,schemaVersion:99}),
 JSON.stringify({...saved,schemaVersion:-1}),'x'.repeat(500001)]){
  const result=deserializeSession(raw,options);
  assert.equal(result.status,'invalid');
  assert.equal(result.state,null);
 }
 assert.equal(deserializeSession(null,options).status,'empty');
 assert.throws(()=>serializeSession({...saved,campaignId:'bad id'}),/identidad/);
 assert.throws(()=>normalizeSessionRecord(saved,{fallbackCampaignId:'invalid id'}),/inválido/);
});

test('M2-05: confirmed SKU decision stays valid across JSON save/load and has no event replay',()=>{
 const c=campaignSkuContract({
  campaignId:ID,policy:'service',decisions:{commercial:'under',planning:'partial',purchasing:'reliable'},
  scenario:{demand:1000,actualDemand:1400,lockUpstream:true}
 });
 const d=createSkuRecoveryDecision({campaignId:ID,skuInputs:c.skuInputs,option:'emergency',urgentArrivalDay:2});
 assert.equal(skuDecisionStatus({decision:d,contract:c}),'current');
 const now={...saved,scenario:{...DEFAULT_SCENARIO,demand:1000},skuReservePercent:0,
  skuRecovery:'emergency',skuDecisions:[d]};
 const encoded=serializeSession(now);
 assert.ok(!encoded.includes('ledger'), 'do not persist physical SKU event arrays');
 assert.ok(!encoded.includes('ordersDetail'), 'do not persist full order bodies');
 const restored=deserializeSession(encoded,options);
 assert.equal(restored.status,'restored');
 assert.equal(restored.state.skuDecisions.length,1);
 assert.deepEqual(restored.state.skuDecisions[0],JSON.parse(JSON.stringify(d)));
 assert.equal(skuDecisionStatus({decision:restored.state.skuDecisions[0],contract:c}),'current');
});

test('M2-05: reject malformed/oversized decisions while retaining valid alternatives',()=>{
 const fake={...saved,skuDecisions:[
  {version:1,campaignId:'CD-OTHER',status:'confirmed-in-simulator'},
  {version:1,campaignId:ID,status:'confirmed-in-simulator',option:'emergency',
   scenarioSignature:'x',completedAfter:1,pendingAfter:0,orderedExtraUnits:0,
   originalPurchase:{A:1},urgentPurchaseOrders:[],
   originalPurchaseOrders:[{id:'PO-A',source:'original',skuId:'A',orderedQty:5,expectedArrivalDay:1}]}
 ]};
 const restored=deserializeSession(JSON.stringify(fake),options).state;
 assert.deepEqual(restored.skuDecisions,[]);
 assert.throws(()=>serializeSession({...saved,skuDecisions:[{
  version:1,campaignId:ID,status:'confirmed-in-simulator',option:'wait',
  scenarioSignature:'x'.repeat(29999),completedAfter:1,pendingAfter:0,
  orderedExtraUnits:0,originalPurchase:{},urgentPurchaseOrders:[]
 },...Array.from({length:25},(_,i)=>({version:1,campaignId:ID,status:'confirmed-in-simulator',
  option:'wait',scenarioSignature:'x'.repeat(29999),completedAfter:1,pendingAfter:0,orderedExtraUnits:0,
  originalPurchase:{},urgentPurchaseOrders:[],id:i}))]}),/demasiado grande/);
});
