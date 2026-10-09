import {SKU_CATALOG,ORDER_TEMPLATES} from './sku.js';
import {deliveryTimeline} from './timeline.js';

/** Actual daily dispatch ledger for one fixed order cohort.
 * Day 0 demand is allocated by largest remainder; pending orders persist.
 * Supplier receipts become usable on arrival day, never earlier.
 */
export function eventSimulation({policy='service',orders=200,stock={},delayDays={},supplierFill={},days=12,dailyCapacity=200,receivingUnitCapacity=null,pickingUnitCapacity=null,transportUnitCapacity=null,qualityReleasePercent=100,fixedPurchases=null,extraDeliveries=[]}={}){
 if(!Number.isInteger(days)||days<0||days>365||!Number.isInteger(dailyCapacity)||dailyCapacity<0||dailyCapacity>100000)throw new Error('Horizonte o capacidad inválidos');
 for(const [key,cap] of Object.entries({receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity})){
  if(cap!==null&&(!Number.isSafeInteger(cap)||cap<0||cap>100000))throw new Error('Capacidad física por área inválida: '+key);
 }
 const timeline=deliveryTimeline({policy,orders,stock,delayDays,supplierFill,fixedPurchases,checkpoints:[0]});
 const available={...timeline.initial},initial={...available};
 if(!Number.isFinite(qualityReleasePercent)||qualityReleasePercent<0||qualityReleasePercent>100)throw new Error('Porcentaje de liberación de Calidad inválido');
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
  const receiptEvents=[],releaseEvents=[],shipmentEvents=[];
  for(const d of timeline.deliveries)if(d.arrivalDay===day&&d.received>0)pendingReceipts.push({id:d.id,remaining:d.received,urgent:false,purchaseOrderId:'PO-'+d.id});
  for(const [i,d] of extraDeliveries.entries())if(d.day===day&&d.qty>0)pendingReceipts.push({id:d.id,remaining:d.qty,urgent:true,purchaseOrderId:'URG-'+String(i+1).padStart(3,'0')+'-'+d.id});
  let receivingRemaining=receivingUnitCapacity===null?Infinity:receivingUnitCapacity;
  for(const shipment of pendingReceipts){
   if(receivingRemaining<=0)break;
   const qty=Math.min(shipment.remaining,receivingRemaining);
   shipment.remaining-=qty;receivingRemaining-=qty;
   received[shipment.id]+=qty;
   const lotId='LOT-'+day+'-'+String(receiptEvents.length+1).padStart(4,'0');
   qualityQueue.push({id:shipment.id,remaining:qty,urgent:shipment.urgent,lotId});
   receiptEvents.push({lotId,purchaseOrderId:shipment.purchaseOrderId,skuId:shipment.id,qty,day,urgent:shipment.urgent});
   if(shipment.urgent)receivedUrgent[shipment.id]+=qty;
  }
  const waitingReceiving=pendingReceipts.reduce((sum,x)=>sum+x.remaining,0);
  // Quality is a separate physical holding state: received does not mean pickable.
  // Apply a daily release rate to this queue. At 100% all receipts clear same day.
  // The ceiling prevents tiny but positive daily batches from becoming permanently stuck.
  const awaitingQuality=qualityQueue.reduce((sum,x)=>sum+x.remaining,0);
  let qualityBudget=Math.ceil(awaitingQuality*qualityReleasePercent/100);
  for(const lot of qualityQueue){
   if(qualityBudget<=0)break;
   const qty=Math.min(lot.remaining,qualityBudget);
   lot.remaining-=qty;qualityBudget-=qty;
   available[lot.id]+=qty;released[lot.id]+=qty;
   releaseEvents.push({lotId:lot.lotId,skuId:lot.id,qty,day});
  }
  const waitingQuality=qualityQueue.reduce((sum,x)=>sum+x.remaining,0);
  let shipped=0,shippedUnits=0;
  for(const order of queue){
   if(shipped>=dailyCapacity)break;
   if(order.fulfilledDay!==null)continue;
   const lines=types[order.type].lines;
   const kitUnits=Object.values(lines).reduce((sum,qty)=>sum+qty,0);
   if(shippedUnits+kitUnits>(pickingUnitCapacity===null?Infinity:pickingUnitCapacity))continue;
   if(shippedUnits+kitUnits>(transportUnitCapacity===null?Infinity:transportUnitCapacity))continue;
   if(!Object.entries(lines).every(([id,qty])=>available[id]>=qty))continue;
   for(const [id,qty] of Object.entries(lines))available[id]-=qty;
   order.fulfilledDay=day;types[order.type].fulfilled++;shipped++;shippedUnits+=kitUnits;
   shipmentEvents.push({orderId:order.id,templateId:types[order.type].id,day,lines:{...lines},units:kitUnits});
  }
  const completed=queue.filter(o=>o.fulfilledDay!==null).length;
  const backlog=n-completed;
  ledger.push({day,receiptEvents,releaseEvents,shipmentEvents,received,released,receivedUrgent,waitingReceiving,waitingQuality,heldQuality:Object.fromEntries(SKU_CATALOG.map(p=>[p.id,qualityQueue.filter(lot=>lot.id===p.id).reduce((n,x)=>n+x.remaining,0)])),shipped,shippedUnits,completed,backlog,stock:{...available},onTime:queue.filter(o=>o.fulfilledDay===0).length});
 }
 const completed=queue.filter(o=>o.fulfilledDay!==null).length;
 const consumed=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,initial[p.id]+ledger.reduce((total,entry)=>total+entry.received[p.id],0)-available[p.id]-qualityQueue.filter(x=>x.id===p.id).reduce((n,x)=>n+x.remaining,0)]));
 const late=queue.filter(o=>o.fulfilledDay!==null&&o.fulfilledDay>0);
 const backlogAgeDays=queue.filter(o=>o.fulfilledDay===null).length*(days+1);
 return {orders:n,ordersDetail:queue.map(o=>({id:o.id,templateId:types[o.type].id,lines:{...types[o.type].lines},fulfilledDay:o.fulfilledDay})),policy,days,dailyCapacity,receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity,qualityReleasePercent,ledger,types,initial,endingStock:available,heldQuality:Object.fromEntries(SKU_CATALOG.map(p=>[p.id,qualityQueue.filter(x=>x.id===p.id).reduce((n,x)=>n+x.remaining,0)])),consumed,deliveries:timeline.deliveries,extraDeliveries,waitingReceiving:ledger.at(-1).waitingReceiving,waitingQuality:ledger.at(-1).waitingQuality,completed,pending:n-completed,onTime:ledger[0].completed,late:late.length,averageDelayDays:late.length?late.reduce((a,o)=>a+o.fulfilledDay,0)/late.length:0,backlogAgeDays,assumptions:'Cohorte fija creada en día 0, sin pedidos nuevos. Los pendientes se reintentan diariamente. Se permite saltar pedidos bloqueados; la capacidad diaria limita órdenes completas. Las entregas esperan capacidad de Recepción, y las unidades recibidas permanecen retenidas hasta su liberación por Calidad. La tasa de liberación es diaria sobre el stock en control (no defectos ni rechazos). Picking y Transporte comparten el despacho por pedido completo y tienen límites diarios de unidades SKU, sin inventario de trabajo en proceso. Sin vencimientos, cancelaciones ni costos de almacenamiento temporal.'};
}
