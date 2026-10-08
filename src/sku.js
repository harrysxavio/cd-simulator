/** Phase 3: deterministic SKU/order lab. Independent of the legacy aggregate engine.
 * Every fulfilled order must have ALL required SKU units. No fractional orders.
 * Greedy FIFO allocation is explicit; this is not an optimal fulfillment solver.
 */
export const SKU_CATALOG=[
 {id:'A',name:'Producto A',initial:120},
 {id:'B',name:'Producto B',initial:90},
 {id:'C',name:'Producto C',initial:80},
 {id:'D',name:'Producto D',initial:50}
];
export const ORDER_TEMPLATES=[
 {id:'basic',name:'Pedido básico',share:40,lines:{A:1,B:1}},
 {id:'combo',name:'Pedido combinado',share:30,lines:{A:1,C:2}},
 {id:'premium',name:'Pedido premium',share:20,lines:{B:1,C:1,D:1}},
 {id:'bulk',name:'Pedido volumen',share:10,lines:{A:2,D:1}}
];
const nonnegative=n=>Number.isFinite(Number(n))?Math.max(0,Math.floor(Number(n))):0;
export function skuOrderLab({orders=200,stock={},templates=ORDER_TEMPLATES,catalog=SKU_CATALOG,dispatchLimit=Infinity}={}){
 const count=nonnegative(orders),limit=Number.isFinite(Number(dispatchLimit))?nonnegative(dispatchLimit):count;
 const ids=new Set(catalog.map(p=>p.id));
 if(ids.size!==catalog.length||!catalog.length)throw new Error('Catálogo SKU duplicado o vacío');
 const available=Object.fromEntries(catalog.map(p=>[p.id,nonnegative(stock[p.id]??p.initial)]));
 if(!Array.isArray(templates)||!templates.length||templates.some(t=>!Number.isFinite(Number(t.share))||Number(t.share)<0||!t.lines||!Object.keys(t.lines).length||Object.entries(t.lines).some(([id,qty])=>!ids.has(id)||!Number.isInteger(Number(qty))||Number(qty)<=0)))throw new Error('Mezcla de pedidos inválida');
 const totalShare=templates.reduce((n,t)=>n+Number(t.share),0);
 if(totalShare<=0)throw new Error('La mezcla de pedidos no puede sumar cero');
 // Largest-remainder apportionment avoids losing orders to rounding.
 const splits=templates.map((t,i)=>{const exact=count*Number(t.share)/totalShare;return {t,i,requested:Math.floor(exact),remainder:exact-Math.floor(exact)}});
 let remaining=count-splits.reduce((n,t)=>n+t.requested,0);
 for(const t of [...splits].sort((a,b)=>b.remainder-a.remainder||a.i-b.i)){if(remaining--<=0)break;t.requested++}
 const rows=[];let complete=0,partial=0,shortage=0,dispatched=0;
 const missingBySku=Object.fromEntries(catalog.map(p=>[p.id,0]));
 const demandBySku=Object.fromEntries(catalog.map(p=>[p.id,0]));
 for(const {t,requested} of splits){
  const lines=Object.fromEntries(Object.entries(t.lines).map(([id,qty])=>[id,Number(qty)]));
  for(const [id,qty] of Object.entries(lines))demandBySku[id]+=requested*qty;
  let filled=0,blocked=0;
  for(let i=0;i<requested;i++){
   const enough=Object.entries(lines).every(([id,qty])=>available[id]>=qty);
   if(enough&&dispatched<limit){
    for(const [id,qty] of Object.entries(lines))available[id]-=qty;
    filled++;dispatched++;
   }else{
    blocked++;
    if(!enough){shortage++;for(const [id,qty] of Object.entries(lines))if(available[id]<qty)missingBySku[id]++}
   }
  }
  rows.push({id:t.id,name:t.name,requested,complete:filled,unfulfilled:blocked});
  complete+=filled;
 }
 const stockInitial=Object.fromEntries(catalog.map(p=>[p.id,nonnegative(stock[p.id]??p.initial)]));
 const consumed=Object.fromEntries(catalog.map(p=>[p.id,stockInitial[p.id]-available[p.id]]));
 return {orders:count,complete,pending:count-complete,fulfillment:count?100*complete/count:100,rows,stockInitial,stockRemaining:available,consumed,demandBySku,missingBySku,blockedByStock:shortage,blockedByCapacity:count-complete-shortage,dispatchLimit:limit,method:'FIFO por tipo de pedido en orden de mezcla; pedidos completos solamente'};
}
