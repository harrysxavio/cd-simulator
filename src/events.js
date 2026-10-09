import {SKU_CATALOG,ORDER_TEMPLATES} from './sku.js';
import {deliveryTimeline} from './timeline.js';

/** Actual daily dispatch ledger for one fixed order cohort.
 * Day 0 demand is allocated by largest remainder; pending orders persist.
 * Supplier receipts become usable on arrival day, never earlier.
 */
export function eventSimulation({policy='service',orders=200,stock={},delayDays={},supplierFill={},days=12,dailyCapacity=200,fixedPurchases=null,extraDeliveries=[]}={}){
 if(!Number.isInteger(days)||days<0||days>365||!Number.isInteger(dailyCapacity)||dailyCapacity<0||dailyCapacity>100000)throw new Error('Horizonte o capacidad inválidos');
 const timeline=deliveryTimeline({policy,orders,stock,delayDays,supplierFill,fixedPurchases,checkpoints:[0]});
 const available={...timeline.initial},initial={...available};
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
  queue.push({type:best,fulfilledDay:null});
  assigned[best]++;
 }
 const ledger=[];
 for(let day=0;day<=days;day++){
  const received=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,0]));
  for(const d of timeline.deliveries)if(d.arrivalDay===day){available[d.id]+=d.received;received[d.id]+=d.received}
  for(const d of extraDeliveries)if(d.day===day){available[d.id]+=d.qty;received[d.id]+=d.qty}
  let shipped=0;
  for(const order of queue){
   if(shipped>=dailyCapacity)break;
   if(order.fulfilledDay!==null)continue;
   const lines=types[order.type].lines;
   if(!Object.entries(lines).every(([id,qty])=>available[id]>=qty))continue;
   for(const [id,qty] of Object.entries(lines))available[id]-=qty;
   order.fulfilledDay=day;types[order.type].fulfilled++;shipped++;
  }
  const completed=queue.filter(o=>o.fulfilledDay!==null).length;
  const backlog=n-completed;
  ledger.push({day,received,shipped,completed,backlog,stock:{...available},onTime:queue.filter(o=>o.fulfilledDay===0).length});
 }
 const completed=queue.filter(o=>o.fulfilledDay!==null).length;
 const consumed=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,initial[p.id]+timeline.deliveries.filter(d=>d.arrivalDay<=days&&d.id===p.id).reduce((a,d)=>a+d.received,0)+extraDeliveries.filter(d=>d.day<=days&&d.id===p.id).reduce((a,d)=>a+d.qty,0)-available[p.id]]));
 const late=queue.filter(o=>o.fulfilledDay!==null&&o.fulfilledDay>0);
 const backlogAgeDays=queue.filter(o=>o.fulfilledDay===null).length*(days+1);
 return {orders:n,policy,days,dailyCapacity,ledger,types,initial,endingStock:available,consumed,deliveries:timeline.deliveries,extraDeliveries,completed,pending:n-completed,onTime:ledger[0].completed,late:late.length,averageDelayDays:late.length?late.reduce((a,o)=>a+o.fulfilledDay,0)/late.length:0,backlogAgeDays,assumptions:'Cohorte fija creada en día 0, sin pedidos nuevos. Los pendientes se reintentan diariamente. Se permite saltar pedidos bloqueados; la capacidad diaria limita órdenes completas. Recepción y calidad instantáneas al llegar; sin vencimientos, cancelaciones ni costos de almacenamiento temporal.'};
}
