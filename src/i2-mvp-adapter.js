import {DEFAULTS} from './engine.js';
import {DEFAULT_SCENARIO} from './scenario.js';
import {I2_AREAS,I2_RECOVERIES} from './i2-product-contract.js';
import {createI2GameCampaignAdapter,i2AreaSelection} from './i2-game-campaign-adapter.js';

/**
 * Stable MVP façade over I2-04's validated physical adapter.
 * Keep the first playable campaign unchanged while eliminating the earlier
 * one-off orchestration of contract, recovery and SKU read models.
 */
export const I2_MVP_CASE=Object.freeze({
 campaignId:'CD-I2-MVP-ALFA',plannedOrders:200,shockPercent:40,
 scenario:'demanda-sorpresa-40',horizonDays:12
});
const shared=createI2GameCampaignAdapter({});

export function i2DefaultChoices(){
 return Object.freeze(Object.fromEntries(
  I2_AREAS.map(area=>[area.id,DEFAULTS[area.id]])
 ));
}

export function i2CanonicalChoices(choices){
 return i2AreaSelection(choices,I2_MVP_CASE.campaignId);
}

/**
 * Only the explicit reveal in juego/app.js may call this function.
 * Do NOT render actual-demand results in the planning/onboarding phases.
 */
export function i2MvpPhysicalResult({
 choices=i2DefaultChoices(),option='wait',urgentArrivalDay=2,purchaseCoveragePercent=100
}={}){
 if(!I2_RECOVERIES.some(r=>r.optionId===option))
  throw new Error('Misión CD: recuperación inválida');
 // MVP-specific UI options. The general I2 adapter accepts broader valid
 // ranges, but this demo presents only the options tested in its controls.
 if(![1,2,5,10,13].includes(urgentArrivalDay))
  throw new Error('Misión CD: plazo urgente inválido');
 if(![0,25,50,75,100].includes(purchaseCoveragePercent))
  throw new Error('Misión CD: cobertura urgente inválida');
 const canonical=shared.evaluate({
  revealed:true,choices,
  campaignId:I2_MVP_CASE.campaignId,
  plannedOrders:I2_MVP_CASE.plannedOrders,
  scenario:{
   ...DEFAULT_SCENARIO,
   demand:1000,
   actualDemand:1000*(1+I2_MVP_CASE.shockPercent/100),
   demandShockPercent:I2_MVP_CASE.shockPercent
  },
  policy:'balanced',option,urgentArrivalDay,purchaseCoveragePercent
 });
 const {contract,comparison,areaModel}=canonical;
 return Object.freeze({
  scope:canonical.scope,horizonDays:canonical.horizonDays,
  plannedOrders:contract.plannedSampleOrders,
  actualOrders:contract.actualSampleOrders,
  baselineShipped:comparison.base.completed,
  baselinePending:comparison.base.pending,
  shippedOrders:comparison.recovered.completed,
  pendingOrders:comparison.recovered.pending,
  recoveredOrders:comparison.recovered.completed-comparison.base.completed,
  option,urgentArrivalDay,purchaseCoveragePercent,
  incrementalExpenseCLP:comparison.incrementalExpense,
  committedPurchaseCLP:comparison.committedPurchaseValue,
  economicProxyDeltaCLP:comparison.economicProxyDelta,
  unknownTotalCost:true,
  skuIds:Object.freeze(Object.keys(contract.skuInputs.stock)),
  originalPurchaseOrders:comparison.originalPurchaseOrders,
  areaRows:areaModel.stages,
  baselineKey:comparison.baselineKey
 });
}
