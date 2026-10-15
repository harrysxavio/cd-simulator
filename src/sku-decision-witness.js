/**
 * M5-27 · A compact, repeatable consistency witness of a SELECTED physical
 * recovery result. Not a cryptographic signature or proof against a malicious
 * user editing their own localStorage.
 *
 * Recomputed from the same canonical event book after refresh. No replay
 * ledger is persisted and nothing is sent to providers.
 */
const invalid=reason=>{throw new Error('Confirmación SKU: '+reason)};
const safe=x=>Number.isSafeInteger(x)&&x>=0;
const money=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=Number.MAX_SAFE_INTEGER;
const close=(a,b)=>money(a)&&money(b)&&Math.abs(a-b)<=Math.max(0.000001,8*Number.EPSILON*Math.max(Math.abs(a),Math.abs(b)));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){for(const v of Object.values(x))freeze(v);Object.freeze(x)}return x};

function checksum(str){
 // Two independent 32-bit rolling checksums catch accidental stale/altered
 // persisted evidence. These are explicitly NOT authentication/security hashes.
 let a=2166136261>>>0,b=0x9e3779b9;
 for(let i=0;i<str.length;i++){
  const c=str.charCodeAt(i);
  a=Math.imul(a^c,16777619)>>>0;
  b=(Math.imul(b^c,2246822519)+3266489917)>>>0;
 }
 return a.toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0');
}
export function skuDecisionPhysicalWitness({comparison}={}){
 const b=comparison?.baselineSnapshot,r=comparison?.recovered,prior=comparison?.base;
 if(b?.scope!=='sku-cohort'||!Object.isFrozen(b)
  ||b.integrated!==comparison.integrated||prior!==b.integrated.actual
  ||comparison.originalPurchaseOrders!==b.integrated.originalPurchaseOrders
  ||r?.orders!==b.actualOrders||!safe(r.days)||r.days>365
  ||!Array.isArray(r.ledger)||r.ledger.length!==r.days+1
  ||!Array.isArray(r.ordersDetail)||r.ordersDetail.length!==r.orders
  ||!Array.isArray(comparison.urgent)
  ||!safe(r.completed)||!safe(r.pending)||r.completed+r.pending!==r.orders
  ||!money(comparison.extraLabor)||!money(comparison.urgentBase)
  ||!money(comparison.urgentSurcharge)||!money(comparison.incrementalExpense)
  ||!close(comparison.incrementalExpense,comparison.urgentBase+comparison.urgentSurcharge+comparison.extraLabor)
  ||!['wait','reserve','overtime','emergency','combined'].includes(comparison.option)){
  invalid('escenario físico o valores incompatibles');
 }
 let shipped=0;const daily=[];
 for(let day=0;day<=r.days;day++){
  const x=r.ledger[day];
  if(x?.day!==day||!safe(x.shipped)||!safe(x.completed)||!safe(x.backlog)
   ||!safe(x.pickedOrders)||!Array.isArray(x.shipmentEvents)
   ||x.shipmentEvents.length!==x.shipped
   ||!Array.isArray(x.pickEvents)||x.pickEvents.length!==x.pickedOrders
   ||!Array.isArray(x.reserveEvents)||!Array.isArray(x.dockArrivals)){
   invalid('expediciones, inventario o tiempos del libro físico alterados');
  }
  shipped+=x.shipped;
  if(shipped!==x.completed||x.completed+x.backlog!==r.orders)invalid('backlog no concilia');
  daily.push([day,x.shipped,x.completed,x.backlog,x.pickedOrders,x.stagingOrders,
   x.waitingReceiving,x.waitingQuality,x.receivedUrgent,x.reserveEvents,
   x.dockArrivals,x.shipmentEvents.map(e=>[e.orderId,e.pickId])]);
 }
 if(shipped!==r.completed)invalid('total de salida incorrecto');
 const evidence={
  baselineKey:b.scenarioKey,option:comparison.option,
  urgentArrivalDay:comparison.urgentArrivalDay,
  purchaseCoveragePercent:comparison.purchaseCoveragePercent,
  originalPurchaseOrders:b.integrated.originalPurchaseOrders.rows?.map(p=>[
   p.id,p.skuId,p.orderedQty,p.expectedArrivalDay,p.unitCost]),
  demand:r.orders,days:r.days,
  openingStock:r.initial,openingReserve:r.openingReserve,
  urgentPurchases:comparison.urgent.map(x=>[x.id,x.qty,x.day,x.unitCost]),
  orders:r.ordersDetail.map(o=>[o.id,o.pickedDay,o.fulfilledDay]),
  daily,
  totalDispatched:r.completed,totalPending:r.pending,
  urgentBase:comparison.urgentBase,urgentSurcharge:comparison.urgentSurcharge,
  extraLabor:comparison.extraLabor,incrementalExpense:comparison.incrementalExpense,
  economicProxyDelta:comparison.economicProxyDelta,netCashDelta:comparison.netCashDelta
 };
 if(!Array.isArray(evidence.originalPurchaseOrders)||!evidence.originalPurchaseOrders.length
  ||evidence.daily.some(x=>!safe(x[5])||!safe(x[6])||!safe(x[7]))){
  invalid('stock original o colas inválidas');
 }
 return freeze({
  version:1,method:'two-rolling-checksums-not-cryptographic',
  baselineKey:b.scenarioKey,scenarioDigest:checksum(JSON.stringify(evidence)),
  completedOrders:r.completed,pendingOrders:r.pending,
  incrementalExpenseCLP:comparison.incrementalExpense,
  economicProxyDeltaCLP:comparison.economicProxyDelta
 });
}
export function verifySkuDecisionWitness({decision,comparison}={}){
 const books=comparison?.recovered?.ledger;
 if(!Array.isArray(books)||!Array.isArray(decision?.reserveTransfers))return false;
 const moves=books.flatMap(d=>d.reserveEvents||[]);
 const received=books.flatMap(d=>Object.entries(d.receivedUrgent||{})
  .filter(([,qty])=>qty>0).map(([skuId,qty])=>({skuId,qty,day:d.day})));
 const purchaseById=new Map((comparison.urgent||[]).map(po=>[po.id,po]));
 const receivedQty=received.reduce((n,r)=>n+r.qty,0);
 const firstReceived=received.length?Math.min(...received.map(x=>x.day)):null;
 const firstMoved=moves.length?Math.min(...moves.map(x=>x.day)):null;
 if(decision.horizonDays!==comparison.recovered.days
  ||decision.reservePercent!==(comparison.reservePercent??0)
  ||decision.receivedExtraUnits!==receivedQty
  ||decision.firstReceivedDay!==firstReceived
  ||decision.releasedReserveUnits!==moves.reduce((n,m)=>n+m.qty,0)
  ||decision.firstReserveTransferDay!==firstMoved
  ||JSON.stringify(decision.openingReserve)!==JSON.stringify(comparison.recovered.openingReserve)
  ||JSON.stringify(decision.closingReserve)!==JSON.stringify(comparison.recovered.endingReserveStock)
  ||decision.reserveTransfers.length!==moves.length
  ||moves.some((x,i)=>{
   const y=decision.reserveTransfers[i];
   return y?.day!==x.day||y.skuId!==x.skuId||y.qty!==x.qty
    ||y.from!==x.from||y.to!==x.to||y.verified!==x.verified
    ||y.type!=='reserve_transfer'
    ||typeof y.id!=='string'
    ||!y.id.startsWith(decision.campaignId+'-EVT-');
  })
  ||decision.urgentPurchaseOrders?.some((x,i)=>{
   const po=purchaseById.get(x.skuId);
   const expectedId='URG-'+String(i+1).padStart(3,'0')+'-'+x.skuId;
   return !po||x.eventPurchaseOrderId!==expectedId
    ||x.id!==decision.campaignId+'-'+expectedId
    ||x.supplier!=='Proveedor extraordinario hipotético — no confirmado'
    ||x.status!=='comprometida en simulación';
  }))return false;
 if(!decision||decision.version!==2||comparison?.option!==decision.option
  ||comparison.urgentArrivalDay!==decision.urgentArrivalDay
  ||comparison.purchaseCoveragePercent!==decision.purchaseCoveragePercent
  ||decision.completedAfter!==comparison.recovered?.completed
  ||decision.pendingAfter!==comparison.recovered?.pending
  ||decision.completedBefore!==comparison.base?.completed
  ||decision.pendingBefore!==comparison.base?.pending
  ||decision.recoveredOrders!==comparison.recovered.completed-comparison.base.completed
  ||!close(decision.urgentOrderCommitmentCLP,comparison.urgentBase+comparison.urgentSurcharge)
  ||!close(decision.operationalReinforcementCLP,comparison.extraLabor)
  ||!close(decision.urgentSurchargeCLP,comparison.urgentSurcharge)
  ||!close(decision.incrementalExpenseCLP,comparison.incrementalExpense)
  ||!close(decision.netCashDeltaCLP,comparison.netCashDelta)
  ||!close(decision.economicProxyDeltaCLP,comparison.economicProxyDelta)
  ||JSON.stringify(decision.originalPurchase)!==JSON.stringify(comparison.originalPurchase)
  ||decision.originalPurchaseOrders?.length!==comparison.originalPurchaseOrders?.rows?.length
  ||comparison.originalPurchaseOrders.rows.some((x,i)=>{
    const y=decision.originalPurchaseOrders[i];
    return y?.id!==x.id||y.skuId!==x.skuId||y.orderedQty!==x.orderedQty
     ||y.expectedArrivalDay!==x.expectedArrivalDay||y.unitCost!==x.unitCost;
  })
  ||decision.orderedExtraUnits!==comparison.urgent.reduce((n,p)=>n+p.qty,0)
  ||decision.urgentPurchaseOrders?.length!==comparison.urgent.length
  ||comparison.urgent.some((x,i)=>{
   const y=decision.urgentPurchaseOrders[i];
   return y?.skuId!==x.id||y.quantity!==x.qty||y.expectedArrivalDay!==x.day
    ||y.unitCostCLP!==x.unitCost||y.orderCommitmentCLP!==x.qty*x.unitCost;
  })){
  return false;
 }
 try{
  const witness=skuDecisionPhysicalWitness({comparison});
  return decision.physicalWitness?.version===1
   &&decision.physicalWitness.scenarioDigest===witness.scenarioDigest
   &&decision.physicalWitness.baselineKey===witness.baselineKey
   &&decision.physicalWitness.completedOrders===witness.completedOrders
   &&decision.physicalWitness.pendingOrders===witness.pendingOrders
   &&close(decision.physicalWitness.incrementalExpenseCLP,witness.incrementalExpenseCLP)
   &&close(decision.physicalWitness.economicProxyDeltaCLP,witness.economicProxyDeltaCLP);
 }catch{return false}
}
