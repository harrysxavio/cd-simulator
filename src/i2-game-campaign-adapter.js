import {DEFAULTS} from './engine.js';
import {DEFAULT_SCENARIO} from './scenario.js';
import {campaignSkuContract} from './campaign-contract.js';
import {createSkuSessionCache} from './sku-session.js';
import {I2_AREAS,I2_RECOVERIES,createI2Decision,i2CanonicalChoice} from './i2-product-contract.js';

/**
 * I2-04 · Single source of truth for the game and the existing SKU laboratory.
 * This adapter never reimplements stock, supplier orders, unit conversion,
 * receipts, picking, transport, costs, or urgent purchase effects.
 *
 * plan-only is intentionally NOT a physical simulation: actual-demand figures
 * cannot be retrieved until the explicit reveal flag is true.
 */
const POLICY_OPTIONS=Object.freeze(['lean','balanced','service']);
const PLAN_SCOPE='sku-cohort';
const DAYS=12;
const isInt=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const deepFreeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const item of Object.values(value))deepFreeze(item);
  Object.freeze(value);
 }
 return value;
};

export function i2AreaSelection(choices={},campaignId='CD-I2-DEFAULT'){
 if(!choices||typeof choices!=='object'||Array.isArray(choices)
  ||Object.keys(choices).some(id=>!I2_AREAS.some(area=>area.id===id)))
  throw new Error('I2-04: conjunto de opciones inválido');
 const result={};
 for(const area of I2_AREAS){
  const optionId=choices[area.id]??DEFAULTS[area.id];
  const decision=createI2Decision({
   campaignId,area:area.id,optionId,logicalStep:area.index,
   source:'game-user-action',scope:PLAN_SCOPE,horizonDays:DAYS,confirmed:true
  });
  Object.assign(result,i2CanonicalChoice(decision));
 }
 return Object.freeze(result);
}

function validate({choices={},campaignId='CD-I2-DEFAULT',plannedOrders=200,
 policy='balanced',supplierDelay=false,scope=PLAN_SCOPE,horizonDays=DAYS,
 option='wait',urgentArrivalDay=2,purchaseCoveragePercent=100,scenario,
 openingStock=null,extraCapacityDailyCost=null
}={}){
 if(scope!==PLAN_SCOPE||horizonDays!==DAYS)throw new Error('I2-04: alcance físico inválido');
 if(!isInt(plannedOrders,1,100000))throw new Error('I2-04: cantidad de pedidos planificados inválida');
 if(!POLICY_OPTIONS.includes(policy)||typeof supplierDelay!=='boolean')throw new Error('I2-04: política o retraso inválido');
 if(!I2_RECOVERIES.some(r=>r.optionId===option))throw new Error('I2-04: recuperación inválida');
 if(!isInt(urgentArrivalDay,1,365)||!isInt(purchaseCoveragePercent,0,100))
  throw new Error('I2-04: llegada o cobertura de compra inválida');
 // Los parámetros físicos adicionales pasan por la frontera canónica y
 // jamás se calculan por separado en el frontend.
 if(openingStock!==null&&(!openingStock||typeof openingStock!=='object'
  ||Array.isArray(openingStock)))throw new Error('I2-04: apertura SKU inválida');
 if(extraCapacityDailyCost!==null&&(!Number.isSafeInteger(extraCapacityDailyCost)
  ||extraCapacityDailyCost<0||extraCapacityDailyCost>1000000))
  throw new Error('I2-04: costo SKU inválido');
 const decisions=i2AreaSelection(choices,campaignId);
 // Only registered fields from the canonical scenario may enter. No network,
 // literal PO amounts or already-simulated ledgers are accepted as inputs.
 if(scenario!==undefined&&(!scenario||typeof scenario!=='object'||Array.isArray(scenario)
  ||Object.keys(scenario).some(k=>!Object.hasOwn(DEFAULT_SCENARIO,k)&&k!=='lockUpstream'))){
  throw new Error('I2-04: escenario contiene datos no previstos');
 }
 const safeScenario={
  ...DEFAULT_SCENARIO,...scenario,lockUpstream:true
 };
 for(const field of ['demand','actualDemand']){
  if(!isInt(safeScenario[field],1,100000))throw new Error('I2-04: demanda inválida');
 }
 if(safeScenario.actualDemand>2*safeScenario.demand||safeScenario.actualDemand<safeScenario.demand/2){
  throw new Error('I2-04: demanda fuera del rango didáctico');
 }
 return {decisions,campaignId,plannedOrders,policy,supplierDelay,scope,horizonDays,
  option,urgentArrivalDay,purchaseCoveragePercent,scenario:safeScenario,
  openingStock,extraCapacityDailyCost};
}

export function createI2GameCampaignAdapter({cache=createSkuSessionCache({maxEntries:10})}={}){
 if(!cache||typeof cache.getProjection!=='function')throw new Error('I2-04: cache SKU inválida');
 function evaluate({revealed=false,...input}={}){
  if(typeof revealed!=='boolean')throw new Error('I2-04: revelación inválida');
  const x=validate(input);
  if(!revealed){
   // Crucial: no SKU physical replay, no actualDemand, no PO or event ledger.
   return deepFreeze({
    passed:true,phase:'planning',revealed:false,
    scope:x.scope,horizonDays:x.horizonDays,campaignId:x.campaignId,
    plannedOrders:x.plannedOrders,areaChoices:x.decisions,
    boundary:'Antes de revelar: son decisiones de planificación, no pedidos reales, stock ni expediciones.'
   });
  }
  const contract=campaignSkuContract({
   campaignId:x.campaignId,decisions:x.decisions,actions:{},
   scenario:x.scenario,policy:x.policy,supplierDelay:x.supplierDelay,
   plannedSampleOrders:x.plannedOrders,
   openingStock:x.openingStock,extraCapacityDailyCost:x.extraCapacityDailyCost
  });
  const projection=cache.getProjection({
   contract,skuInputs:contract.skuInputs,
   option:x.option,urgentArrivalDay:x.urgentArrivalDay,
   purchaseCoveragePercent:x.purchaseCoveragePercent
  });
  const {comparison,chain,areaModel}=projection;
  const campaign=chain.campaign;
  if(contract.boundaryAudit?.passed!==true
   ||campaign?.passed!==true||areaModel?.passed!==true
   ||areaModel.scope!==PLAN_SCOPE||areaModel.horizonDays!==DAYS
   ||comparison.baselineSnapshot?.scope!==PLAN_SCOPE
   ||comparison.recovered?.days!==DAYS
   ||comparison.base?.orders!==contract.actualSampleOrders
   ||comparison.recovered?.orders!==contract.actualSampleOrders
   ||comparison.base.completed+comparison.base.pending!==contract.actualSampleOrders
   ||comparison.recovered.completed+comparison.recovered.pending!==contract.actualSampleOrders
   ||campaign.orders.length!==contract.actualSampleOrders
   ||campaign.shipments.length!==comparison.recovered.completed
   ||!Array.isArray(areaModel.stages)||areaModel.stages.length!==I2_AREAS.length
   ||!Array.isArray(campaign.plan.originalPurchaseOrders)
   ||JSON.stringify(campaign.plan.originalPurchaseOrders)!==JSON.stringify(comparison.originalPurchaseOrders?.rows)
   ||!Object.values(areaModel.checks).every(Boolean)){
   throw new Error('I2-04: fallo de conciliación física entre juego y V1');
  }
  return Object.freeze({
   passed:true,phase:'revealed',revealed:true,
   scope:x.scope,horizonDays:x.horizonDays,campaignId:x.campaignId,
   plannedOrders:contract.plannedSampleOrders,
   actualOrders:contract.actualSampleOrders,
   areaChoices:x.decisions,
   option:x.option,urgentArrivalDay:x.urgentArrivalDay,
   purchaseCoveragePercent:x.purchaseCoveragePercent,
   contract,projection,comparison,campaign,areaModel,
   boundary:'Lectura de cohorte SKU del mismo motor que V1; no sumar unidades equivalentes de jornada ni inferir entrega final o costo integral.'
  });
 }
 return Object.freeze({
  evaluate,
  clear(){if(typeof cache.clear==='function')cache.clear()},
  stats(){return typeof cache.stats==='function'?cache.stats():null}
 });
}
