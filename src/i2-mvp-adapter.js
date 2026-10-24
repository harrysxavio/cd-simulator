import {DEFAULTS} from './engine.js';
import {DEFAULT_SCENARIO} from './scenario.js';
import {campaignSkuContract} from './campaign-contract.js';
import {createSkuSessionCache} from './sku-session.js';
import {I2_AREAS,I2_RECOVERIES,createI2Decision,i2CanonicalChoice} from './i2-product-contract.js';

/**
 * MVP vertical slice I2-04+: NO second engine. All physical quantities,
 * original purchase orders, receipts, quality, stock and dispatch originate
 * in the same existing canonical SKU replay.
 *
 * Note: campaign's shift-equivalent planning model is used ONLY by the
 * canonical campaignSkuContract adapter. Its totals are never added to SKU.
 */
export const I2_MVP_CASE=Object.freeze({
 campaignId:'CD-I2-MVP-ALFA',plannedOrders:200,shockPercent:40,
 scenario:'demanda-sorpresa-40',horizonDays:12
});
const cache=createSkuSessionCache({maxEntries:5});

export function i2DefaultChoices(){
 // All option IDs are read directly from V1, not duplicated.
 return Object.freeze(Object.fromEntries(
  I2_AREAS.map(area=>[area.id,DEFAULTS[area.id]])
 ));
}

export function i2CanonicalChoices(choices){
 if(!choices||typeof choices!=='object'||Array.isArray(choices)
  ||Object.keys(choices).some(id=>!I2_AREAS.some(a=>a.id===id))){
  throw new Error('Misión CD: conjunto de decisiones inválido');
 }
 const result={};
 for(const [i,area] of I2_AREAS.entries()){
  result[area.id]=i2CanonicalChoice(createI2Decision({
   campaignId:I2_MVP_CASE.campaignId,area:area.id,
   optionId:choices[area.id]??DEFAULTS[area.id],
   logicalStep:i,confirmed:true
  }))[area.id];
 }
 return Object.freeze(result);
}

/**
 * Every invocation sees the same demand shock and frozen original purchase.
 * This function is ONLY called after explicit reveal. Do not call it when
 * rendering planning screens, to avoid leaking the actual-demand result.
 */
export function i2MvpPhysicalResult({choices=i2DefaultChoices(),option='wait',urgentArrivalDay=2,purchaseCoveragePercent=100}={}){
 if(!I2_RECOVERIES.some(r=>r.optionId===option))
  throw new Error('Misión CD: recuperación inválida');
 if(![1,2,5,10,13].includes(urgentArrivalDay))
  throw new Error('Misión CD: plazo urgente inválido');
 if(![0,25,50,75,100].includes(purchaseCoveragePercent))
  throw new Error('Misión CD: cobertura urgente inválida');
 const decisions=i2CanonicalChoices(choices);
 // Explicitly lock upstream planning before revealing actual demand.
 const scenario={
  ...DEFAULT_SCENARIO,demand:1000,actualDemand:1000*(1+I2_MVP_CASE.shockPercent/100),
  demandShockPercent:I2_MVP_CASE.shockPercent,lockUpstream:true
 };
 const contract=campaignSkuContract({
  decisions,actions:{},scenario,policy:'balanced',
  plannedSampleOrders:I2_MVP_CASE.plannedOrders,
  campaignId:I2_MVP_CASE.campaignId
 });
 const projection=cache.getProjection({
  contract,skuInputs:contract.skuInputs,option,urgentArrivalDay,
  purchaseCoveragePercent
 });
 const comparison=projection.comparison;
 if(projection.areaModel.scope!=='sku-cohort'
  ||projection.areaModel.passed!==true
  ||comparison.baselineSnapshot.scope!=='sku-cohort'
  ||comparison.recovered.days!==I2_MVP_CASE.horizonDays
  ||comparison.recovered.completed+comparison.recovered.pending!==contract.actualSampleOrders
  ||comparison.base.orders!==contract.actualSampleOrders
  ||projection.chain.campaign.plan.originalPurchaseOrders!==comparison.originalPurchaseOrders){
  // Object identity of a read-model's projected array is not always retained.
  // The actual immutability of the manifest is asserted by the canonical engine.
  if(projection.chain.campaign.plan.originalPurchaseOrders!==comparison.originalPurchaseOrders){
   // Compare manifest contents instead of assuming the same view-layer object.
   const rows=projection.chain.campaign.plan.originalPurchaseOrders?.rows;
   if(!Array.isArray(rows)||JSON.stringify(rows)!==JSON.stringify(comparison.originalPurchaseOrders?.rows))
    throw new Error('Misión CD: el plan original fue alterado');
  }
  if(projection.areaModel.scope!=='sku-cohort'
   ||projection.areaModel.passed!==true
   ||comparison.recovered.days!==I2_MVP_CASE.horizonDays
   ||comparison.recovered.completed+comparison.recovered.pending!==contract.actualSampleOrders
   ||comparison.base.orders!==contract.actualSampleOrders)
   throw new Error('Misión CD: resultado físico no conciliado');
 }
 return Object.freeze({
  scope:'sku-cohort',horizonDays:I2_MVP_CASE.horizonDays,
  plannedOrders:contract.plannedSampleOrders,
  actualOrders:contract.actualSampleOrders,
  baselineShipped:comparison.base.completed,
  baselinePending:comparison.base.pending,
  shippedOrders:comparison.recovered.completed,
  pendingOrders:comparison.recovered.pending,
  recoveredOrders:comparison.recovered.completed-comparison.base.completed,
  option,urgentArrivalDay,purchaseCoveragePercent,
  // Explicitly a partial / modeled expense, NEVER a comprehensive cost.
  incrementalExpenseCLP:comparison.incrementalExpense,
  committedPurchaseCLP:comparison.committedPurchaseValue,
  economicProxyDeltaCLP:comparison.economicProxyDelta,
  unknownTotalCost:true,
  skuIds:Object.freeze(Object.keys(contract.skuInputs.stock)),
  originalPurchaseOrders:comparison.originalPurchaseOrders,
  areaRows:projection.areaModel.rows,
  baselineKey:comparison.baselineKey
 });
}
