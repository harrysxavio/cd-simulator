/**
 * M5-21 · The deliberate decision to WAIT is an action with ZERO intervention.
 *
 * This is an audit/projection of the already frozen no-intervention SKU replay,
 * not an additional simulation. No "estimated delivery" beyond the horizon is
 * inferred for unshipped orders. Dispatch from CD is not customer delivery.
 */
const fail=message=>{throw new Error('Espera sin intervenir SKU: '+message)};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const equal=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<0.000001;
const freezeDeep=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const part of Object.values(value))freezeDeep(part);
  Object.freeze(value);
 }
 return value;
};
export function waitWithoutInterventionReadModel({baseline,recovered,comparison}={}){
 const actual=baseline?.integrated?.actual,horizon=actual?.days;
 if(baseline?.scope!=='sku-cohort'||baseline.stage!=='before-recovery'
  ||!Object.isFrozen(baseline)||!Object.isFrozen(actual)
  ||comparison?.option!=='wait'
  ||comparison.baselineSnapshot!==baseline
  ||comparison.integrated!==baseline.integrated
  ||comparison.base!==actual||recovered!==actual
  ||!integer(horizon)||horizon>365
  ||!Array.isArray(actual.ledger)||actual.ledger.length!==horizon+1
  ||!Array.isArray(actual.ordersDetail)||actual.ordersDetail.length!==actual.orders
  ||!Array.isArray(actual.extraDeliveries)||actual.extraDeliveries.length!==0
  ||actual.reserveReleaseDay!==null||actual.separateTransport!==baseline.seed.separateTransport
  ||comparison.urgent?.length!==0||comparison.urgentBase!==0||comparison.urgentSurcharge!==0
  ||comparison.extraLabor!==0||comparison.incrementalExpense!==0
  ||!equal(comparison.incrementalRevenue,0)||!equal(comparison.netCashDelta,0)
  ||!equal(comparison.penaltySaved,0)||!equal(comparison.holdingDelta,0)
  ||!equal(comparison.economicProxyDelta,0)
  ||comparison.operationalCost?.totals?.chargeableShifts!==0
  ||comparison.operationalCost?.totals?.totalCostCLP!==0){
  fail('la opción de esperar no coincide con el baseline físico congelado');
 }
 const orders=new Set(),shippedByDay=new Map(),stagedByDay=new Map();
 for(const order of actual.ordersDetail){
  if(!order||typeof order.id!=='string'||!order.id||orders.has(order.id)
   ||(order.fulfilledDay!==null&&(!integer(order.fulfilledDay)||order.fulfilledDay>horizon))
   ||(order.pickedDay!==null&&(!integer(order.pickedDay)||order.pickedDay>horizon))
   ||(order.fulfilledDay!==null&&(order.pickedDay===null||order.pickedDay>order.fulfilledDay))){
   fail('pedido físico duplicado o fechado incorrectamente');
  }
  orders.add(order.id);
  if(order.fulfilledDay!==null)shippedByDay.set(order.fulfilledDay,
   (shippedByDay.get(order.fulfilledDay)||0)+1);
  if(order.fulfilledDay===null&&order.pickedDay!==null){
   stagedByDay.set(order.pickedDay,(stagedByDay.get(order.pickedDay)||0)+1);
  }
 }
 const rows=[];let cumulative=0,backlogOrderDays=0;
 for(let day=0;day<=horizon;day++){
  const entry=actual.ledger[day],physicalShipped=shippedByDay.get(day)||0;
  if(entry?.day!==day||!integer(entry.shipped)||!integer(entry.completed)
   ||!integer(entry.backlog)||entry.shipped!==physicalShipped
   ||entry.shipmentEvents?.length!==physicalShipped
   ||!Array.isArray(entry.reserveEvents)||entry.reserveEvents.length!==0
   ||!Array.isArray(entry.receivedUrgent)
      &&Object.values(entry.receivedUrgent??{}).some(n=>n!==0)
   ||Object.values(entry.receivedUrgent??{}).some(n=>n!==0)
   ||!integer(entry.stagingOrders)){
   fail('la cronología física no concilia');
  }
  cumulative+=physicalShipped;
  if(entry.completed!==cumulative||entry.backlog!==actual.orders-cumulative){
   fail('el backlog no coincide con las expediciones del día');
  }
  if(day<horizon)backlogOrderDays+=entry.backlog;
  rows.push({
   day,shippedOrders:physicalShipped,shippedToDate:cumulative,
   pendingAtDayEnd:entry.backlog,
   stagedWaitingTransport:entry.stagingOrders,
   urgentSkuUnitsReceived:0,reserveSkuUnitsTransferred:0,
   addedCapacityShiftCount:0,incrementalExpenseCLP:0,
   customerDeliveryConfirmed:false
  });
 }
 const pending=actual.ordersDetail.filter(o=>o.fulfilledDay===null);
 const stagedAtEnd=pending.filter(o=>o.pickedDay!==null).length;
 if(cumulative!==actual.completed||pending.length!==actual.pending
  ||rows.at(-1).pendingAtDayEnd!==actual.pending
  ||rows.at(-1).stagedWaitingTransport!==stagedAtEnd
  ||!integer(actual.onTime)||actual.onTime!==rows[0].shippedOrders
  ||!equal(comparison.backlogDaysRecovered,backlogOrderDays)
  ||!equal(comparison.backlogDaysBase,backlogOrderDays)
  ||!equal(comparison.penaltyRecovered,comparison.penaltyBase)
  ||!equal(comparison.holdingRecovered,comparison.holdingBase)){
  fail('cumplimiento, espera o valor económico no concilian con el baseline');
 }
 return freezeDeep({
  passed:true,scope:'sku-cohort',option:'wait',currency:'CLP',
  stage:'no-intervention',days:horizon,
  baselineKey:baseline.scenarioKey,
  transportMode:actual.separateTransport?'picking-staging-transport':'same-day-picking-dispatch',
  totals:{
   demandOrders:actual.orders,
   shippedCompleteOrders:actual.completed,
   shippedOnDayZero:actual.onTime,
   shippedAfterDayZero:actual.late,
   pendingAfterHorizon:actual.pending,
   stagedAwaitingTransport:stagedAtEnd,
   backlogOrderDaysBeforeFinalCutoff:backlogOrderDays,
   urgentPurchaseSkuUnits:0,
   reserveTransfersSkuUnits:0,
   extraCapacityShifts:0,
   incrementalExpenseCLP:0,
   incrementalRevenueProxyCLP:0,
   incrementalCashProxyCLP:0,
   incrementalEconomicProxyCLP:0
  },
  daily:rows,
  unshippedPromises:{
   count:actual.pending,promisedDispatchDay:null,
   confirmedCustomerDeliveryDay:null,unknownBeyondHorizon:true
  },
  checks:{
   samePhysicalReplayObject:true,
   orderLevelDatesMatchDailyShipments:true,
   backlogReconcilesEveryDay:true,
   noExtraPurchases:true,noReserveMovements:true,noExtraCapacity:true,
   zeroIncrementalCostAndProxies:true,
   noCustomerDeliveryClaim:true
  },
  note:'Esperar significa mantener el stock inicial, las compras originales, los recursos base y el modo de Picking/Transporte, sin acción extra. Los pedidos completos se expiden solo si hubo SKU y capacidad. Los pendientes continúan pendientes al cierre; NO tienen día de expedición prometido fuera del horizonte. Salida del CD no confirma entrega al cliente. Penalidad y tenencia previas son hipótesis presentes en el escenario base, NO cargos incrementales por elegir esperar.'
 });
}
