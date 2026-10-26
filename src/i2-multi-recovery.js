import {DEFAULT_SCENARIO} from './scenario.js';
import {I2_AREAS} from './i2-product-contract.js';
import {i2AreaSelection} from './i2-game-campaign-adapter.js';
import {I2_MVP_CASE} from './i2-mvp-adapter.js';
import {i2AdvancedPhysicalOptions} from './i2-advanced-settings.js';
import {i2DemandEventObserved} from './i2-demand-event.js';
import {campaignSkuContract} from './campaign-contract.js';
import {createRecoveryBaseline} from './recovery-baseline.js';
import {recoveryComparison} from './recovery.js';

const fail=message=>{throw new Error('I2-28: '+message)};
const valid=n=>Number.isSafeInteger(n);
const freeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(freeze);
  Object.freeze(value);
 }
 return value;
};
export const I2_MULTI_RECOVERY_VERSION=1;
const empty=()=>({
 urgentPurchase:{enabled:false,arrivalDay:2,coveragePercent:100},
 reserveTransfer:{enabled:false,releaseDay:2},
 capacityBoost:{enabled:false}
});
/**
 * Versioned canonical command. No duplicate purchases, invented stock, user-
 * supplied SKU units, monetary amounts, free-form physical events or overrides
 * of the sealed procurement baseline. Empty set = no intervention.
 */
export function i2NormalizeMultiRecovery(input=empty()){
 if(!input||typeof input!=='object'||Array.isArray(input)
  ||Object.keys(input).sort().join(',')!=='capacityBoost,reserveTransfer,urgentPurchase')
  fail('palancas adicionales o estructura incorrecta');
 const u=input.urgentPurchase,r=input.reserveTransfer,c=input.capacityBoost;
 if(!u||typeof u!=='object'||Array.isArray(u)
  ||Object.keys(u).sort().join(',')!=='arrivalDay,coveragePercent,enabled'
  ||!r||typeof r!=='object'||Array.isArray(r)
  ||Object.keys(r).sort().join(',')!=='enabled,releaseDay'
  ||!c||typeof c!=='object'||Array.isArray(c)
  ||Object.keys(c).join(',')!=='enabled'
  ||[u.enabled,r.enabled,c.enabled].some(v=>typeof v!=='boolean')
  ||!valid(u.arrivalDay)||u.arrivalDay<1||u.arrivalDay>365
  ||!valid(u.coveragePercent)||u.coveragePercent<0||u.coveragePercent>100
  ||!valid(r.releaseDay)||r.releaseDay<1||r.releaseDay>365)
  fail('compra, reserva o capacidad incompatible');
 // Canonicalize inactive controls: changing a date on a disabled lever
 // must not create a distinct physical comparison or cache key.
 return freeze({
  schema:I2_MULTI_RECOVERY_VERSION,
  urgentPurchase:{enabled:u.enabled,arrivalDay:u.enabled?u.arrivalDay:2,
   coveragePercent:u.enabled?u.coveragePercent:100},
  reserveTransfer:{enabled:r.enabled,releaseDay:r.enabled?r.releaseDay:2},
  capacityBoost:{enabled:c.enabled}
 });
}
export function i2EmptyRecoveryActions(){return i2NormalizeMultiRecovery(empty())}
export function i2LegacyRecoveryToMultiActions({option='wait',arrivalDay=2,coverage=100}={}){
 if(!['wait','overtime','reserve','emergency','combined'].includes(option))
  fail('opción guardada no reconocida');
 return i2NormalizeMultiRecovery({
  urgentPurchase:{enabled:['emergency','combined'].includes(option),arrivalDay,coveragePercent:coverage},
  reserveTransfer:{enabled:option==='reserve',releaseDay:arrivalDay},
  capacityBoost:{enabled:['overtime','combined'].includes(option)}
 });
}
const physicalActions=contract=>({
 urgentPurchase:{...contract.urgentPurchase},
 reserveTransfer:{...contract.reserveTransfer},
 capacityBoost:{...contract.capacityBoost}
});
const emptyActions=actions=>!actions.urgentPurchase.enabled
 &&!actions.reserveTransfer.enabled&&!actions.capacityBoost.enabled;
const sum=(rows,key)=>rows.reduce((n,x)=>n+x[key],0);
/**
 * Evaluate ALL requested plans against one frozen baseline and identical
 * opening/seed. This is NOT a sum of effects from standalone alternatives.
 * The contract is gated on the explicit reveal; I2-29 will add UI controls.
 * A physical reserve is only usable if the scenario already located stock in
 * RESERVA-CD before demand was revealed (reservePercent is a baseline input).
 */
export function i2CompareMultiRecovery({state,plans=[],reservePercent=0}={}){
 const event=i2DemandEventObserved(state);
 if(!Array.isArray(plans)||plans.length<1||plans.length>8
  ||!valid(reservePercent)||reservePercent<0||reservePercent>50)
  fail('número de planes o apertura de reserva inválidos');
 if(!state.choices||I2_AREAS.some(a=>!a.choices.some(c=>c.optionId===state.choices[a.id])))
  fail('las ocho decisiones originales son obligatorias');
 const advanced=i2AdvancedPhysicalOptions(state.advanced);
 const decisions=i2AreaSelection(state.choices,I2_MVP_CASE.campaignId);
 const contract=campaignSkuContract({
  campaignId:I2_MVP_CASE.campaignId,decisions,actions:{},
  scenario:{...DEFAULT_SCENARIO,demand:1000,
   actualDemand:1000*(event.observedOrders/event.plannedOrders),
   demandShockPercent:Math.abs(event.shockPercent)},
  policy:'balanced',plannedSampleOrders:advanced.plannedOrders,
  openingStock:advanced.openingStock,
  extraCapacityDailyCost:advanced.extraCapacityDailyCost,
  pickingUnitCapacityLimit:advanced.pickingUnitCapacityLimit
 });
 if(contract.actualSampleOrders!==event.observedOrders
  ||contract.plannedSampleOrders!==event.plannedOrders)
  fail('evento revelado no concilia con la campaña SKU');
 const inputs={...contract.skuInputs,reservePercent,days:12};
 const baseline=createRecoveryBaseline(inputs);
 const noAction=recoveryComparison({
  ...inputs,option:'wait',baselineSnapshot:baseline,
  urgentArrivalDay:2,purchaseCoveragePercent:100
 });
 if(noAction.recovered!==baseline.integrated.actual)
  fail('la alternativa sin intervención debe reutilizar el baseline físico');
 const results=[],seen=new Set();
 for(const raw of plans){
  const actions=i2NormalizeMultiRecovery(raw);
  const key=JSON.stringify(actions);
  if(seen.has(key))fail('plan duplicado');
  seen.add(key);
  if(actions.reserveTransfer.enabled&&baseline.openingState.totals.reserveSkuUnits===0)
   fail('no hay reserva física inicial; no se pueden inventar unidades');
  const comparison=emptyActions(actions)?noAction:recoveryComparison({
   ...inputs,option:'multi',multiActions:physicalActions(actions),
   baselineSnapshot:baseline,
   urgentArrivalDay:actions.urgentPurchase.arrivalDay,
   purchaseCoveragePercent:actions.urgentPurchase.coveragePercent
  });
  const urgentSkuUnits=sum(comparison.urgent,'qty');
  const reserveMovedSkuUnits=comparison.recovered.ledger.reduce((total,day)=>
   total+sum(day.reserveEvents,'qty'),0);
  const totalCost=comparison.urgentBase+comparison.urgentSurcharge+comparison.extraLabor;
  if(comparison.base!==noAction.base
   ||comparison.baselineKey!==noAction.baselineKey
   ||comparison.baselineSnapshot!==baseline
   ||comparison.recovered.orders!==event.observedOrders
   ||comparison.base.completed+comparison.base.pending!==event.observedOrders
   ||comparison.recovered.completed+comparison.recovered.pending!==event.observedOrders
   ||totalCost!==comparison.incrementalExpense
   ||comparison.committedPurchaseValue!==noAction.committedPurchaseValue
   ||JSON.stringify(comparison.originalPurchaseOrders)!==JSON.stringify(noAction.originalPurchaseOrders)
   ||comparison.recovered.initial.A!==noAction.base.initial.A
   ||comparison.recovered.initial.B!==noAction.base.initial.B
   ||comparison.recovered.initial.C!==noAction.base.initial.C)
   fail('comparación conjunta no conserva demanda, compras o inventario');
  const reading={
   actions,scope:'sku-cohort',horizonDays:12,
   baselineKey:baseline.scenarioKey,
   noIntervention:emptyActions(actions),
   actualOrders:event.observedOrders,
   baselineDispatchedOrders:noAction.base.completed,
   dispatchedOrders:comparison.recovered.completed,
   pendingOrders:comparison.recovered.pending,
   recoveredOrders:comparison.recovered.completed-noAction.base.completed,
   orderedUrgentSkuUnits:urgentSkuUnits,
   physicallyMovedReserveSkuUnits:reserveMovedSkuUnits,
   chargedExtraCapacityShifts:comparison.operationalCost.totals.chargeableShifts,
   idleExtraSlots:comparison.operationalCost.totals.idleExtraSlots,
   urgentPurchaseValueCLP:comparison.urgentBase,
   urgentSurchargeCLP:comparison.urgentSurcharge,
   extraCapacityCostCLP:comparison.extraLabor,
   incrementalExpenseCLP:totalCost,
   economicProxyDeltaCLP:comparison.economicProxyDelta,
   originalPurchaseCommitmentCLP:comparison.committedPurchaseValue,
   totalOperatingCostCLP:null,customerDeliveredOrders:null,
   urgentOrders:comparison.urgent.map(u=>({id:u.id,qty:u.qty,day:u.day})),
   provenance:'recoveryComparison (motor SKU único), one frozen createRecoveryBaseline and originalPurchaseOrders',
   boundary:'Son resultados conjuntos, no sumas de recuperaciones aisladas; salida del CD no equivale a entrega al cliente. Compra es un nuevo compromiso modelado, no pago acreditado; CLP parcial, costo total desconocido.'
  };
  results.push({reading:freeze(reading),comparison});
 }
 return freeze({
  schema:I2_MULTI_RECOVERY_VERSION,scope:'sku-cohort',horizonDays:12,
  baselineKey:baseline.scenarioKey,
  baseline,baselineComparison:noAction,
  results,
  source:'campaignSkuContract + createRecoveryBaseline + recoveryComparison + eventSimulation',
  note:'Mismo evento revelado, reserva preexistente y plan original para todos los escenarios. La suma de ganancias independientes no es válida.'
 });
}
