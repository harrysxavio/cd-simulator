import {SKU_CATALOG,ORDER_TEMPLATES} from './sku.js';
import {deliveryTimeline} from './timeline.js';

/** Actual daily dispatch ledger for one fixed order cohort.
 * Day 0 demand is allocated by largest remainder; pending orders persist.
 * Supplier receipts become usable on arrival day, never earlier.
 */
export function eventSimulation({policy='service',orders=200,stock={},delayDays={},supplierFill={},days=12,dailyCapacity=200,receivingUnitCapacity=null,pickingUnitCapacity=null,transportUnitCapacity=null,qualityReleasePercent=100,inventoryAccuracyPercent=100,fixedPurchases=null,extraDeliveries=[],reserveStock={},reserveReleaseDay=null}={}){
 if(!Number.isInteger(days)||days<0||days>365||!Number.isInteger(dailyCapacity)||dailyCapacity<0||dailyCapacity>100000)throw new Error('Horizonte o capacidad inválidos');
 for(const [key,cap] of Object.entries({receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity})){
  if(cap!==null&&(!Number.isSafeInteger(cap)||cap<0||cap>100000))throw new Error('Capacidad física por área inválida: '+key);
 }
 const timeline=deliveryTimeline({policy,orders,stock,delayDays,supplierFill,fixedPurchases,checkpoints:[0]});
 const initial={...timeline.initial};
 if(reserveStock===null||typeof reserveStock!=='object'||Array.isArray(reserveStock)||Object.keys(reserveStock).some(id=>!SKU_CATALOG.some(p=>p.id===id)))throw new Error('Ubicación de reserva inválida');
 const heldReserve=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,reserveStock[p.id]??0]));
 if(SKU_CATALOG.some(p=>!Number.isSafeInteger(heldReserve[p.id])||heldReserve[p.id]<0||heldReserve[p.id]>initial[p.id]))throw new Error('Reserva debe existir dentro del stock inicial por SKU');
 if(reserveReleaseDay!==null&&(!Number.isInteger(reserveReleaseDay)||reserveReleaseDay<1||reserveReleaseDay>365))throw new Error('Día de traslado de reserva inválido');
 const openingReserve={...heldReserve},available=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,initial[p.id]-heldReserve[p.id]]));
 if(!Number.isFinite(qualityReleasePercent)||qualityReleasePercent<0||qualityReleasePercent>100)throw new Error('Porcentaje de liberación de Calidad inválido');
 if(!Number.isFinite(inventoryAccuracyPercent)||inventoryAccuracyPercent<0||inventoryAccuracyPercent>100)throw new Error('Exactitud de inventario inválida');
 if(!Array.isArray(extraDeliveries)||extraDeliveries.some(d=>!SKU_CATALOG.some(p=>p.id===d.id)||!Number.isSafeInteger(d.qty)||d.qty<0||!Number.isInteger(d.day)||d.day<1||d.day>365))throw new Error('Recepción extraordinaria inválida');
 const types=ORDER_TEMPLATES.map(t=>({id:t.id,name:t.name,share:t.share,lines:t.lines,requested:0,fulfilled:0}));
 const share=types.reduce((n,t)=>n+t.share,0),n=Math.floor(Number(orders));
 const fractions=types.map((t,i)=>{const exact=n*t.share/share;return {i,whole:Math.floor(exact),fraction:exact%1}});
 let extra=n-fractions.reduce((sum,t)=>sum+t.whole,0);
 for(const f of [...fractions].sort((a,b)=>b.fraction-a.fraction||a.i-b.i)){if(extra--<=0)break;f.whole++}
 fractions.forEach(f=>types[f.i].requested=f.whole);
 // Deterministic proportional queue; a blocked order is retained for later days.
 const queue=[],assigned=types.map(()=>0);
 for(let step=0;step<n;step++){
  let best=-1,score=-Infinity;
  for(let j=0;j<types.length;j++){
   if(assigned[j]>=types[j].requested)continue;
   const s=(step+1)*types[j].requested/n-assigned[j];
   if(s>score){score=s;best=j}
  }
  queue.push({id:'ORD-'+String(step+1).padStart(6,'0'),type:best,fulfilledDay:null});
  assigned[best]++;
 }
 // Arrivals are queued until Receiving has actual unit capacity.
 // Purchase arrival does not imply that inventory is automatically received or pickable.
 const pendingReceipts=[];
 const qualityQueue=[];
 const ledger=[];
 for(let day=0;day<=days;day++){
  const received=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,0]));
  const receivedUrgent=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,0]));
  const released=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,0]));
  // Track traceable physical events, preserving existing daily totals.
  const receiptEvents=[],releaseEvents=[],shipmentEvents=[],reserveEvents=[],dockArrivals=[];
  const movedReserve=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,0]));
  if(reserveReleaseDay===day)for(const p of SKU_CATALOG){const qty=heldReserve[p.id];if(qty>0){heldReserve[p.id]-=qty;available[p.id]+=qty;movedReserve[p.id]=qty;reserveEvents.push({id:'MOVE-'+day+'-'+p.id,day,skuId:p.id,qty,from:'RESERVA-CD',to:'PICK-FACE',verified:true});}}
  for(const d of timeline.deliveries)if(d.arrivalDay===day&&d.received>0){
   const purchaseOrderId='PO-'+d.id;
   pendingReceipts.push({id:d.id,remaining:d.received,arrivalDay:day,urgent:false,purchaseOrderId});
   dockArrivals.push({purchaseOrderId,skuId:d.id,qty:d.received,day,urgent:false});
  }
  for(const [i,d] of extraDeliveries.entries())if(d.day===day&&d.qty>0){
   const purchaseOrderId='URG-'+String(i+1).padStart(3,'0')+'-'+d.id;
   pendingReceipts.push({id:d.id,remaining:d.qty,arrivalDay:day,urgent:true,purchaseOrderId});
   dockArrivals.push({purchaseOrderId,skuId:d.id,qty:d.qty,day,urgent:true});
  }
  let receivingRemaining=receivingUnitCapacity===null?Infinity:receivingUnitCapacity;
  for(const shipment of pendingReceipts){
   if(receivingRemaining<=0)break;
   // Already unloaded deliveries remain in the timeline for audit, but must
   // NEVER generate another empty warehouse lot on later campaign days.
   if(shipment.remaining<=0)continue;
   const qty=Math.min(shipment.remaining,receivingRemaining);
   shipment.remaining-=qty;receivingRemaining-=qty;
   received[shipment.id]+=qty;
   const lotId='LOT-'+day+'-'+String(receiptEvents.length+1).padStart(4,'0');
   qualityQueue.push({id:shipment.id,remaining:qty,urgent:shipment.urgent,lotId});
   receiptEvents.push({lotId,purchaseOrderId:shipment.purchaseOrderId,skuId:shipment.id,qty,day,urgent:shipment.urgent});
   if(shipment.urgent)receivedUrgent[shipment.id]+=qty;
  }
  // End-of-day dock queue is a physical work queue, not warehouse on-hand stock.
  // Keep only unprocessed units, with their real modeled arrival day and PO.
  const receivingQueue=pendingReceipts.filter(x=>x.remaining>0).map(x=>({
   purchaseOrderId:x.purchaseOrderId,skuId:x.id,arrivalDay:x.arrivalDay,
   remainingSkuUnits:x.remaining,waitingDays:day-x.arrivalDay,urgent:x.urgent
  }));
  const waitingReceiving=receivingQueue.reduce((sum,x)=>sum+x.remainingSkuUnits,0);
  const receivingUsedSkuUnits=receiptEvents.reduce((sum,x)=>sum+x.qty,0);
  // Quality is a separate physical holding state: received does not mean pickable.
  // Apply a daily release rate to this queue. At 100% all receipts clear same day.
  // The ceiling prevents tiny but positive daily batches from becoming permanently stuck.
  const awaitingQuality=qualityQueue.reduce((sum,x)=>sum+x.remaining,0);
  let qualityBudget=Math.ceil(awaitingQuality*qualityReleasePercent/100);
  for(const lot of qualityQueue){
   if(qualityBudget<=0)break;
   // Earlier lots stay in the journal, but an exhausted lot cannot produce
   // a zero-unit quality release or a fictitious inventory movement.
   if(lot.remaining<=0)continue;
   const qty=Math.min(lot.remaining,qualityBudget);
   lot.remaining-=qty;qualityBudget-=qty;
   available[lot.id]+=qty;released[lot.id]+=qty;
   releaseEvents.push({lotId:lot.lotId,skuId:lot.id,qty,day});
  }
  const waitingQuality=qualityQueue.reduce((sum,x)=>sum+x.remaining,0);
  // Physical on-hand stock NEVER disappears due to an accuracy decision.
  // A separate, daily promiseable balance limits picking; its complement
  // remains physically in the warehouse, not written off or held by Quality.
  const pickable=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,Math.floor(available[p.id]*inventoryAccuracyPercent/100)]));
  let shipped=0,shippedUnits=0;
  for(const order of queue){
   if(shipped>=dailyCapacity)break;
   if(order.fulfilledDay!==null)continue;
   const lines=types[order.type].lines;
   const kitUnits=Object.values(lines).reduce((sum,qty)=>sum+qty,0);
   if(shippedUnits+kitUnits>(pickingUnitCapacity===null?Infinity:pickingUnitCapacity))continue;
   if(shippedUnits+kitUnits>(transportUnitCapacity===null?Infinity:transportUnitCapacity))continue;
   if(!Object.entries(lines).every(([id,qty])=>pickable[id]>=qty))continue;
   for(const [id,qty] of Object.entries(lines)){available[id]-=qty;pickable[id]-=qty;}
   order.fulfilledDay=day;types[order.type].fulfilled++;shipped++;shippedUnits+=kitUnits;
   shipmentEvents.push({orderId:order.id,templateId:types[order.type].id,day,lines:{...lines},units:kitUnits});
  }
  const unverifiedStock=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,available[p.id]-pickable[p.id]]));
  const completed=queue.filter(o=>o.fulfilledDay!==null).length;
  const backlog=n-completed;
  ledger.push({day,dockArrivals,receiptEvents,receivingQueue,receivingUsedSkuUnits,receivingCapacitySkuUnits:receivingUnitCapacity,releaseEvents,reserveEvents,shipmentEvents,received,released,movedReserve,reserveStock:{...heldReserve},receivedUrgent,waitingReceiving,waitingQuality,heldQuality:Object.fromEntries(SKU_CATALOG.map(p=>[p.id,qualityQueue.filter(lot=>lot.id===p.id).reduce((n,x)=>n+x.remaining,0)])),shipped,shippedUnits,completed,backlog,stock:{...available},pickableStock:{...pickable},unverifiedStock,onTime:queue.filter(o=>o.fulfilledDay===0).length});
 }
 const completed=queue.filter(o=>o.fulfilledDay!==null).length;
 const consumed=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,initial[p.id]+ledger.reduce((total,entry)=>total+entry.received[p.id],0)-available[p.id]-heldReserve[p.id]-qualityQueue.filter(x=>x.id===p.id).reduce((n,x)=>n+x.remaining,0)]));
 const late=queue.filter(o=>o.fulfilledDay!==null&&o.fulfilledDay>0);
 const backlogAgeDays=queue.filter(o=>o.fulfilledDay===null).length*(days+1);
 return {orders:n,ordersDetail:queue.map(o=>({id:o.id,templateId:types[o.type].id,lines:{...types[o.type].lines},fulfilledDay:o.fulfilledDay})),policy,days,dailyCapacity,receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity,qualityReleasePercent,inventoryAccuracyPercent,ledger,types,initial,openingReserve,endingReserveStock:{...heldReserve},reserveReleaseDay,endingStock:available,endingPickableStock:{...ledger.at(-1).pickableStock},endingUnverifiedStock:{...ledger.at(-1).unverifiedStock},heldQuality:Object.fromEntries(SKU_CATALOG.map(p=>[p.id,qualityQueue.filter(x=>x.id===p.id).reduce((n,x)=>n+x.remaining,0)])),consumed,deliveries:timeline.deliveries,extraDeliveries,waitingReceiving:ledger.at(-1).waitingReceiving,waitingQuality:ledger.at(-1).waitingQuality,completed,pending:n-completed,onTime:ledger[0].completed,late:late.length,averageDelayDays:late.length?late.reduce((a,o)=>a+o.fulfilledDay,0)/late.length:0,backlogAgeDays,assumptions:'Cohorte fija creada en día 0, sin pedidos nuevos. Los pendientes se reintentan diariamente. Se permite saltar pedidos bloqueados; la capacidad diaria limita órdenes completas. Las entregas esperan capacidad de Recepción, y las unidades recibidas permanecen retenidas hasta su liberación por Calidad. La tasa de liberación es diaria sobre el stock en control (no defectos ni rechazos). El stock inicial ubicado en RESERVA-CD es parte del inventario físico inicial (nunca se suma una segunda vez) y solo pasa a PICK-FACE mediante un evento de traslado verificable en su día efectivo. Inventario conserva la totalidad del stock físico y separa la fracción confiable para picking de la fracción no verificable, reestimada diariamente; no equivale a merma, pérdida ni cuarentena de Calidad. Picking y Transporte comparten el despacho por pedido completo y tienen límites diarios de unidades SKU, sin inventario de trabajo en proceso. Sin vencimientos, cancelaciones ni costos de almacenamiento temporal.'};
}
