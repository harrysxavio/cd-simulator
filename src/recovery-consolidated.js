/**
 * M5-26: decision-facing, single-screen summary for the existing five recovery options.
 *
 * One frozen baseline and the existing physical replays are the only sources.
 * This is a READ MODEL: no new orders, simulated deliveries, or charges.
 */
const fail=s=>{throw new Error('Comparador consolidado SKU: '+s)};
const qty=x=>Number.isSafeInteger(x)&&x>=0;
const signed=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=Number.MAX_SAFE_INTEGER;
const close=(a,b)=>signed(a)&&signed(b)&&Math.abs(a-b)<=Math.max(0.000001,8*Number.EPSILON*Math.max(Math.abs(a),Math.abs(b)));
const deepFreeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){for(const y of Object.values(x))deepFreeze(y);Object.freeze(x)}return x};
const add=(rows,key)=>rows.reduce((n,x)=>n+x[key],0);
const phase=replay=>{
 let first=null,last=null;let cumulative=0,backlogOrderDays=0;
 const daily=[];
 for(let day=0;day<=replay.days;day++){
  const row=replay.ledger[day];
  if(row?.day!==day||!qty(row.shipped)||!qty(row.completed)
   ||!qty(row.backlog)||!qty(row.pickedOrders)
   ||!qty(row.waitingReceiving)||!qty(row.waitingQuality)
   ||!qty(row.stagingOrders)
   ||!Array.isArray(row.shipmentEvents)||row.shipmentEvents.length!==row.shipped
   ||!Array.isArray(row.pickEvents)||row.pickEvents.length!==row.pickedOrders
   ||row.completed+row.backlog!==replay.orders)fail('libro de eventos por día inconsistente');
  if(row.shipped>0){if(first===null)first=day;last=day}
  cumulative+=row.shipped;
  if(cumulative!==row.completed)fail('pedidos expedidos duplicados');
  if(day<replay.days)backlogOrderDays+=row.backlog;
  daily.push({
   day,shippedToday:row.shipped,shippedToDate:row.completed,
   pendingAtDayEnd:row.backlog,
   waitingReceivingSkuUnits:row.waitingReceiving,
   waitingQualitySkuUnits:row.waitingQuality,
   stagedOrdersWaitingTransport:row.stagingOrders,
   pickingOrdersToday:row.pickedOrders
  });
 }
 if(cumulative!==replay.completed||replay.pending!==replay.orders-cumulative
  ||!qty(backlogOrderDays)||!qty(replay.onTime)||replay.onTime!==daily[0].shippedToday
  ||(first===null)!==(replay.completed===0))fail('fecha o backlog inconciliable');
 return {completed:replay.completed,pending:replay.pending,
  shippedOnDayZero:replay.onTime,shippedAfterDayZero:replay.completed-replay.onTime,
  firstDispatchDay:first,lastDispatchDay:last,backlogOrderDays,
  daily};
};
export function consolidatedRecoveryComparisonReadModel({comparisons,selectedOption}={}){
 if(!Array.isArray(comparisons)||comparisons.length!==5)fail('se requieren cinco escenarios');
 const by=new Map(comparisons.map(x=>[x?.option,x]));
 const options=['wait','reserve','overtime','emergency','combined'];
 if(by.size!==5||!options.every(opt=>by.has(opt))||!by.has(selectedOption))fail('escenarios duplicados o decisión ausente');
 const waiting=by.get('wait'),base=waiting?.baselineSnapshot,physical=base?.integrated?.actual;
 if(base?.scope!=='sku-cohort'||!Object.isFrozen(base)||!Object.isFrozen(physical)
  ||waiting.recovered!==physical||waiting.base!==physical
  ||!qty(base.days)||base.days>365||!qty(base.actualOrders)
  ||physical.ledger?.length!==base.days+1
  ||!base.integrated.originalPurchaseOrders)fail('baseline no es único o está modificado');
 const configured=by.get(selectedOption);
 const baseline=phase(physical),selected=phase(configured.recovered);
 const rows=options.map(option=>{
  const c=by.get(option),r=c?.recovered;
  if(c?.baselineSnapshot!==base||c.baselineKey!==base.scenarioKey
   ||c.base!==physical||c.integrated!==base.integrated
   ||c.openingState!==base.openingState
   ||c.originalPurchaseOrders!==base.integrated.originalPurchaseOrders
   ||c.urgentArrivalDay!==configured.urgentArrivalDay
   ||c.purchaseCoveragePercent!==configured.purchaseCoveragePercent
   ||c.separateTransport!==configured.separateTransport
   ||c.reservePercent!==configured.reservePercent
   ||c.unitRevenue!==configured.unitRevenue
   ||r?.orders!==base.actualOrders||r.days!==base.days
   ||r.ledger?.length!==base.days+1
   ||r.separateTransport!==physical.separateTransport
   ||!signed(c.urgentBase)||c.urgentBase<0
   ||!signed(c.urgentSurcharge)||c.urgentSurcharge<0
   ||!signed(c.extraLabor)||c.extraLabor<0
   ||!signed(c.incrementalExpense)||c.incrementalExpense<0
   ||!close(c.incrementalExpense,c.urgentBase+c.urgentSurcharge+c.extraLabor)
   ||!close(c.incrementalRevenue,(r.completed-physical.completed)*c.unitRevenue)
   ||!close(c.netCashDelta,c.incrementalRevenue-c.incrementalExpense)
   ||!close(c.economicProxyDelta,c.netCashDelta+c.penaltySaved-c.holdingDelta)
   ||c.operationalCost?.totals?.totalCostCLP!==c.extraLabor
   ||Object.keys(base.openingState.openingBySku).some(id=>
     r.initial?.[id]!==base.openingState.openingBySku[id]
     ||r.openingReserve?.[id]!==base.openingState.reserveBySku[id])){
   fail('opción con apertura, compras, fecha o importes incompatibles');
  }
  const timeline=option===selectedOption?selected:option==='wait'?baseline:phase(r);
  if(!close(timeline.backlogOrderDays,c.backlogDaysRecovered)
   ||!close(baseline.backlogOrderDays,c.backlogDaysBase))fail('backlog y calendario divergen');
  if(option==='wait'&&(c.incrementalExpense!==0||c.incrementalRevenue!==0
   ||c.netCashDelta!==0||c.economicProxyDelta!==0||c.urgent.length!==0)
   ||!Array.isArray(c.urgent)
   ||(option!=='emergency'&&option!=='combined'&&c.urgent.length!==0)
   ||(option!=='overtime'&&option!=='combined'&&c.extraLabor!==0)){
   fail('intervención indebida o espera con gasto');
  }
  return {
   option,label:c.label,shippedOrders:timeline.completed,
   pendingOrders:timeline.pending,
   ordersDelta:timeline.completed-baseline.completed,
   pendingDelta:timeline.pending-baseline.pending,
   onDayZero:timeline.shippedOnDayZero,
   onDayZeroDelta:timeline.shippedOnDayZero-baseline.shippedOnDayZero,
   firstDispatchDay:timeline.firstDispatchDay,
   lastDispatchDay:timeline.lastDispatchDay,
   backlogOrderDays:timeline.backlogOrderDays,
   backlogOrderDaysDelta:timeline.backlogOrderDays-baseline.backlogOrderDays,
   originalPurchaseCommitmentCLP:base.integrated.committedPurchaseValue,
   urgentPurchasePrincipalCLP:c.urgentBase,
   urgentSurchargeCLP:c.urgentSurcharge,
   addedCapacityCostCLP:c.extraLabor,
   incrementalCommitmentAndCostProxyCLP:c.incrementalExpense,
   potentialDispatchValueDeltaCLP:c.incrementalRevenue,
   simplifiedNetDeltaCLP:c.netCashDelta,
   economicDecisionProxyDeltaCLP:c.economicProxyDelta,
   trailingPhysicalState:timeline.daily.at(-1),
   physicalDaily:timeline.daily
  };
 });
 const selectedRow=rows.find(x=>x.option===selectedOption);
 if(selectedRow.shippedOrders!==configured.recovered.completed
  ||selectedRow.pendingOrders!==configured.recovered.pending
  ||selectedRow.ordersDelta!==configured.recovered.completed-physical.completed
  ||!close(selectedRow.incrementalCommitmentAndCostProxyCLP,configured.incrementalExpense)){
  fail('resultado elegido no coincide con el escenario físico');
 }
 const daily=baseline.daily.map((b,day)=>{
  const a=selected.daily[day];
  return {day,baselineShipped:b.shippedToday,alternativeShipped:a.shippedToday,
   dispatchedDelta:a.shippedToday-b.shippedToday,
   baselineCumulative:b.shippedToDate,alternativeCumulative:a.shippedToDate,
   cumulativeDelta:a.shippedToDate-b.shippedToDate,
   baselinePending:b.pendingAtDayEnd,alternativePending:a.pendingAtDayEnd,
   baselineReceivingQueue:b.waitingReceivingSkuUnits,alternativeReceivingQueue:a.waitingReceivingSkuUnits,
   baselineQualityHeld:b.waitingQualitySkuUnits,alternativeQualityHeld:a.waitingQualitySkuUnits,
   baselineStagedOrders:b.stagedOrdersWaitingTransport,alternativeStagedOrders:a.stagedOrdersWaitingTransport};
 });
 if(add(daily,'dispatchedDelta')!==selectedRow.ordersDelta
  ||daily.at(-1).alternativePending!==selectedRow.pendingOrders
  ||daily.at(-1).baselinePending!==baseline.pending)fail('comparación diaria no concilia');
 const active=selectedRow.trailingPhysicalState;
 const flags=[
  {id:'receiving',label:'Unidades en cola de Recepción al corte',quantity:active.waitingReceivingSkuUnits},
  {id:'quality',label:'Unidades retenidas en Calidad al corte',quantity:active.waitingQualitySkuUnits},
  {id:'transport',label:'Pedidos preparados esperando transporte al corte',quantity:active.stagedOrdersWaitingTransport},
  {id:'pending',label:'Pedidos sin expedir al corte',quantity:active.pendingAtDayEnd}
 ];
 return deepFreeze({
  passed:true,scope:'sku-cohort',currency:'CLP',baselineKey:base.scenarioKey,
  selectedOption,horizonDays:base.days,demandOrders:base.actualOrders,
  baseline:{...baseline,incrementalExpenseCLP:0},
  selected:selectedRow,
  alternatives:rows.map(({physicalDaily,...summary})=>summary),
  differences:{
   dispatchedOrders:selectedRow.ordersDelta,pendingOrders:selectedRow.pendingDelta,
   dayZeroDispatches:selectedRow.onDayZeroDelta,
   backlogOrderDays:selectedRow.backlogOrderDaysDelta,
   incrementalExpenseCLP:selectedRow.incrementalCommitmentAndCostProxyCLP,
   potentialDispatchValueDeltaCLP:selectedRow.potentialDispatchValueDeltaCLP,
   simplifiedNetDeltaCLP:selectedRow.simplifiedNetDeltaCLP,
   economicDecisionProxyDeltaCLP:selectedRow.economicDecisionProxyDeltaCLP
  },
  daily,observations:flags,checks:{
   frozenBaseline:true,sameOriginalPurchaseManifest:true,
   commonConfiguration:true,realDispatchEvents:true,
   dailyDeltasReconcile:true,nonPurchaseReserveMove:true,
   costComponentsCountedOnce:true
  },
  datePolicy:'day-index-of-simulated-campaign-not-customer-ETA',
  noPromisedDayForUnshipped:true,
  cashStatus:'illustrative-commitment-and-cash-proxy-not-bank-payment',
  note:'Comparación física sobre la misma cohorte de SKU, día 0 a día final. Los pedidos expedidos son salidas del CD, no entregas confirmadas. Solo son hechos del modelo las órdenes completas efectivamente expedidas y los stocks simulados. Las colas son observaciones, NO causa única demostrada. El costo incremental incluye compromiso de compra urgente, recargo hipotético y turnos activados; es útil para decisiones pero NO factura, caja realizada ni utilidad neta. Plazos: el primer/último día indican expedición del CD, no fecha prometida de pedidos pendientes.'
 });
}
