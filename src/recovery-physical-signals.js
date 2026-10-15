/**
 * M6-28 · Event-based physical constraint observations, NOT causal ranking.
 *
 * Consume the already-audited SKU event book. This model does not replay demand,
 * change inventory, move a kit, infer staffing or assign lost orders to one area.
 */
import {SKU_CATALOG} from './sku.js';

const fail=why=>{throw new Error('Diagnóstico físico SKU: '+why)};
const int=x=>Number.isSafeInteger(x)&&x>=0;
const deepFreeze=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  for(const nested of Object.values(x))deepFreeze(nested);
  Object.freeze(x);
 }
 return x;
};
const sum=(xs,fn)=>xs.reduce((n,x)=>n+fn(x),0);
const skuSum=o=>Object.values(o).reduce((n,v)=>n+v,0);
const areas=Object.freeze([
 ['receiving','Recepción','unidades SKU','Cola física después de llegar al muelle'],
 ['quality','Calidad','unidades SKU','Lotes recibidos aún sin liberar'],
 ['inventory','Inventario','unidades SKU','Stock en PICK-FACE todavía no verificable'],
 ['picking','Picking','pedidos','Pedidos sin preparar al cierre de jornada'],
 ['transport','Transporte','pedidos','Pedidos ya preparados y esperando salida desde STAGING-CD']
]);

export function physicalConstraintSignalsReadModel({comparison,campaign}={}){
 const replay=comparison?.recovered,ledger=replay?.ledger;
 if(campaign?.passed!==true||campaign.scope!=='sku-cohort'
  ||campaign.horizonDays!==replay?.days||campaign.demand.actualOrders!==replay?.orders
  ||campaign.shipments.length!==replay?.completed
  ||campaign.picks.length!==sum(ledger??[],r=>r.pickedOrders)
  ||campaign.receivingLedger?.passed!==true
  ||campaign.qualityLedger?.passed!==true
  ||campaign.inventoryLedger?.passed!==true
  ||campaign.pickingLedger?.passed!==true
  ||comparison.integrated!==comparison.baselineSnapshot?.integrated
  ||comparison.base!==comparison.baselineSnapshot?.integrated?.actual
  ||comparison.originalPurchaseOrders!==comparison.baselineSnapshot.integrated.originalPurchaseOrders
  ||!Object.isFrozen(comparison.baselineSnapshot)
  ||!int(replay?.days)||replay.days>365||!int(replay.orders)
  ||!Array.isArray(ledger)||ledger.length!==replay.days+1
  ||!Array.isArray(replay.ordersDetail)||replay.ordersDetail.length!==replay.orders){
  fail('falta campaña física auditada y misma cohorte SKU');
 }
 const names=SKU_CATALOG.map(p=>p.id);
 const byId=new Map(replay.ordersDetail.map(o=>[o.id,o]));
 if(byId.size!==replay.orders||replay.ordersDetail.some(o=>
  typeof o.id!=='string'||!o.lines||Object.keys(o.lines).some(id=>!names.includes(id))
  ||o.pickedDay!==null&&(!int(o.pickedDay)||o.pickedDay>replay.days)
  ||o.fulfilledDay!==null&&(!int(o.fulfilledDay)||o.fulfilledDay>replay.days)
  ||o.fulfilledDay!==null&&(o.pickedDay===null||o.fulfilledDay<o.pickedDay))){
  fail('pedidos o fechas de eventos no concilian');
 }
 const daily=[];
 let pickedBefore=0,shippedBefore=0;
 for(let day=0;day<=replay.days;day++){
  const d=ledger[day];
  if(d?.day!==day||!int(d.backlog)||!int(d.completed)
   ||!int(d.shipped)||!int(d.pickedOrders)||!int(d.pickedUnits)
   ||!int(d.shippedUnits)||!int(d.receivingUsedSkuUnits)
   ||!int(d.waitingReceiving)||!int(d.waitingQuality)
   ||!int(d.stagingOrders)||!Array.isArray(d.receiptEvents)
   ||!Array.isArray(d.releaseEvents)||!Array.isArray(d.pickEvents)
   ||!Array.isArray(d.shipmentEvents)||!Array.isArray(d.receivingQueue)
   ||!d.unverifiedStock||!d.reserveStock||!d.pickableStock||!d.stock
   ||names.some(id=>!int(d.unverifiedStock[id])||!int(d.reserveStock[id])
    ||!int(d.pickableStock[id])||!int(d.stock[id]))
   ||d.receivingUsedSkuUnits!==sum(d.receiptEvents,e=>e.qty)
   ||d.waitingReceiving!==sum(d.receivingQueue,q=>q.remainingSkuUnits)
   ||d.waitingQuality<0
   ||d.shipmentEvents.length!==d.shipped
   ||d.pickEvents.length!==d.pickedOrders
   ||d.pickedUnits!==sum(d.pickEvents,e=>e.units)
   ||d.shippedUnits!==sum(d.shipmentEvents,e=>e.units)){
   fail('unidades o documentos físicos diarios no concilian');
  }
  const unpicked=replay.ordersDetail.filter(o=>o.pickedDay===null||o.pickedDay>day).length;
  const staged=replay.ordersDetail.filter(o=>o.pickedDay!==null&&o.pickedDay<=day
   &&(o.fulfilledDay===null||o.fulfilledDay>day)).length;
  const completed=replay.ordersDetail.filter(o=>o.fulfilledDay!==null&&o.fulfilledDay<=day).length;
  const picked=replay.ordersDetail.filter(o=>o.pickedDay!==null&&o.pickedDay<=day).length;
  pickedBefore+=d.pickedOrders;shippedBefore+=d.shipped;
  if(completed!==d.completed||d.backlog!==unpicked+staged
   ||completed+unpicked+staged!==replay.orders
   ||d.stagingOrders!==staged
   ||picked!==pickedBefore||completed!==shippedBefore
   ||(replay.separateTransport===false&&(staged!==0||d.pickedOrders!==d.shipped))
   ||!replay.separateTransport&&skuSum(d.reserveStock)<0){
   fail('pedidos preparados, en staging y expedidos no concilian');
  }
  const waitingUnverified=skuSum(d.unverifiedStock);
  const reserveHeld=skuSum(d.reserveStock);
  const capReceive=replay.receivingUnitCapacity;
  const capPickUnits=replay.pickingUnitCapacity;
  const capTransportUnits=replay.transportUnitCapacity;
  const cappedOrders=replay.dailyCapacity;
  const saturation={
   receiving:capReceive!==null&&d.waitingReceiving>0&&d.receivingUsedSkuUnits===capReceive,
   quality:replay.qualityReleasePercent===0&&d.waitingQuality>0,
   inventory:waitingUnverified>0&&unpicked>0,
   picking:unpicked>0&&(d.pickedOrders===cappedOrders
    ||(capPickUnits!==null&&d.pickedUnits===capPickUnits)),
   transport:replay.separateTransport&&staged>0&&
    (d.shipped===cappedOrders||(capTransportUnits!==null&&d.shippedUnits===capTransportUnits))
  };
  daily.push({
   day,ordersRequested:replay.orders,
   receivingQueueSkuUnits:d.waitingReceiving,
   receivedSkuUnits:d.receivingUsedSkuUnits,
   qualityHeldSkuUnits:d.waitingQuality,
   qualityReleasedSkuUnits:sum(d.releaseEvents,e=>e.qty),
   unverifiedSkuUnits:waitingUnverified,
   reserveHeldSkuUnits:reserveHeld,
   unpickedOrders:unpicked,stagedOrders:staged,shippedToday:d.shipped,
   shippedToDate:completed,pendingOrders:d.backlog,
   pickedOrdersToday:d.pickedOrders,pickedSkuUnitsToday:d.pickedUnits,
   shippedSkuUnitsToday:d.shippedUnits,
   observedLimit:saturation
  });
 }
 const last=daily.at(-1);
 if(last.shippedToDate!==replay.completed
  ||last.pendingOrders!==replay.pending
  ||last.receivingQueueSkuUnits!==campaign.receivingLedger.totals.closingWaitingSkuUnits
  ||last.qualityHeldSkuUnits!==campaign.qualityLedger.totals.closingHeldSkuUnits
  ||last.unverifiedSkuUnits!==campaign.inventoryLedger.totals.unverifiedSkuUnits
  ||last.stagedOrders!==campaign.pickingLedger.totals.awaitingTransportOrders
  ||last.unpickedOrders!==campaign.pickingLedger.totals.pendingUnpickedOrders){
  fail('lecturas de áreas y corte físico no concilian');
 }
 const selector={
  receiving:r=>r.receivingQueueSkuUnits,
  quality:r=>r.qualityHeldSkuUnits,
  inventory:r=>r.unverifiedSkuUnits,
  picking:r=>r.unpickedOrders,
  transport:r=>r.stagedOrders
 };
 const signals=areas.map(([id,label,unit,meaning])=>{
  const values=daily.map(selector[id]);
  const max=Math.max(...values),peakDay=values.indexOf(max);
  return {
   id,label,unit,meaning,
   observable:id!=='transport'||replay.separateTransport,
   atCut:values.at(-1),peak:max,peakDay:max>0?peakDay:null,
   observedDays:values.filter(n=>n>0).length,
   daysAtConfiguredLimit:daily.filter(r=>r.observedLimit[id]).length,
   evidence:'recovered.ledger[day] + recovered.ordersDetail + audited campaign area ledgers',
   interpretation:id==='transport'&&!replay.separateTransport
    ?'Picking y expedición ocurren juntos; no hay cola de transporte separada para atribuir una causa.'
    :id==='inventory'
     ?'Stock no verificable sigue físicamente en el CD; no equivale a merma ni a falta total.'
     :'Cola observada y uso del límite configurado no prueban una causa exclusiva de pedidos pendientes.'
  };
 });
 const simultaneous=daily.filter(d=>
  [d.receivingQueueSkuUnits,d.qualityHeldSkuUnits,d.unverifiedSkuUnits,d.unpickedOrders,d.stagedOrders]
   .filter(n=>n>0).length>=2).map(d=>d.day);
 return deepFreeze({
  passed:true,scope:'sku-cohort',baselineKey:comparison.baselineKey,
  option:comparison.option,horizonDays:replay.days,
  orders:replay.orders,dispatchedOrders:replay.completed,pendingOrders:replay.pending,
  separateTransport:replay.separateTransport,
  signals,daily,daysWithConcurrentObservations:simultaneous,
  checks:{auditedCampaign:true,oneOriginalPurchaseManifest:true,
   completeOrdersReconciled:true,receivingQualityInventoryReconciled:true,
   separatedPickingAndShippingOnlyWhenEnabled:true},
  bottleneckRootCause:null,
  additionalOrdersAttributedToOneArea:null,
  staffingHoursInferred:null,
  note:'Colas, días y saturaciones son observaciones del libro físico, NO un ranking causal. Unidades SKU no son pedidos; las señales pueden coexistir y nunca deben sumarse. El límite diario de pedidos puede restringir Picking o Transporte, especialmente en modo conjunto; una cola por sí sola no dice qué cambio recuperaría expediciones. Para demostrar impacto hay que cambiar una variable y ejecutar un contrafactual con la misma base (M6-29). Salida del CD no acredita entrega al cliente.'
 });
}
