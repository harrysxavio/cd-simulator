/**
 * M3-08 · The warehouse Receiving work queue for ONE SKU cohort.
 *
 * Source facts: supplier PO schedule, daily physical dock/receipt events, and
 * the very same receipt records consumed by Quality and stock conservation.
 * No second event simulation, forecast or inventory calculation is allowed.
 */
const sum=(a,f)=>a.reduce((n,x)=>n+f(x),0);
const nonneg=n=>Number.isSafeInteger(n)&&n>=0;
const freeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(freeze);
  Object.freeze(value);
 }
 return value;
};
function fail(message='Recepción física no concilia con los eventos SKU'){throw new Error(message)}

export function warehouseReceivingReadModel({replay,supplierLedger,receipts}={}){
 if(!Array.isArray(replay?.ledger)||!supplierLedger?.passed
  ||!Array.isArray(supplierLedger.rows)||!Array.isArray(receipts)
  ||!nonneg(replay.days)||replay.days>365
  ||supplierLedger.horizonDays!==replay.days
  ||!(replay.receivingUnitCapacity===null||nonneg(replay.receivingUnitCapacity))
  ||replay.ledger.length!==replay.days+1)fail('Falta libro diario de Recepción válido');
 const poRows=supplierLedger.rows;
 const poById=new Map(poRows.map(p=>[p.id,p]));
 if(poById.size!==poRows.length)fail('Orden repetida en Recepción');
 const fullReceipts=new Map();
 for(const r of receipts){
  if(!poById.has(r?.purchaseOrderId)||!nonneg(r.day)||r.day>replay.days
   ||!nonneg(r.qty)||r.qty===0||typeof r.lotId!=='string'||!r.lotId
   ||fullReceipts.has(r.id))fail('Ingreso físico sin orden o lote válido');
  fullReceipts.set(r.id,r);
 }
 const processed=new Map(poRows.map(p=>[p.id,0]));
 const orderedByArrival=poRows.map((p,i)=>({...p,ordinal:i}))
  .sort((a,b)=>a.modeledArrivalDay-b.modeledArrivalDay||a.ordinal-b.ordinal);
 let previousQueue=0,peakWaiting=0,peakWaitingDay=0,skuWaitDays=0,oldestWaitingDays=0,receivedTotal=0;
 const daily=[];
 const cap=replay.receivingUnitCapacity;
 for(let day=0;day<=replay.days;day++){
  const eventDay=replay.ledger[day];
  if(eventDay?.day!==day||!Array.isArray(eventDay.dockArrivals)
   ||!Array.isArray(eventDay.receiptEvents)||!Array.isArray(eventDay.receivingQueue)
   ||eventDay.receivingCapacitySkuUnits!==cap)fail('Día de Recepción inconsistente');
  const arriving=orderedByArrival.filter(p=>p.modeledArrivalDay===day&&p.supplierFulfilledSkuUnits>0);
  const incoming=sum(arriving,p=>p.supplierFulfilledSkuUnits);
  const dockEvents=eventDay.dockArrivals;
  if(dockEvents.length!==arriving.length
   ||dockEvents.some(x=>!arriving.some(p=>
    p.id===x.purchaseOrderId&&p.skuId===x.skuId
    &&p.supplierFulfilledSkuUnits===x.qty&&x.day===day
    &&x.urgent===(p.source==='urgent')))){
   fail('Llegadas al muelle no coinciden con el proveedor');
  }
  const actual=receipts.filter(r=>r.day===day);
  const events=eventDay.receiptEvents;
  if(actual.length!==events.length
   ||actual.some(r=>!events.some(e=>
    e.purchaseOrderId===r.purchaseOrderId&&e.lotId===r.lotId
    &&e.skuId===r.skuId&&e.qty===r.qty&&e.day===r.day))){
   fail('Recepción física no coincide con los lotes');
  }
  const actualByPo=new Map(poRows.map(p=>[p.id,0]));
  for(const r of actual){
   const p=poById.get(r.purchaseOrderId);
   if(r.skuId!==p.skuId||r.day<p.modeledArrivalDay)fail('Ingreso anterior a la llegada prevista');
   actualByPo.set(p.id,actualByPo.get(p.id)+r.qty);
  }
  let remainingCapacity=cap===null?Infinity:cap;
  for(const p of orderedByArrival){
   if(p.modeledArrivalDay>day)break;
   // FIFO by modeled arrival day and stable PO insertion order.
   const available=p.supplierFulfilledSkuUnits-processed.get(p.id);
   if(available<0)fail('Inventario de muelle negativo');
   const expected=Math.min(available,remainingCapacity);
   if(actualByPo.get(p.id)!==expected)fail('Capacidad diaria o FIFO de Recepción no respeta la cola');
   processed.set(p.id,processed.get(p.id)+expected);
   remainingCapacity-=expected;
  }
  const receivedToday=sum(actual,r=>r.qty);
  if(eventDay.receivingUsedSkuUnits!==receivedToday||receivedToday>(cap??Infinity)
   ||sum(Object.values(eventDay.received),x=>x)!==receivedToday){
   fail('Capacidad de Recepción superada');
  }
  receivedTotal+=receivedToday;
  const endQueue=orderedByArrival.filter(p=>p.modeledArrivalDay<=day)
   .map(p=>({
    purchaseOrderId:p.id,skuId:p.skuId,arrivalDay:p.modeledArrivalDay,
    remainingSkuUnits:p.supplierFulfilledSkuUnits-processed.get(p.id),
    waitingDays:day-p.modeledArrivalDay,urgent:p.source==='urgent'
   })).filter(p=>p.remainingSkuUnits>0);
  const observedQueue=eventDay.receivingQueue;
  if(endQueue.length!==observedQueue.length
   ||endQueue.some((p,i)=>Object.keys(p).some(key=>p[key]!==observedQueue[i]?.[key]))){
   fail('Cola de muelle distinta a la observada');
  }
  const waiting=sum(endQueue,p=>p.remainingSkuUnits);
  if(waiting!==eventDay.waitingReceiving||waiting!==previousQueue+incoming-receivedToday){
   fail('Balance diario de cola inválido');
  }
  previousQueue=waiting;
  skuWaitDays+=waiting;
  if(waiting>peakWaiting){peakWaiting=waiting;peakWaitingDay=day}
  const oldest=endQueue.length?Math.max(...endQueue.map(p=>p.waitingDays)):0;
  oldestWaitingDays=Math.max(oldestWaitingDays,oldest);
  daily.push({
   day,capacitySkuUnits:cap,arrivedSkuUnits:incoming,
   receivedSkuUnits:receivedToday,receivedLots:actual.length,
   waitingSkuUnits:waiting,oldestWaitingDays:oldest,
   queue:endQueue
  });
 }
 const totals={
  arrivedSkuUnits:sum(daily,r=>r.arrivedSkuUnits),
  receivedSkuUnits:receivedTotal,
  closingWaitingSkuUnits:previousQueue,
  peakWaitingSkuUnits:peakWaiting,peakWaitingDay,
  oldestWaitingDays,queueSkuDays:skuWaitDays,
  receivingLots:receipts.length
 };
 if(totals.arrivedSkuUnits!==supplierLedger.totals.arrivedByCutoffSkuUnits
  ||totals.receivedSkuUnits!==supplierLedger.totals.warehouseReceivedSkuUnits
  ||totals.closingWaitingSkuUnits!==supplierLedger.totals.awaitingWarehouseReceiptSkuUnits
  ||totals.closingWaitingSkuUnits!==replay.waitingReceiving){
  fail('Recibos y cola final difieren del libro de proveedores');
 }
 return freeze({
  scope:'sku-cohort',horizonDays:replay.days,capacitySkuUnitsPerDay:cap,
  daily,totals,passed:true,
  boundary:'Llegar al muelle es un hito simulado. Solo la recepción con lote y orden registra ingreso a bodega; la cola no es inventario disponible y la mercadería recibida aún debe pasar Calidad.'
 });
}
