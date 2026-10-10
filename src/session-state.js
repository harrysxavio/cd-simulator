import {NODES,START,PARAMETERS} from './engine.js';
import {ACTIONS} from './flow.js';
import {DEFAULT_SCENARIO,cleanScenario} from './scenario.js';
import {DECISION_OPTIONS} from './sku-decision.js';

export const SESSION_SCHEMA_VERSION=3;
export const SESSION_STORAGE_KEY='supply-lab-v90';
const SECTIONS=Object.freeze(['setup','operations','preliminary','recovery','dashboard']);
const STRATEGIES=Object.freeze(['service','balanced','cost']);
const POLICIES=Object.freeze(['lean','balanced','service']);
const ARRIVALS=Object.freeze([1,2,5,10,13]);
const COVERAGES=Object.freeze([0,25,50,75,100]);
const RESERVES=Object.freeze([0,10,20,30]);
const MAX_SAVED_BYTES=500000;
const isRecord=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const validId=id=>typeof id==='string'&&/^CD-[A-Za-z0-9_-]{1,60}$/.test(id);
const choose=(v,values,fallback)=>values.includes(v)?v:fallback;
const clamp=(n,low,high)=>Math.max(low,Math.min(high,n));

function safeDecisions(raw){
 const result={...START,values:{}};
 if(!isRecord(raw))return result;
 for(const node of NODES){
  if(node.choices.some(x=>x.id===raw[node.id]))result[node.id]=raw[node.id];
  const value=raw.values?.[node.id],settings=PARAMETERS[node.id];
  if((typeof value==='number'||typeof value==='string')&&value!==''&&Number.isFinite(Number(value))){
   const number=Number(value);
   if(number>=settings.min&&number<=settings.max)result.values[node.id]=number;
  }
 }
 return result;
}
function safeActions(raw){
 const result={};if(!isRecord(raw))return result;
 for(const node of NODES){
  const value=raw[node.id],limit=ACTIONS[node.id]?.[2];
  if((typeof value==='number'||typeof value==='string')&&value!==''&&Number.isFinite(Number(value))
   &&Number.isFinite(limit)){
   result[node.id]=clamp(Number(value),0,limit);
  }
 }
 return result;
}
function safeConfirmedDecisions(raw,campaignId){
 if(!Array.isArray(raw))return [];
 return raw.slice(-25).filter(d=>{
  if(!isRecord(d)||d.version!==1||d.campaignId!==campaignId||d.status!=='confirmed-in-simulator'
   ||!DECISION_OPTIONS.includes(d.option)
   ||typeof d.scenarioSignature!=='string'||d.scenarioSignature.length>30000
   ||!Number.isSafeInteger(d.completedAfter)||d.completedAfter<0
   ||!Number.isSafeInteger(d.pendingAfter)||d.pendingAfter<0
   ||!Number.isSafeInteger(d.orderedExtraUnits)||d.orderedExtraUnits<0
   ||!Array.isArray(d.urgentPurchaseOrders)||d.urgentPurchaseOrders.length>50
   ||!isRecord(d.originalPurchase))return false;
  // Only selected, structurally valid decisions are retained here. Their
  // scenario signature is checked again at use via skuDecisionStatus.
  if(d.originalPurchaseOrders!==undefined){
   if(!Array.isArray(d.originalPurchaseOrders)||d.originalPurchaseOrders.length>30)return false;
   for(const po of d.originalPurchaseOrders){
    if(!isRecord(po)||po.id!=='PO-'+po.skuId||po.source!=='original'
     ||!Number.isSafeInteger(po.orderedQty)||po.orderedQty<0
     ||!Number.isSafeInteger(po.expectedArrivalDay)||po.expectedArrivalDay<0
     ||po.orderedQty!==d.originalPurchase[po.skuId])return false;
   }
  }
  return true;
 });
}

/**
 * Restores v0/v1/v2 and current v3 without guessing physical inventory.
 * The detailed SKU order/event ledger and cached read-model are never saved.
 * Unknown future versions are rejected rather than silently downgraded.
 */
export function normalizeSessionRecord(raw,{fallbackCampaignId}={}){
 if(!isRecord(raw)||!validId(fallbackCampaignId))throw new Error('Estado de campaña inválido');
 const version=raw.schemaVersion===undefined?0:raw.schemaVersion;
 if(!Number.isSafeInteger(version)||version<0||version>SESSION_SCHEMA_VERSION){
  throw new Error('Versión de sesión desconocida');
 }
 const campaignId=validId(raw.campaignId)?raw.campaignId:fallbackCampaignId;
 const revealed=raw.revealed===true;
 const shockDirection=revealed?(raw.shockDirection===-1?-1:1):null;
 const currentSection=choose(raw.currentSection,SECTIONS,revealed?'preliminary':'operations');
 const proposedActive=Number(raw.active);
 const active=Number.isSafeInteger(proposedActive)?clamp(proposedActive,0,NODES.length-1):0;
 const inputScenario=isRecord(raw.scenario)?raw.scenario:DEFAULT_SCENARIO;
 const state={
  schemaVersion:SESSION_SCHEMA_VERSION,campaignId,
  currentSection:!revealed&&!['setup','operations'].includes(currentSection)?'operations':currentSection,
  decisions:safeDecisions(raw.decisions),actions:safeActions(raw.actions),
  active,phase:revealed&&raw.phase==='recover'?'recover':'plan',
  scenario:cleanScenario(inputScenario),strategy:choose(raw.strategy,STRATEGIES,'balanced'),
  revealed,shockDirection,
  skuPolicy:choose(raw.skuPolicy,POLICIES,'balanced'),
  skuSupplierDelay:raw.skuSupplierDelay===true,
  skuRecovery:choose(raw.skuRecovery,['wait','emergency','reserve','overtime','combined'],'wait'),
  skuUrgentArrival:choose(raw.skuUrgentArrival,ARRIVALS,1),
  skuPurchaseCoverage:choose(raw.skuPurchaseCoverage,COVERAGES,100),
  skuReservePercent:choose(raw.skuReservePercent,RESERVES,0),
  skuDecisions:safeConfirmedDecisions(raw.skuDecisions,campaignId)
 };
 // Reject impossible actualDemand (not user-editable); an absurd persisted value
 // must never silently seed an impossible future execution.
 if(!Number.isSafeInteger(state.scenario.actualDemand)||state.scenario.actualDemand<1
  ||state.scenario.actualDemand>100000)state.scenario.actualDemand=state.scenario.demand;
 return state;
}
export function deserializeSession(raw,{fallbackCampaignId}={}){
 if(raw===null||raw===undefined||raw==='')return {status:'empty',state:null};
 if(typeof raw!=='string'||raw.length>MAX_SAVED_BYTES)return {status:'invalid',state:null};
 try{
  const parsed=JSON.parse(raw);
  const sourceVersion=parsed?.schemaVersion??0;
  return {status:sourceVersion===SESSION_SCHEMA_VERSION?'restored':'migrated',
   state:normalizeSessionRecord(parsed,{fallbackCampaignId})};
 }catch{return {status:'invalid',state:null}}
}
/**
 * Always persist the allowlisted session fields as v3, not arbitrary form
 * objects or the large physical replay. Circular input/malformed state fails.
 */
export function serializeSession(raw){
 if(!isRecord(raw)||!validId(raw.campaignId))throw new Error('Campaña sin identidad válida');
 const clean=normalizeSessionRecord(raw,{fallbackCampaignId:raw.campaignId});
 const text=JSON.stringify(clean);
 if(text.length>MAX_SAVED_BYTES)throw new Error('Sesión demasiado grande para guardar');
 return text;
}
