import {normalizeI2GameState} from './i2-game-state.js';
import {i2OperationalEventsForSeed} from './operational-event-schedule.js';
import {i2NormalizeMultiRecovery,i2CompareMultiRecovery} from './i2-multi-recovery.js';
import {i2ConfirmMultiRecovery} from './i2-recovery-confirmation.js';
import {i2DailyOperationsSnapshot} from './i2-daily-operations.js';

/**
 * I2-35.8b · Dos órdenes nuevas durante la jornada observada 3.
 *
 * Se utiliza el MISMO motor de compras y reserva por SKU que en la primera
 * respuesta al incidente. El cambio se materializa a partir del día 4:
 * - buy: orden por faltante SKU; compra/costo modelados, llegada día 4.
 * - reserve: traslado del stock de RESERVA-CD ya existente, día 4.
 *
 * No existe segundo libro de stock, PO ni costos. Los marcadores de emisión
 * sirven solo para explicar cuándo el gerente autorizó cada decisión.
 */
const fail=reason=>{throw new Error('I2-35.8b: '+reason)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function i2Day3SupplyAvailability(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='recover'||state.incidentViewDay!==3
  ||!state.eventSeed||!state.recoveryConfirmation||state.incidentStep===2
  ||i2OperationalEventsForSeed(state.eventSeed)[0]?.kind!=='receiving-stop')
  return Object.freeze({buy:false,reserve:false});
 const actions=state.recoveryConfirmation.actions;
 // La reserva inicial debe haber sido separada antes del reveal.
 const canReserve=!actions.reserveTransfer.enabled
  &&(state.advanced.reservePercent??0)===25;
 return Object.freeze({
  buy:!actions.urgentPurchase.enabled,
  reserve:canReserve
 });
}
function proposal(state,kind){
 if(!['buy','reserve'].includes(kind)||!i2Day3SupplyAvailability(state)[kind])
  fail('la orden no está habilitada o ya fue emitida en esta misión');
 const previous=state.recoveryConfirmation.actions;
 return i2NormalizeMultiRecovery({
  urgentPurchase:kind==='buy'
   ?{enabled:true,arrivalDay:4,coveragePercent:100}
   :previous.urgentPurchase,
  reserveTransfer:kind==='reserve'
   ?{enabled:true,releaseDay:4}
   :previous.reserveTransfer,
  capacityBoost:previous.capacityBoost
 });
}

/**
 * Oferta visible al gerente ANTES de aceptar. Devuelve únicamente unidades
 * comprometidas, costo de compra/recargo y stock reservado, NUNCA resultados
 * futuros, incidencias aún no observadas ni pedidos expedidos al cierre.
 */
export function i2Day3SupplyQuote(raw,kind){
 const state=normalizeI2GameState(raw);
 if(!state)fail('partida inválida');
 const actions=proposal(state,kind);
 const scenario=i2CompareMultiRecovery({state,plans:[actions]});
 const row=scenario.results[0].reading;
 return Object.freeze({
  kind,issuedDay:3,effectiveDay:4,
  ...(kind==='buy'?{
   committedSkuUnits:row.orderedUrgentSkuUnits,
   principalCLP:row.urgentPurchaseValueCLP,
   surchargeCLP:row.urgentSurchargeCLP,
   incrementalPurchaseCLP:row.urgentPurchaseValueCLP+row.urgentSurchargeCLP
  }:{
   existingReserveSkuUnits:scenario.baseline.openingState.totals.reserveSkuUnits,
   additionalPurchaseCLP:0
  }),
  note:kind==='buy'
   ?'Orden de compra modelada, NO pago ni recepción confirmada. La llegada al muelle no equivale a stock liberado.'
   :'Movimiento de reserva que YA existe; no agrega stock ni tiene costo incremental de traslado calibrado.'
 });
}

/**
 * Confirma una orden adicional a la respuesta inicial sin retroactividad.
 * La re-confirmación conserva las compras originales, la semilla, el plan
 * inicial y cualquier refuerzo de muelle previamente autorizado.
 */
export function i2ConfirmDay3SupplyFollowup(raw,kind){
 const state=normalizeI2GameState(raw);
 if(!state)fail('estado inválido');
 const actions=proposal(state,kind);
 const priorDay=i2DailyOperationsSnapshot(state);
 const old=i2CompareMultiRecovery({
  state,plans:[state.recoveryConfirmation.actions]
 });
 const pending={...state};
 for(const field of [
  'recoveryConfirmation','incidentViewDay','incidentStep',
  'receivingResponse','receivingFollowupIssuedDay',
  'purchaseFollowupIssuedDay','reserveFollowupIssuedDay'
 ])delete pending[field];
 const confirmed=i2ConfirmMultiRecovery(pending,actions);
 const updated=normalizeI2GameState({
  ...confirmed,incidentViewDay:3,
  ...(state.incidentStep?{incidentStep:state.incidentStep}:{}),
  ...(state.receivingResponse?{receivingResponse:state.receivingResponse}:{}),
  ...(state.receivingFollowupIssuedDay===3?{receivingFollowupIssuedDay:3}:{}),
  ...(kind==='buy'||state.purchaseFollowupIssuedDay===3?{purchaseFollowupIssuedDay:3}:{}),
  ...(kind==='reserve'||state.reserveFollowupIssuedDay===3?{reserveFollowupIssuedDay:3}:{})
 });
 if(!updated)fail('orden no supera validación temporal/persistencia');
 const newDay=i2DailyOperationsSnapshot(updated);
 const after=i2CompareMultiRecovery({
  state:updated,plans:[updated.recoveryConfirmation.actions]
 });
 if(!same(priorDay,newDay)
  ||!same(old.results[0].comparison.recovered.ledger.slice(0,4),
   after.results[0].comparison.recovered.ledger.slice(0,4))
  ||!same(old.results[0].comparison.originalPurchaseOrders,
   after.results[0].comparison.originalPurchaseOrders)
  ||old.baselineKey!==after.baselineKey
  ||old.results[0].reading.actualOrders!==after.results[0].reading.actualOrders)
  fail('la nueva orden cambió días anteriores, demanda o compras originales');
 return Object.freeze(updated);
}
