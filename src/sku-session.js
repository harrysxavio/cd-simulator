import {recoveryComparison} from './recovery.js';
import {createRecoveryBaseline,recoveryBaselineKey} from './recovery-baseline.js';
import {supplyBridge} from './supply-bridge.js';
import {campaignAreaReadModel} from './area-ledger.js';

/**
 * M2-04b: session-scoped cache for exactly ONE physical SKU replay per input.
 *
 * Two views of the SAME campaign/choices must reuse the same objects. A changed
 * area, policy, supplier, demand, reserve, recovery or arrival produces a new
 * signature. This is NOT persistent storage; after reload we safely reconstruct
 * the same deterministic events from the saved decisions and campaign ID.
 *
 * The cache has a strict size bound so exploring many decisions on a phone does
 * not retain an unbounded number of detailed order/event ledgers in memory.
 */
export function createSkuSessionCache({
 replay=recoveryComparison,bridge=supplyBridge,readModel=campaignAreaReadModel,
 baselineBuilder=createRecoveryBaseline,maxEntries=10
}={}){
 if(!Number.isSafeInteger(maxEntries)||maxEntries<1||maxEntries>30){
  throw new Error('Límite de caché SKU inválido');
 }
 const entries=new Map();
 // Reuse one frozen before-intervention baseline across ALL choices for the
 // same physical campaign scenario. Bounded separately from view projections.
 const baselines=new Map();
 let simulations=0,projections=0,serial=0;
 const freezeDeep=value=>{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
   for(const part of Object.values(value))freezeDeep(part);
   Object.freeze(value);
  }
  return value;
 };
 function inputFor({contract,skuInputs,option,urgentArrivalDay,purchaseCoveragePercent}={}){
  if(!contract||typeof contract.campaignId!=='string'
   ||!Number.isSafeInteger(contract.plannedSampleOrders)
   ||contract.plannedSampleOrders<1||!skuInputs
   ||skuInputs.plannedOrders!==contract.plannedSampleOrders
   ||!Number.isSafeInteger(skuInputs.actualOrders)||skuInputs.actualOrders<1
   ||typeof option!=='string'||!Number.isSafeInteger(urgentArrivalDay)
   ||!Number.isSafeInteger(purchaseCoveragePercent)){
   throw new Error('Contrato de sesión SKU inválido');
  }
  const key=JSON.stringify([contract.campaignId,skuInputs,option,urgentArrivalDay,purchaseCoveragePercent]);
  return {key,contract,skuInputs,option,urgentArrivalDay,purchaseCoveragePercent};
 }
 function baselineFor(i){
  const key=JSON.stringify([i.contract.campaignId,recoveryBaselineKey(i.skuInputs)]);
  const existing=baselines.get(key);
  if(existing){
   baselines.delete(key);baselines.set(key,existing);
   return existing;
  }
  const baseline=freezeDeep(baselineBuilder(i.skuInputs));
  if(baseline?.scope!=='sku-cohort'
   ||baseline.stage!=='before-recovery'
   ||baseline.scenarioKey!==recoveryBaselineKey(i.skuInputs)
   ||baseline.plannedOrders!==i.contract.plannedSampleOrders
   ||baseline.actualOrders!==i.skuInputs.actualOrders){
   throw new Error('El baseline SKU no corresponde a la campaña');
  }
  baselines.set(key,baseline);
  while(baselines.size>maxEntries)baselines.delete(baselines.keys().next().value);
  return baseline;
 }
 function getEntry(options){
  const i=inputFor(options);
  const existing=entries.get(i.key);
  if(existing){
   // Map iteration order tracks least recently used first.
   entries.delete(i.key);entries.set(i.key,existing);
   return existing;
  }
  const baseline=baselineFor(i);
  const comparison=freezeDeep(replay({
   ...i.skuInputs,option:i.option,urgentArrivalDay:i.urgentArrivalDay,
   purchaseCoveragePercent:i.purchaseCoveragePercent,baselineSnapshot:baseline
  }));
  if(comparison.recovered?.orders!==i.skuInputs.actualOrders
   ||comparison.integrated?.plannedOrders!==i.contract.plannedSampleOrders
   ||comparison.baselineSnapshot!==baseline
   ||comparison.integrated!==baseline.integrated
   ||comparison.base!==baseline.integrated.actual){
   throw new Error('La ejecución SKU no corresponde a la campaña');
  }
  simulations++;
  const entry={...i,comparison,projection:null};
  entries.set(i.key,entry);
  while(entries.size>maxEntries)entries.delete(entries.keys().next().value);
  return entry;
 }
 function getComparison(options){return getEntry(options).comparison}
 function getProjection(options){
  const entry=getEntry(options);
  if(entry.projection)return entry.projection;
  const chain=bridge({
   ...entry.skuInputs,option:entry.option,urgentArrivalDay:entry.urgentArrivalDay,
   purchaseCoveragePercent:entry.purchaseCoveragePercent,
   comparisonResult:entry.comparison,campaignId:entry.contract.campaignId
  });
  const areaModel=readModel({
   comparison:entry.comparison,campaign:chain.campaign,
   campaignId:entry.contract.campaignId,
   plannedOrders:entry.contract.plannedSampleOrders
  });
  if(chain.campaign?.passed!==true||areaModel?.passed!==true
   ||chain.campaign.campaignId!==areaModel.campaignId
   ||chain.campaign.orders.length!==areaModel.metrics.actualOrders
   ||chain.campaign.shipments.length!==areaModel.metrics.shippedOrders){
   throw new Error('Las vistas SKU no concilian con la campaña');
  }
  projections++;
  entry.projection=freezeDeep({
   campaignId:entry.contract.campaignId,
   stamp:'SKU-VIEW-'+(++serial),
   comparison:entry.comparison,chain,areaModel
  });
  return entry.projection;
 }
 return Object.freeze({
  getComparison,getProjection,
  clear(){entries.clear();baselines.clear();simulations=0;projections=0;serial=0},
  stats(){return Object.freeze({entries:entries.size,simulations,projections,maxEntries})}
 });
}
