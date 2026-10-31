/**
 * I2-35 · Read-only comparison of deterministic challenges and recovery choices.
 * Reuses the canonical SKU engine; does not modify game state or count unknown costs as zero.
 */
import {I2_CHALLENGES,i2ChallengeReveal} from './i2-challenge-config.js';
import {i2MvpPhysicalResult,i2DefaultChoices} from './i2-mvp-adapter.js';
import {I2_DEFAULT_ADVANCED,I2_ADVANCED_FIELDS,i2ValidateAdvanced} from './i2-advanced-settings.js';

const options=Object.freeze(['wait','overtime','reserve','emergency','combined']);
const fixed=n=>Number.isSafeInteger(n)&&n>0;
const row=x=>Object.freeze({
 option:x.option,shippedOrders:x.shippedOrders,pendingOrders:x.pendingOrders,
 servicePercent:Number((100*x.shippedOrders/x.actualOrders).toFixed(2)),
 incrementalExpenseCLP:x.incrementalExpenseCLP,
 recoveredOrders:x.recoveredOrders,
 // Marginal CLP only if the intervention actually recovers orders.
 clpPerRecoveredOrder:x.recoveredOrders>0
  ?x.incrementalExpenseCLP/x.recoveredOrders:null
});

/**
 * Compare the SAME seed, planned cohort and eight committed area decisions.
 * Inputs are passed to one existing model; no scoring formula or synthetic ledger.
 */
export function i2ChallengeReplayMatrix({choices=i2DefaultChoices(),plannedOrders,advanced=I2_DEFAULT_ADVANCED,seed,
 urgentArrivalDay=2,purchaseCoveragePercent=100,operationalEvents=[]}={}){
 // Preserve every setting of the current session (inventory, picking, reserve and cost).
 // plannedOrders remains an explicit compatibility override for existing callers.
 if(plannedOrders!==undefined&&(!fixed(plannedOrders)||!I2_ADVANCED_FIELDS.plannedOrders.includes(plannedOrders)))
  throw new Error('I2-35: muestra inválida');
 const settings=i2ValidateAdvanced(plannedOrders===undefined?advanced:{...advanced,plannedOrders});
 const selected=I2_CHALLENGES.filter(c=>seed===undefined||c.seed===seed);
 if(!selected.length)throw new Error('I2-35: semilla desconocida');
 return Object.freeze(selected.map(challenge=>{
  const shock=i2ChallengeReveal(challenge.seed,settings.plannedOrders);
  const results=options.map(option=>{
   const result=i2MvpPhysicalResult({choices,seed:challenge.seed,
    advanced:settings,option,urgentArrivalDay,purchaseCoveragePercent,operationalEvents});
   if(result.actualOrders!==shock.actualOrders ||
      result.shippedOrders+result.pendingOrders!==result.actualOrders ||
      !Number.isSafeInteger(result.incrementalExpenseCLP) ||
      result.incrementalExpenseCLP<0)
    throw new Error('I2-35: falta conciliación física o económica');
   return {...row({...result,option}),baselineKey:result.baselineKey,
    originalPurchaseOrders:result.originalPurchaseOrders};
  });
  const baseline=results[0];
  for(const result of results){
   if(result.baselineKey!==baseline.baselineKey ||
      JSON.stringify(result.originalPurchaseOrders)!==
      JSON.stringify(baseline.originalPurchaseOrders))
    throw new Error('I2-35: se alteró el escenario original');
  }
  return Object.freeze({
   seed:challenge.seed,level:challenge.level,label:challenge.label,
   plannedOrders:settings.plannedOrders,actualOrders:shock.actualOrders,shockPercent:shock.shockPercent,
   recoveries:Object.freeze(results.map(({baselineKey,originalPurchaseOrders,...r})=>Object.freeze(r))),
   boundary:'Compara solo pedidos expedidos, pendientes y gasto incremental conocido; no compara colas por intervención. Sin costo total, productividad por persona-hora ni entrega al consumidor.'
  });
 }));
}
