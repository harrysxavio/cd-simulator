import {normalizeI2GameState} from './i2-game-state.js';
import {i2NormalizeMultiRecovery} from './i2-multi-recovery.js';
import {i2CompareMultiRecovery} from './i2-multi-recovery.js';
import {i2SafeScorecard} from './i2-result-boundary.js';

const fail=message=>{throw new Error('I2-30: '+message)};
const frozen=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  Object.values(x).forEach(frozen);Object.freeze(x);
 }
 return x;
};
const verified=state=>{
 const safe=normalizeI2GameState(state);
 if(!safe||!safe.reveal||safe.confirmedAreas.length!==8
  ||!['recover','review','result'].includes(safe.phase))
  fail('solo puedes confirmar después de revelar la demanda');
 return safe;
};
function replay(state,actions){
 const multi=i2CompareMultiRecovery({
  state,plans:[actions],reservePercent:state.advanced.reservePercent??0
 });
 const row=multi.results[0].reading;
 if(multi.baselineKey!==row.baselineKey||multi.baseline.actualOrders!==row.actualOrders
  ||multi.baselineComparison.base.completed!==row.baselineDispatchedOrders
  ||multi.baselineComparison.committedPurchaseValue!==row.originalPurchaseCommitmentCLP)
  fail('el plan no concilia con el baseline');
 return {multi,row};
}
/**
 * A single explicit, serializable command, never a precomputed receipt or
 * derived scoring ledger. Saves seed, old scenario key, and selected levers.
 */
export function i2ConfirmMultiRecovery(state,rawActions){
 const safe=verified(state);
 if(safe.phase!=='recover')fail('la confirmación solo se realiza en recuperación');
 const actions=i2NormalizeMultiRecovery(rawActions);
 const {multi,row}=replay(safe,actions);
 const event=frozen({
  version:1,seed:safe.seed,plannedOrders:safe.advanced.plannedOrders,
  observedOrders:row.actualOrders,baselineKey:multi.baselineKey,actions
 });
 const result=normalizeI2GameState({...safe,recoveryConfirmation:event});
 if(!result)fail('el evento no cumple la forma guardable');
 return frozen(result);
}
/** Return to the classic choice. Does not modify original eight choices. */
export function i2ClearMultiRecovery(state){
 const safe=normalizeI2GameState(state);
 if(!safe)fail('estado inválido');
 const next={...safe};delete next.recoveryConfirmation;
 return normalizeI2GameState(next);
}
export function i2ConfirmedMultiOutcome(state){
 const safe=verified(state),event=safe.recoveryConfirmation;
 if(!event)fail('no existe una combinación confirmada');
 if(event.seed!==safe.seed||event.plannedOrders!==safe.advanced.plannedOrders)
  fail('semilla o planificación originales alteradas');
 const {multi,row}=replay(safe,event.actions);
 if(event.baselineKey!==multi.baselineKey||event.observedOrders!==row.actualOrders)
  fail('la confirmación no pertenece al escenario actual');
 const result={
  scope:'sku-cohort',horizonDays:12,unknownTotalCost:true,
  plannedOrders:event.plannedOrders,actualOrders:row.actualOrders,
  baselineShipped:row.baselineDispatchedOrders,
  baselinePending:row.actualOrders-row.baselineDispatchedOrders,
  shippedOrders:row.dispatchedOrders,pendingOrders:row.pendingOrders,
  recoveredOrders:row.recoveredOrders,
  incrementalExpenseCLP:row.incrementalExpenseCLP,
  committedPurchaseCLP:row.originalPurchaseCommitmentCLP,
  economicProxyDeltaCLP:row.economicProxyDeltaCLP
 };
 const scorecard=i2SafeScorecard(result);
 return frozen({
  kind:'confirmed-multi-recovery',source:'I2-28 physical single replay',
  event,reading:row,scorecard,
  baselineKey:multi.baselineKey,
  note:'Combinación confirmada, recalculada desde el mismo motor SKU. El evento guardado NO incluye stock, PO nueva, movimientos, valores de resultado ni datos personales.'
 });
}
