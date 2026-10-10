import {SKU_CATALOG} from './sku.js';

const freezeDeep=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const child of Object.values(value))freezeDeep(child);
  Object.freeze(value);
 }
 return value;
};

/**
 * M3-06: pre-demand Commercial/Planning commitment for ONE physical SKU cohort.
 * Catalog SKU quantities and complete customer orders remain different measures.
 * Do not generate purchases based on post-shock demand, receipts or shipments.
 */
export function freezeCommercialPlanning({
 plannedOrders,forecastOrders,plannedForecastPercent,planningCoveragePercent,
 planningPolicy,originalPurchaseOrders
}={}){
 if(!Number.isSafeInteger(plannedOrders)||plannedOrders<1||plannedOrders>100000
  ||!Number.isSafeInteger(forecastOrders)||forecastOrders<1
  ||!Number.isFinite(plannedForecastPercent)||plannedForecastPercent<1||plannedForecastPercent>200
  ||!Number.isFinite(planningCoveragePercent)||planningCoveragePercent<0||planningCoveragePercent>150
  ||forecastOrders!==Math.max(1,Math.round(plannedOrders*plannedForecastPercent/100))
  ||planningPolicy?.orders!==forecastOrders
  ||!Array.isArray(planningPolicy?.perSku)
  ||!Array.isArray(originalPurchaseOrders?.rows)
  ||originalPurchaseOrders?.plannedOrders!==plannedOrders
  ||originalPurchaseOrders?.forecastOrders!==forecastOrders){
  throw new Error('Pronóstico y planificación SKU no concilian');
 }
 const catalogIds=SKU_CATALOG.map(p=>p.id);
 const rows=SKU_CATALOG.map(sku=>{
  const policy=planningPolicy.perSku.find(p=>p.id===sku.id);
  const po=originalPurchaseOrders.rows.find(p=>p.skuId===sku.id);
  if(!policy||!po||po.id!=='PO-'+sku.id
   ||!Number.isSafeInteger(policy.stock)||policy.stock<0
   ||!Number.isSafeInteger(policy.ordered)||policy.ordered<0
   ||!Number.isSafeInteger(policy.targetUnits)||policy.targetUnits<0
   ||!Number.isSafeInteger(policy.reorderPoint)||policy.reorderPoint<0
   ||policy.unitCost!==sku.unitCost
   ||po.orderedQty!==Math.ceil(policy.ordered*planningCoveragePercent/100)
   ||po.unitCost!==sku.unitCost
   ||po.orderedQty!==originalPurchaseOrders.bySku?.[sku.id]){
   throw new Error('Compra SKU no coincide con el plan previo a la demanda');
  }
  return {
   skuId:sku.id,openingSkuUnits:policy.stock,
   targetSkuUnits:policy.targetUnits,policyNeedSkuUnits:policy.ordered,
   committedSkuUnits:po.orderedQty,unitCostCLP:sku.unitCost,
   committedValueCLP:po.orderedQty*sku.unitCost,
   purchaseOrderId:po.id,expectedArrivalDay:po.expectedArrivalDay
  };
 });
 if(planningPolicy.perSku.length!==catalogIds.length
  ||originalPurchaseOrders.rows.length!==catalogIds.length
  ||new Set(planningPolicy.perSku.map(x=>x.id)).size!==catalogIds.length
  ||new Set(originalPurchaseOrders.rows.map(x=>x.skuId)).size!==catalogIds.length
  ||rows.reduce((n,p)=>n+p.committedValueCLP,0)!==originalPurchaseOrders.committedValueCLP){
  throw new Error('Manifiesto SKU no concilia con la planificación');
 }
 return freezeDeep({
  scope:'sku-cohort',commitmentStage:'before-demand-reveal',
  plannedOrders,forecastOrders,plannedForecastPercent,planningCoveragePercent,
  skuPolicy:planningPolicy.policy,
  rows,totalCommittedSkuUnits:rows.reduce((n,p)=>n+p.committedSkuUnits,0),
  totalCommittedValueCLP:originalPurchaseOrders.committedValueCLP,
  originalPurchaseOrders:originalPurchaseOrders.rows,
  boundary:'Pronóstico y compras comprometidos antes de revelar demanda. Pedido completo, unidad SKU y unidad agregada de jornada son magnitudes distintas.'
 });
}

/** A read-only explanation; actual demand is observed, never fed back to purchases. */
export function commercialPlanningReading(commitment,{actualOrders,originalPurchaseOrders}={}){
 if(commitment?.scope!=='sku-cohort'||commitment?.commitmentStage!=='before-demand-reveal'
  ||!Number.isSafeInteger(actualOrders)||actualOrders<1
  ||!Array.isArray(originalPurchaseOrders?.rows)
  ||originalPurchaseOrders.rows.length!==commitment.rows?.length
  ||commitment.rows.some(row=>!originalPurchaseOrders.rows.some(po=>
   po.id===row.purchaseOrderId&&po.skuId===row.skuId
   &&po.orderedQty===row.committedSkuUnits
   &&po.unitCost===row.unitCostCLP
   &&po.expectedArrivalDay===row.expectedArrivalDay))){
  throw new Error('La demanda revelada no coincide con el plan original SKU');
 }
 return freezeDeep({
  scope:'sku-cohort',
  plannedOrders:commitment.plannedOrders,
  forecastOrders:commitment.forecastOrders,
  actualOrders,
  varianceVsForecastOrders:actualOrders-commitment.forecastOrders,
  varianceVsPlannedOrders:actualOrders-commitment.plannedOrders,
  forecastDirection:actualOrders>commitment.forecastOrders?'under':
   actualOrders<commitment.forecastOrders?'over':'matched',
  totalCommittedSkuUnits:commitment.totalCommittedSkuUnits,
  totalCommittedValueCLP:commitment.totalCommittedValueCLP,
  planningCoveragePercent:commitment.planningCoveragePercent,
  rows:commitment.rows,
  commitment,
  boundary:'La sorpresa modifica los pedidos reales, no el pronóstico ni las órdenes de compra ya comprometidas.'
 });
}
