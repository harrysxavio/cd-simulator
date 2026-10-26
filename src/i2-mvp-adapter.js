import {DEFAULTS} from './engine.js';
import {DEFAULT_SCENARIO} from './scenario.js';
import {i2ChallengeForSeed,I2_DEFAULT_SEED} from './i2-challenge-config.js';
import {i2AdvancedPhysicalOptions,I2_DEFAULT_ADVANCED} from './i2-advanced-settings.js';
import {commercialPlanningReading} from './commercial-planning.js';
import {i2CommercialOutcomeReading} from './i2-commercial-forecast-lesson.js';
import {i2PlanningCoverageOutcome} from './i2-planning-coverage.js';
import {i2SupplierOutcomeReading} from './i2-supplier-purchasing.js';
import {i2ReceivingOutcomeReading} from './i2-receiving-dock.js';
import {i2QualityReleaseOutcomeReading} from './i2-quality-release.js';
import {i2InventoryPhysicalReading} from './i2-inventory-physical.js';
import {i2PickingFulfillmentReading} from './i2-picking-bom.js';
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
 choices=i2DefaultChoices(),option='wait',urgentArrivalDay=2,purchaseCoveragePercent=100,
 seed=I2_DEFAULT_SEED,advanced=I2_DEFAULT_ADVANCED
}={}){
 if(!I2_RECOVERIES.some(r=>r.optionId===option))
  throw new Error('Misión CD: recuperación inválida');
 // MVP-specific UI options. The general I2 adapter accepts broader valid
 // ranges, but this demo presents only the options tested in its controls.
 if(![1,2,5,10,13].includes(urgentArrivalDay))
  throw new Error('Misión CD: plazo urgente inválido');
 if(![0,25,50,75,100].includes(purchaseCoveragePercent))
  throw new Error('Misión CD: cobertura urgente inválida');
 // La semilla se fija antes de planificar y no depende de decisiones ni desempeño.
 const challenge=i2ChallengeForSeed(seed);
 const options=i2AdvancedPhysicalOptions(advanced);
 const canonical=shared.evaluate({
  revealed:true,choices,
  campaignId:I2_MVP_CASE.campaignId,
  plannedOrders:options.plannedOrders,
  openingStock:options.openingStock,
  extraCapacityDailyCost:options.extraCapacityDailyCost,
  pickingUnitCapacityLimit:options.pickingUnitCapacityLimit,
  scenario:{
   ...DEFAULT_SCENARIO,
   demand:1000,
   actualDemand:1000*(1+challenge.shockPercent/100),
   demandShockPercent:Math.abs(challenge.shockPercent)
  },
  policy:'balanced',option,urgentArrivalDay,purchaseCoveragePercent
 });
 const {contract,comparison,areaModel}=canonical;
 const planning=i2PlanningCoverageOutcome(comparison.planningCommitment);
 const purchasing=i2SupplierOutcomeReading(comparison);
 const receiving=i2ReceivingOutcomeReading(comparison);
 const quality=i2QualityReleaseOutcomeReading(comparison);
 const inventory=i2InventoryPhysicalReading(comparison);
 const picking=i2PickingFulfillmentReading(comparison);
 // Reusar el manifiesto físico original e inmutable del motor SKU.
 const commercial=i2CommercialOutcomeReading(commercialPlanningReading(
  comparison.planningCommitment,{actualOrders:contract.actualSampleOrders,
   originalPurchaseOrders:comparison.originalPurchaseOrders}
 ));
 return Object.freeze({
  scope:canonical.scope,horizonDays:canonical.horizonDays,
  plannedOrders:contract.plannedSampleOrders,
  actualOrders:contract.actualSampleOrders,
  baselineShipped:comparison.base.completed,
  baselinePending:comparison.base.pending,
  shippedOrders:comparison.recovered.completed,
  pendingOrders:comparison.recovered.pending,
  recoveredOrders:comparison.recovered.completed-comparison.base.completed,
  option,urgentArrivalDay,purchaseCoveragePercent,seed,
  incrementalExpenseCLP:comparison.incrementalExpense,
  committedPurchaseCLP:comparison.committedPurchaseValue,
  economicProxyDeltaCLP:comparison.economicProxyDelta,
  unknownTotalCost:true,
  skuIds:Object.freeze(Object.keys(contract.skuInputs.stock)),
  originalPurchaseOrders:comparison.originalPurchaseOrders,
  commercial,planning,purchasing,receiving,quality,inventory,picking,
  areaRows:areaModel.stages,
  baselineKey:comparison.baselineKey
 });
}
