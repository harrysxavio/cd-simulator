/**
 * M5-24 · Read-only evidence of capacity reinforcement in the SAME SKU campaign.
 *
 * The physical event engine already limits Picking/dispatch orders; M4-17
 * already prices a daily on-demand reinforcement shift. This module only
 * cross-checks those books. It NEVER simulates another scenario or assigns
 * unverified employees/hours to warehouse work.
 */
const invalid=reason=>{throw new Error('Refuerzo SKU: '+reason)};
const qty=x=>Number.isSafeInteger(x)&&x>=0;
const money=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=Number.MAX_SAFE_INTEGER;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){for(const v of Object.values(x))freeze(v);Object.freeze(x)}return x};
const sum=(items,key)=>items.reduce((n,x)=>n+x[key],0);

export function capacityReinforcementTraceReadModel({
 comparison,operationalCost,picks,shipments,inventoryLedger
}={}){
 const base=comparison?.baselineSnapshot,actual=comparison?.recovered,prior=comparison?.base;
 const option=comparison?.option,enabled=option==='overtime'||option==='combined';
 const max=operationalCost?.extraCapacityOrdersPerDay,baselineCap=operationalCost?.baselineCapacityOrdersPerDay;
 const rate=operationalCost?.rateCLPPerActivatedShift;
 if(!['wait','reserve','emergency','overtime','combined'].includes(option)
  ||base?.scope!=='sku-cohort'||!Object.isFrozen(base)
  ||base.integrated!==comparison.integrated||prior!==base.integrated.actual
  ||comparison.originalPurchaseOrders!==base.integrated.originalPurchaseOrders
  ||!Array.isArray(actual?.ledger)||!Array.isArray(prior?.ledger)
  ||!qty(actual.days)||actual.days>365||actual.days!==prior.days
  ||actual.ledger.length!==actual.days+1||prior.ledger.length!==actual.days+1
  ||!qty(baselineCap)||!qty(max)||enabled!==(max>0)
  ||!qty(actual.dailyCapacity)||!qty(prior.dailyCapacity)
  ||actual.dailyCapacity!==baselineCap+max||prior.dailyCapacity!==baselineCap
  ||!money(rate)||operationalCost.passed!==true
  ||operationalCost.scope!=='sku-cohort'||operationalCost.horizonDays!==actual.days
  ||operationalCost.option!==option||operationalCost.daily?.length!==actual.ledger.length
  ||!Array.isArray(picks)||!Array.isArray(shipments)
  ||inventoryLedger?.passed!==true||inventoryLedger.horizonDays!==actual.days
  ||!money(comparison.extraLabor)||!money(operationalCost.totals?.totalCostCLP)
  ||comparison.extraLabor!==operationalCost.totals.totalCostCLP){
  invalid('configuración, baseline o costos incompatibles');
 }
 const ids=new Set();
 for(const row of [...picks,...shipments]){
  if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id)
   ||!qty(row.day)||row.day>actual.days
   ||typeof row.orderId!=='string'||!row.orderId)invalid('evento de Picking o Transporte falso');
  ids.add(row.id);
 }
 const daily=[];
 for(let day=0;day<=actual.days;day++){
  const r=actual.ledger[day],b=prior.ledger[day],cost=operationalCost.daily[day];
  const prep=picks.filter(p=>p.day===day),dispatch=shipments.filter(s=>s.day===day);
  if(r?.day!==day||b?.day!==day||cost?.day!==day
   ||![r.pickedOrders,r.shipped,b.pickedOrders,b.shipped].every(qty)
   ||r.pickedOrders!==prep.length||r.shipped!==dispatch.length
   ||r.pickedOrders>baselineCap+max||r.shipped>baselineCap+max
   ||b.pickedOrders>baselineCap||b.shipped>baselineCap
   ||!Array.isArray(r.pickEvents)||!Array.isArray(r.shipmentEvents)
   ||prep.some(p=>!r.pickEvents.some(e=>e.pickId===p.pickId
    &&e.orderId===p.orderId&&e.day===day))
   ||dispatch.some(s=>!r.shipmentEvents.some(e=>e.orderId===s.orderId
    &&e.pickId===s.pickId&&e.day===day))){
   invalid('registro físico de Picking/Transporte incompatible');
  }
  const active=enabled&&(r.pickedOrders>0||r.shipped>0);
  const slots=active?max:0;
  const used=active?Math.max(0,Math.max(r.pickedOrders,r.shipped)-baselineCap):0;
  const idle=slots-used,charged=active?rate:0;
  if(!qty(idle)||cost.activated!==active||cost.assignedExtraSlots!==slots
   ||cost.utilizedExtraSlots!==used||cost.idleExtraSlots!==idle
   ||cost.baselinePickedOrders!==b.pickedOrders
   ||cost.baselineShippedOrders!==b.shipped
   ||cost.pickedOrders!==r.pickedOrders||cost.shippedOrders!==r.shipped
   ||cost.chargeableShiftCount!==(active?1:0)||cost.costCLP!==charged){
   invalid('turno, ociosidad o tarifa no concilian');
  }
  // Two stages share ONE order-capacity proxy and ONE shift price.
  // The same physical order is not counted as two utilized extra slots.
  daily.push({
   day,reinforcementActivated:active,baselineOrderSlotsPerStage:baselineCap,
   extraOrderSlotsAssigned:slots,extraOrderSlotsUsed:used,extraOrderSlotsIdle:idle,
   pickedCompleteOrders:r.pickedOrders,dispatchedCompleteOrders:r.shipped,
   baselinePickedCompleteOrders:b.pickedOrders,
   baselineDispatchedCompleteOrders:b.shipped,
   dispatchedDeltaToday:r.shipped-b.shipped,
   stagedOrdersAtEnd:r.stagingOrders,
   receivingQueuedSkuUnits:r.waitingReceiving,
   qualityHeldSkuUnits:r.waitingQuality,
   dailyIncrementalCostCLP:charged,
   verifiedPhysicalMovements:true
  });
 }
 const totalShift=sum(daily,'reinforcementActivated'),
  assigned=sum(daily,'extraOrderSlotsAssigned'),
  used=sum(daily,'extraOrderSlotsUsed'),
  idle=sum(daily,'extraOrderSlotsIdle'),
  price=sum(daily,'dailyIncrementalCostCLP'),
  before=prior.completed,after=actual.completed;
 if(!qty(before)||!qty(after)||!qty(totalShift)||!qty(assigned)
  ||!qty(used)||!qty(idle)||!money(price)
  ||assigned!==used+idle
  ||!Number.isSafeInteger(after-before)
  ||price!==totalShift*rate||price!==comparison.extraLabor
  ||operationalCost.totals.chargeableShifts!==totalShift
  ||operationalCost.totals.assignedExtraSlots!==assigned
  ||operationalCost.totals.utilizedExtraSlots!==used
  ||operationalCost.totals.idleExtraSlots!==idle
  ||operationalCost.totals.totalCostCLP!==price
  ||before+prior.pending!==prior.orders||after+actual.pending!==actual.orders
  ||prior.orders!==actual.orders
  ||sum(daily,'dispatchedDeltaToday')!==after-before
  ||!enabled&&(totalShift!==0||price!==0)){
  invalid('saldo de capacidad, pedidos o CLP alterado');
 }
 return freeze({
  passed:true,scope:'sku-cohort',currency:'CLP',
  baselineKey:base.scenarioKey,option,horizonDays:actual.days,
  intervention:selectedLabel(enabled,option),
  resourceScope:'shared-daily-order-cap-for-picking-and-dispatch',
  costPolicy:'on-demand-shift-activated-if-work-exists',
  daily,totals:{
   baseOrderSlotsPerStagePerDay:baselineCap,
   extraOrderSlotsPerStagePerDay:max,
   shiftDaysActivated:totalShift,
   extraSlotsAssigned:assigned,extraSlotsUsed:used,extraSlotsIdle:idle,
   reinforcementCostCLP:price,baseDispatchedOrders:before,
   alternativeDispatchedOrders:after,netDispatchChangeOrders:after-before,
   pendingOrdersAfterAlternative:actual.pending,
   chargedShiftsWithoutUse:daily.filter(d=>d.reinforcementActivated&&d.extraOrderSlotsUsed===0).length
  },
  checks:{frozenBaseline:true,physicalEventIdentity:true,
   resourceDoesNotCreateInventory:true,shiftCostsReconciled:true,
   noDoubleCountingPickingAndTransportSlots:true,unusedCapacityVisible:true},
  actualWorkerCount:null,actualStaffHours:null,actualPayrollPaidCLP:null,
  separateAreaLaborCostsAvailable:false,
  interpretation:option==='combined'
   ?'No atribuir las expediciones recuperadas exclusivamente al refuerzo: esta alternativa también incorpora una compra urgente.'
   :enabled
    ?'Solo varía la capacidad máxima de pedidos por jornada frente al baseline congelado; el delta de expediciones es del escenario completo, no prueba de horas, trabajadores ni pedidos marginales asignados al refuerzo.'
    :'No se solicitó capacidad adicional. Se informa el saldo nulo para comparar con la misma campaña base.',
  note:'El refuerzo es una capacidad máxima ilustrativa compartida por Picking y expedición, no dotación contratada por área ni un turno de trabajadores verificado. Se aplica solamente a la preparación/salida del CD, nunca a Recepción, Calidad ni abastecimiento. Si hay trabajo, la política supone que se activa y cobra un turno completo incluso sin usar cupos extra; si no hay trabajo no lo activa ni cobra. No existe doble cargo por Picking y Transporte. Cupos utilizados significa exceder la capacidad base en algún proceso ese día, NO pedidos causados por el refuerzo. Una salida del CD tampoco acredita entrega al cliente.'
 });
}
function selectedLabel(enabled,option){
 return enabled?(option==='combined'?'combined-with-urgent-purchase':'extra-daily-order-capacity'):'no-extra-capacity';
}
