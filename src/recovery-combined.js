/**
 * M5-25 · Joint intervention evidence from four ALREADY SIMULATED SKU options.
 *
 * Reuses the exact common frozen baseline and each canonical daily event book.
 * It does not replay, sum physical SKU deliveries or treat a counterfactual
 * delta as an extra shipment. Interactions may be positive or negative.
 */
const fail=why=>{throw new Error('Acción combinada SKU: '+why)};
const unit=x=>Number.isSafeInteger(x)&&x>=0;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=Number.MAX_SAFE_INTEGER;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){for(const y of Object.values(x))freeze(y);Object.freeze(x)}return x};
const close=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<=Math.max(0.000001,8*Number.EPSILON*Math.max(Math.abs(a),Math.abs(b)));
const sum=(a,key)=>a.reduce((n,x)=>n+x[key],0);

export function combinedInterventionReadModel({comparisons}={}){
 if(!Array.isArray(comparisons)||comparisons.length!==4)fail('se necesitan las cuatro alternativas comparables');
 const by=new Map(comparisons.map(x=>[x?.option,x]));
 if(by.size!==4||!['wait','emergency','overtime','combined'].every(x=>by.has(x))){
  fail('alternativas ausentes, ajenas o duplicadas');
 }
 const wait=by.get('wait'),buy=by.get('emergency'),staff=by.get('overtime'),joint=by.get('combined');
 const base=wait.baselineSnapshot,baseline=base?.integrated?.actual,source=base?.integrated?.originalPurchaseOrders;
 if(base?.scope!=='sku-cohort'||!Object.isFrozen(base)
  ||!Object.isFrozen(baseline)||!Object.isFrozen(source)
  ||!unit(base.days)||base.days>365
  ||wait.recovered!==baseline||wait.base!==baseline
  ||comparisons.some(x=>
   x?.baselineSnapshot!==base||x?.base!==baseline||x.integrated!==base.integrated
   ||x.openingState!==base.openingState||x.originalPurchaseOrders!==source
   ||x.recovered?.orders!==base.actualOrders||x.recovered?.days!==base.days
   ||x.recovered.ledger?.length!==base.days+1
   ||x.baselineKey!==base.scenarioKey
   ||x.urgentArrivalDay!==joint.urgentArrivalDay
   ||x.purchaseCoveragePercent!==joint.purchaseCoveragePercent
   ||x.separateTransport!==joint.separateTransport
   ||x.recovered.separateTransport!==joint.separateTransport
   ||x.reservePercent!==joint.reservePercent
   ||x.unitRevenue!==joint.unitRevenue
   ||!finite(x.incrementalExpense)||x.incrementalExpense<0
   ||!finite(x.urgentBase)||x.urgentBase<0
   ||!finite(x.urgentSurcharge)||x.urgentSurcharge<0
   ||!finite(x.extraLabor)||x.extraLabor<0
   ||!close(x.incrementalExpense,x.urgentBase+x.urgentSurcharge+x.extraLabor)
   ||!close(x.incrementalRevenue,(x.recovered.completed-baseline.completed)*x.unitRevenue)
   ||!close(x.netCashDelta,x.incrementalRevenue-x.incrementalExpense)
   ||!close(x.economicProxyDelta,x.netCashDelta+x.penaltySaved-x.holdingDelta)
   ||x.recovered.initial===undefined
   ||Object.keys(base.openingState.openingBySku).some(id=>
    x.recovered.initial[id]!==base.openingState.openingBySku[id]
    ||x.recovered.openingReserve[id]!==base.openingState.reserveBySku[id]))){
  fail('baseline o saldos económicos y físicos incompatibles');
 }
 const urgentSignature=x=>JSON.stringify(x.urgent.map(p=>[p.id,p.qty,p.day,p.unitCost]));
 if(urgentSignature(wait)!=='[]'||urgentSignature(staff)!=='[]'
  ||urgentSignature(buy)!==urgentSignature(joint)
  ||!unit(baseline.dailyCapacity)||!unit(joint.recovered.dailyCapacity)
  ||!unit(buy.recovered.dailyCapacity)||!unit(staff.recovered.dailyCapacity)
  ||joint.recovered.dailyCapacity!==staff.recovered.dailyCapacity
  ||buy.recovered.dailyCapacity!==baseline.dailyCapacity
  ||wait.recovered.dailyCapacity!==baseline.dailyCapacity
  ||joint.recovered.dailyCapacity<=baseline.dailyCapacity
  ||!close(joint.urgentBase,buy.urgentBase)
  ||!close(joint.urgentSurcharge,buy.urgentSurcharge)
  ||staff.urgentBase!==0||staff.urgentSurcharge!==0
  ||buy.extraLabor!==0||wait.extraLabor!==0||wait.incrementalExpense!==0
  ||!joint.operationalCost?.passed||!staff.operationalCost?.passed
  ||joint.operationalCost.totals.totalCostCLP!==joint.extraLabor
  ||staff.operationalCost.totals.totalCostCLP!==staff.extraLabor){
  fail('compra o capacidad no coinciden con las intervenciones individuales');
 }
 const horizon=base.days,daily=[];
 for(let day=0;day<=horizon;day++){
  const days=Object.fromEntries([...by].map(([option,x])=>[option,x.recovered.ledger[day]]));
  if(Object.values(days).some(d=>d?.day!==day||!unit(d.backlog)
   ||!unit(d.completed)||!unit(d.shipped)||!unit(d.pickedOrders)
   ||!Array.isArray(d.receiptEvents)||!Array.isArray(d.shipmentEvents)
   ||!Array.isArray(d.pickEvents)||!Array.isArray(d.dockArrivals)
   ||d.shipmentEvents.length!==d.shipped||d.pickEvents.length!==d.pickedOrders
   ||d.completed+d.backlog!==base.actualOrders)
   ||!unit(days.combined.shipped)
   ||days.combined.shipped>joint.recovered.dailyCapacity
   ||days.combined.pickedOrders>joint.recovered.dailyCapacity
   ||days.combined.dockArrivals.filter(d=>d.urgent).reduce((n,d)=>n+d.qty,0)
    !==days.emergency.dockArrivals.filter(d=>d.urgent).reduce((n,d)=>n+d.qty,0)){
   fail('libro físico conjunto o entregas urgentes incompatibles');
  }
  const completed=Object.fromEntries(Object.entries(days).map(([key,d])=>[key,d.completed]));
  const singleBuy=completed.emergency-completed.wait;
  const singleStaff=completed.overtime-completed.wait;
  const actualCombined=completed.combined-completed.wait;
  daily.push({day,baselineDispatchedToDate:completed.wait,
   urgentOnlyDispatchedToDate:completed.emergency,
   capacityOnlyDispatchedToDate:completed.overtime,
   combinedDispatchedToDate:completed.combined,
   actualCombinedGainToDate:actualCombined,
   sumOfIsolatedGainsToDate:singleBuy+singleStaff,
   interactionOrdersToDate:actualCombined-singleBuy-singleStaff,
   actuallyDispatchedToday:days.combined.shipped,
   pendingAtDayEnd:days.combined.backlog,
   urgentDockArrivalsSkuUnits:days.combined.dockArrivals.filter(d=>d.urgent).reduce((n,d)=>n+d.qty,0),
   staffShiftCostCLP:joint.operationalCost.daily[day]?.costCLP});
  if(!finite(daily.at(-1).staffShiftCostCLP)||daily.at(-1).staffShiftCostCLP<0
   ||joint.operationalCost.daily[day]?.day!==day){
   fail('costo de refuerzo conjunto sin jornada');
  }
 }
 const last=daily.at(-1),gainBuy=buy.recovered.completed-baseline.completed,
  gainStaff=staff.recovered.completed-baseline.completed,
  gainJoint=joint.recovered.completed-baseline.completed,
  interaction=gainJoint-gainBuy-gainStaff;
 if(last.actualCombinedGainToDate!==gainJoint
  ||last.interactionOrdersToDate!==interaction
  ||last.pendingAtDayEnd!==joint.recovered.pending
  ||sum(daily,'actuallyDispatchedToday')!==joint.recovered.completed
  ||!close(sum(daily,'staffShiftCostCLP'),joint.extraLabor)
  ||!close(joint.incrementalExpense,joint.urgentBase+joint.urgentSurcharge+joint.extraLabor)
  ||joint.urgentBase!==buy.urgentBase||joint.urgentSurcharge!==buy.urgentSurcharge
  ||joint.recovered.completed+joint.recovered.pending!==base.actualOrders){
  fail('resultado conjunto, compra o jornada mal contabilizados');
 }
 const financialInteraction=joint.economicProxyDelta-buy.economicProxyDelta-staff.economicProxyDelta;
 if(!finite(financialInteraction))fail('interacción económica fuera de rango');
 return freeze({
  passed:true,scope:'sku-cohort',baselineKey:base.scenarioKey,currency:'CLP',
  horizonDays:horizon,option:'combined',operation:'one-joint-physical-replay',
  daily,totals:{
   baselineDispatchedOrders:baseline.completed,
   urgentOnlyDispatchedOrders:buy.recovered.completed,
   capacityOnlyDispatchedOrders:staff.recovered.completed,
   combinedDispatchedOrders:joint.recovered.completed,
   urgentOnlyGainOrders:gainBuy,capacityOnlyGainOrders:gainStaff,
   hypotheticalSumOfIsolatedGainsOrders:gainBuy+gainStaff,
   actualCombinedGainOrders:gainJoint,
   interactionOrders:interaction,
   combinedPendingOrders:joint.recovered.pending,
   urgentPrincipalCommitmentCLP:joint.urgentBase,
   urgentSurchargeAssumptionCLP:joint.urgentSurcharge,
   activatedReinforcementCLP:joint.extraLabor,
   combinedIncrementalExpenseCLP:joint.incrementalExpense,
   combinedEconomicProxyDeltaCLP:joint.economicProxyDelta,
   economicInteractionProxyCLP:financialInteraction
  },
  checks:{sameFrozenBaseline:true,sameOriginalPurchaseManifest:true,
   sameUrgentPurchaseOnlyOnce:true,sharedCapacityShiftNotDoubled:true,
   samePhysicalCohort:true,jointShipmentsNotAdditive:true,
   allIncrementalCostsAccountedOnce:true},
  customerDeliveriesConfirmed:null,paymentsConfirmedCLP:null,
  explanation:'Interacción = mejora de expediciones con ambas decisiones − mejora solo por compra urgente − mejora solo por capacidad. Es una diferencia contrafactual del modelo, no una cantidad adicional de pedidos ni una atribución a trabajadores. Puede ser positiva, nula o negativa. El resultado conjunto es el libro físico con ambas decisiones aplicadas a la vez, nunca la suma de los escenarios aislados. El compromiso de compra y su recargo aparecen una sola vez; el turno se cobra solo si el modelo lo activa. Los importes son supuestos ilustrativos, no pagos ni utilidad real.'
 });
}
