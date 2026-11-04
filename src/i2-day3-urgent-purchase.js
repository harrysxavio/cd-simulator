import {normalizeI2GameState} from './i2-game-state.js';
import {i2OperationalEventsForSeed} from './operational-event-schedule.js';
import {i2NormalizeMultiRecovery,i2CompareMultiRecovery} from './i2-multi-recovery.js';
import {i2ConfirmMultiRecovery} from './i2-recovery-confirmation.js';
import {i2DailyOperationsSnapshot} from './i2-daily-operations.js';

const invalid=reason=>{throw new Error('I2-35.8b: '+reason)};

/**
 * Segunda oportunidad de Compras, únicamente después de observar día 3.
 * Es una nueva orden con llegada día 4, no una edición retroactiva de la
 * orden de proveedor confirmada antes de conocer demanda/incidentes.
 */
function eligible(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='recover'||state.incidentViewDay!==3||
  !state.eventSeed||!state.recoveryConfirmation||state.incidentStep===2||
  state.urgentFollowupIssuedDay===3||
  state.recoveryConfirmation.actions.urgentPurchase.enabled)
  invalid('compra nueva solo en día 3 observado y si no existía compra urgente');
 if(i2OperationalEventsForSeed(state.eventSeed)[0]?.kind!=='receiving-stop')
  invalid('esta orden requiere la misión con parada observada de Recepción');
 return state;
}

/**
 * Cotización sin mostrar despachos futuros. Unidades y monto salen del
 * MISMO comparador SKU: faltante BOM, compras originales, recargo urgente.
 * El día 4 es llegada al muelle, NO disponibilidad inmediata para Picking.
 */
export function i2Day3UrgentPurchaseQuote(raw){
 const state=eligible(raw);
 const previous=state.recoveryConfirmation.actions;
 const actions=i2NormalizeMultiRecovery({
  urgentPurchase:{enabled:true,arrivalDay:4,coveragePercent:100},
  reserveTransfer:previous.reserveTransfer,
  capacityBoost:previous.capacityBoost
 });
 const result=i2CompareMultiRecovery({state,plans:[actions]}).results[0].reading;
 if(result.orderedUrgentSkuUnits<=0)
  invalid('no existe faltante de SKU que justifique una compra urgente');
 const purchaseCLP=result.urgentPurchaseValueCLP;
 const surchargeCLP=result.urgentSurchargeCLP;
 if(!Number.isFinite(purchaseCLP)||!Number.isFinite(surchargeCLP)||
  purchaseCLP<0||surchargeCLP<0)
  invalid('cotización económica no conciliable');
 return Object.freeze({
  issuedDay:3,effectiveDay:4,
  skuUnits:result.orderedUrgentSkuUnits,
  purchaseCLP,surchargeCLP,totalCLP:purchaseCLP+surchargeCLP,
  actions,
  boundary:'Llegada prevista al muelle en día 4. El costo no garantiza liberar Calidad ni completar más pedidos.'
 });
}

export function i2ConfirmDay3UrgentPurchase(raw){
 const state=eligible(raw);
 const quote=i2Day3UrgentPurchaseQuote(state);
 const before=i2CompareMultiRecovery({
  state,plans:[state.recoveryConfirmation.actions]
 }).results[0].comparison;
 const beforeDay=i2DailyOperationsSnapshot(state);
 // Reconfirmar la combinación con la nueva compra, sin rehacer ni guardar
 // stock físico. El motor existente contabiliza SKU y pesos de la urgencia.
 const confirmed=i2ConfirmMultiRecovery(state,quote.actions);
 const next=normalizeI2GameState({...confirmed,urgentFollowupIssuedDay:3});
 if(!next)invalid('la orden no supera el contrato de persistencia');
 const after=i2CompareMultiRecovery({
  state:next,plans:[next.recoveryConfirmation.actions]
 }).results[0].comparison;
 if(JSON.stringify(before.recovered.ledger.slice(0,4))!==
   JSON.stringify(after.recovered.ledger.slice(0,4))||
  JSON.stringify(before.originalPurchaseOrders)!==
   JSON.stringify(after.originalPurchaseOrders)||
  JSON.stringify(beforeDay)!==JSON.stringify(i2DailyOperationsSnapshot(next)))
  invalid('la compra alteró jornadas 0–3 o el compromiso original');
 return Object.freeze(next);
}
