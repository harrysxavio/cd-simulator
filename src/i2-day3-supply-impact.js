import {normalizeI2GameState} from './i2-game-state.js';
import {i2CompareMultiRecovery,i2NormalizeMultiRecovery} from './i2-multi-recovery.js';

/**
 * I2-37.5a · Aprendizaje causal sobre decisiones emitidas el día 3.
 *
 * Reproduce la MISMA cohorte SKU, demanda, calendario, capacidad y órdenes
 * externas con/sin las decisiones nuevas de Compras/Inventario del día 3.
 * Solo devuelve resultados hasta la jornada observada, nunca un pronóstico
 * ni eventos aún ocultos. Las compras originales quedan idénticas.
 */
const fail=reason=>{throw new Error('I2-37.5a: '+reason)};
const freeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const item of Object.values(value))freeze(item);
  Object.freeze(value);
 }
 return value;
};
const total=(arr,key)=>arr.reduce((n,x)=>n+x[key],0);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function i2Day3SupplyImpactReading(raw){
 const state=normalizeI2GameState(raw);
 if(!state)fail('partida incompatible');
 const hasBuy=state.purchaseFollowupIssuedDay===3;
 const hasReserve=state.reserveFollowupIssuedDay===3;
 if(!hasBuy&&!hasReserve)return null;
 if(state.phase!=='recover'||!Number.isSafeInteger(state.incidentViewDay))
  return null;
 const day=state.incidentViewDay;
 if(day<4)return null; // Antes de la llegada/reubicación, nada observable.
 const currentActions=state.recoveryConfirmation.actions;
 const noLateActions=i2NormalizeMultiRecovery({
  urgentPurchase:hasBuy?{
   enabled:false,arrivalDay:2,coveragePercent:100
  }:currentActions.urgentPurchase,
  reserveTransfer:hasReserve?{
   enabled:false,releaseDay:2
  }:currentActions.reserveTransfer,
  capacityBoost:currentActions.capacityBoost
 });
 const comparison=i2CompareMultiRecovery({
  state,plans:[currentActions,noLateActions]
 });
 const withOrder=comparison.results[0],without=comparison.results[1];
 const current=withOrder.comparison.recovered.ledger;
 const noLate=without.comparison.recovered.ledger;
 if(comparison.baselineKey!==withOrder.reading.baselineKey
  ||comparison.baselineKey!==without.reading.baselineKey
  ||!equal(current.slice(0,4),noLate.slice(0,4))
  ||!equal(withOrder.comparison.originalPurchaseOrders,
   without.comparison.originalPurchaseOrders)
  ||current[day]?.day!==day||noLate[day]?.day!==day)
  fail('contrafactual no concilia con la física anterior ni las compras iniciales');
 const observedWith=current[day],observedWithout=noLate[day];
 const expenseDiff=withOrder.reading.incrementalExpenseCLP
  -without.reading.incrementalExpenseCLP;
 const thisDayReserveEvents=current.slice(4,day+1)
  .flatMap(row=>row.reserveEvents??[]);
 const thisDayUrgentArrivals=current.slice(4,day+1)
  .flatMap(row=>row.dockArrivals??[]).filter(x=>x.urgent);
 return freeze({
  day,scope:'sku-cohort',comparison:'same-campaign-without-day-3-supply-orders',
  modes:[...(hasBuy?['purchasing']:[]),...(hasReserve?['inventory']:[])],
  shippedToday:observedWith.shipped,
  shippedWithoutToday:observedWithout.shipped,
  additionalShippedToday:observedWith.shipped-observedWithout.shipped,
  shippedToDate:observedWith.completed,
  shippedWithoutToDate:observedWithout.completed,
  additionalShippedToDate:observedWith.completed-observedWithout.completed,
  pendingOrders:observedWith.backlog,
  pendingWithout:observedWithout.backlog,
  pendingDifference:observedWith.backlog-observedWithout.backlog,
  waitingReceivingSkuUnits:observedWith.waitingReceiving,
  waitingReceivingWithoutSkuUnits:observedWithout.waitingReceiving,
  waitingReceivingDifference:observedWith.waitingReceiving-observedWithout.waitingReceiving,
  movedReserveSkuUnitsToDate:total(thisDayReserveEvents,'qty'),
  urgentSkuUnitsArrivedAtDockToDate:total(thisDayUrgentArrivals,'qty'),
  additionalCommittedCLP:expenseDiff,
  note:'Comparación contrafactual educativa con las mismas decisiones previas. Un gasto o una llegada al muelle no implica que hoy se despachen más pedidos. No acredita entrega al cliente ni muestra jornadas futuras.'
 });
}
