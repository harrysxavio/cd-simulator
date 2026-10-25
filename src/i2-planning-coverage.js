import {NODES} from './engine.js';
import {inventoryPolicy} from './policy.js';
import {SKU_CATALOG} from './sku.js';
import {i2AdvancedPhysicalOptions} from './i2-advanced-settings.js';
import {normalizeI2GameState} from './i2-game-state.js';

const deepFreeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const part of Object.values(value))deepFreeze(part);
  Object.freeze(value);
 }
 return value;
};
const commercial=NODES.find(x=>x.id==='commercial');
const planning=NODES.find(x=>x.id==='planning');
const choicePercent=(area,id,key)=>{
 const result=area.choices.find(x=>x.id===id)?.[key];
 if(!Number.isSafeInteger(result)||result<0||result>200)
  throw new Error('I2-19: opción canónica incompatible');
 return result;
};

/**
 * I2-19 · Compromiso de abastecimiento solo desde PLANIFICACIÓN:
 * replica exactamente inventoryPolicy(orders:forecastOrders,stock) y
 * Math.ceil(policyNeedSKU * coveragePercent/100) de integratedDemand.
 *
 * Ni shock/seed, ni supplier fill, ni recibos, ni pedidos reales.
 * Esta es una proyección didáctica del plan original, no PO emitida.
 */
export function i2PlanningCoveragePreview(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='area'||state.index!==1||state.reveal
  ||!state.confirmedAreas.includes('commercial'))
  throw new Error('I2-19: planificación solo tras Comercial, antes de revelar');
 const forecastPercent=choicePercent(commercial,state.choices.commercial,'forecast');
 const coveragePercent=choicePercent(planning,state.choices.planning,'coverage');
 const physical=i2AdvancedPhysicalOptions(state.advanced);
 const plannedOrders=state.advanced.plannedOrders;
 const forecastOrders=Math.max(1,Math.round(plannedOrders*forecastPercent/100));
 const original=inventoryPolicy({policy:'balanced',orders:forecastOrders,stock:physical.openingStock});
 const rows=original.perSku.map(sku=>{
  const purchased=Math.ceil(sku.ordered*coveragePercent/100);
  return {
   skuId:sku.id,openingSkuUnits:sku.stock,targetSkuUnits:sku.targetUnits,
   uncoveredNeedSkuUnits:Math.max(0,sku.ordered-purchased),
   policyNeedSkuUnits:sku.ordered,plannedPurchaseSkuUnits:purchased,
   commitmentCLP:purchased*sku.unitCost,
   nominalLeadDays:sku.leadDays,
   note:sku.leadDays>12?'Plazo nominal supera el horizonte de la misión':
    'Llegada nominal; recepción y liberación no están garantizadas'
  };
 });
 const totalCommittedSkuUnits=rows.reduce((sum,row)=>sum+row.plannedPurchaseSkuUnits,0);
 const totalCommittedValueCLP=rows.reduce((sum,row)=>sum+row.commitmentCLP,0);
 const totalNeed=rows.reduce((sum,row)=>sum+row.policyNeedSkuUnits,0);
 const decision=state.choices.planning;
 return deepFreeze({
  scope:'sku-cohort',phase:'pre-reveal',type:'unissued-original-sku-plan',
  plannedOrders,forecastOrders,forecastPercent,coveragePercent,
  decision,rows,totalNeedSkuUnits:totalNeed,
  totalCommittedSkuUnits,totalCommittedValueCLP,
  status:coveragePercent<100?'partial':coveragePercent>100?'buffer':'balanced',
  teaching:coveragePercent<100
   ?'Menor cobertura reduce el compromiso, pero puede dejar faltantes si las unidades no alcanzan.'
   :coveragePercent>100
   ?'La cobertura ampliada aumenta el compromiso, no garantiza que todas las unidades lleguen a tiempo.'
   :'Cubrir la necesidad calculada no garantiza servicio: influyen proveedor, fechas, calidad y capacidad.',
  source:'inventoryPolicy (SKU, balanced) y Math.ceil por SKU de integratedDemand; forecast canónico V1',
  boundary:'Proyección de compromiso original, no orden emitida, pago, llegada, stock recibido, expedición ni costo operacional total.'
 });
}

/**
 * Resumen posrevelación del COMPROMISO YA CONGELADO. Nunca se recalcula
 * para reponderar la demanda observada o modificar compras originales.
 */
export function i2PlanningCoverageOutcome(commitment){
 if(commitment?.scope!=='sku-cohort'||commitment.commitmentStage!=='before-demand-reveal'
  ||!Number.isSafeInteger(commitment.forecastOrders)||commitment.forecastOrders<1
  ||!Number.isSafeInteger(commitment.planningCoveragePercent)
  ||!Array.isArray(commitment.rows)||commitment.rows.length!==SKU_CATALOG.length
  ||!Number.isSafeInteger(commitment.totalCommittedSkuUnits)
  ||!Number.isSafeInteger(commitment.totalCommittedValueCLP)
  ||!Array.isArray(commitment.originalPurchaseOrders)
  ||commitment.originalPurchaseOrders.length!==SKU_CATALOG.length)
  throw new Error('I2-19: compromiso SKU no verificable');
 const rows=SKU_CATALOG.map(sku=>{
  const r=commitment.rows.find(x=>x.skuId===sku.id);
  const po=commitment.originalPurchaseOrders.find(x=>x.skuId===sku.id);
  if(!r||!po||r.purchaseOrderId!==po.id
   ||r.unitCostCLP!==sku.unitCost
   ||!Number.isSafeInteger(r.openingSkuUnits)||r.openingSkuUnits<0
   ||!Number.isSafeInteger(r.policyNeedSkuUnits)||r.policyNeedSkuUnits<0
   ||!Number.isSafeInteger(r.committedSkuUnits)||r.committedSkuUnits<0
   ||r.committedSkuUnits!==Math.ceil(r.policyNeedSkuUnits*commitment.planningCoveragePercent/100)
   ||po.orderedQty!==r.committedSkuUnits
   ||po.expectedArrivalDay!==r.expectedArrivalDay
   ||r.committedValueCLP!==r.committedSkuUnits*r.unitCostCLP)
    throw new Error('I2-19: PO original no conciliada');
  return {
   skuId:sku.id,openingSkuUnits:r.openingSkuUnits,
   policyNeedSkuUnits:r.policyNeedSkuUnits,
   originalCommittedSkuUnits:r.committedSkuUnits,
   nominalArrivalDay:r.expectedArrivalDay,
   commitmentCLP:r.committedValueCLP
  };
 });
 const total=rows.reduce((sum,r)=>sum+r.originalCommittedSkuUnits,0);
 const clp=rows.reduce((sum,r)=>sum+r.commitmentCLP,0);
 if(total!==commitment.totalCommittedSkuUnits||clp!==commitment.totalCommittedValueCLP)
  throw new Error('I2-19: totales de compromiso inconsistentes');
 return deepFreeze({
  scope:'sku-cohort',phase:'post-reveal',status:'original-plan-frozen',
  forecastOrders:commitment.forecastOrders,
  coveragePercent:commitment.planningCoveragePercent,
  totalCommittedSkuUnits:total,totalCommittedValueCLP:clp,
  rows,source:'freezeCommercialPlanning del motor integrado SKU',
  boundary:'La sorpresa no altera compras originales. Valor CLP comprometido no significa pago ni costo total.'
 });
}
