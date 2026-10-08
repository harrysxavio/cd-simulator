/** Phase 3: deterministic SKU/order lab. Independent of the legacy aggregate engine.
 * Every fulfilled order must have ALL required SKU units. No fractional orders.
 * Greedy FIFO allocation is explicit; this is not an optimal fulfillment solver.
 */
export const SKU_CATALOG=[
 {id:'A',name:'Producto A · alta rotación',rotation:'alta',initial:150,unitCost:1800,leadDays:2,safetyDays:2},
 {id:'B',name:'Producto B · media rotación',rotation:'media',initial:90,unitCost:3200,leadDays:5,safetyDays:4},
 {id:'C',name:'Producto C · baja rotación',rotation:'baja',initial:55,unitCost:6500,leadDays:10,safetyDays:6}
];
export const ORDER_TEMPLATES=[
 {id:'basic',name:'Pedido básico',share:45,lines:{A:2}},
 {id:'combo',name:'Pedido combinado',share:30,lines:{A:1,B:1}},
 {id:'premium',name:'Pedido especial',share:15,lines:{A:1,C:1}},
 {id:'bulk',name:'Pedido mixto',share:10,lines:{A:2,B:1,C:1}}
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
 const rows=splits.map(({t,requested})=>({id:t.id,name:t.name,requested,complete:0,unfulfilled:0}));
 let complete=0,shortage=0,dispatched=0;
 const missingBySku=Object.fromEntries(catalog.map(p=>[p.id,0]));
 const demandBySku=Object.fromEntries(catalog.map(p=>[p.id,0]));
 for(const {t,requested} of splits)for(const [id,qty] of Object.entries(t.lines))demandBySku[id]+=requested*Number(qty);
 // Interleave types proportionally to avoid an artificial advantage for the first type.
 // A deterministic fair sequence, not a true time-stamped FIFO queue.
 const pending=splits.map(x=>x.requested),assigned=splits.map(()=>0);
 for(let step=0;step<count;step++){
  let best=-1,bestScore=-Infinity;
  for(let j=0;j<splits.length;j++){
   if(pending[j]<=0)continue;
   const score=(step+1)*splits[j].requested/count-assigned[j];
   if(score>bestScore){bestScore=score;best=j;}
  }
  const lines=splits[best].t.lines;
  const enough=Object.entries(lines).every(([id,qty])=>available[id]>=Number(qty));
  if(enough&&dispatched<limit){
   for(const [id,qty] of Object.entries(lines))available[id]-=Number(qty);
   rows[best].complete++;complete++;dispatched++;
  }else{
   rows[best].unfulfilled++;
   if(!enough){shortage++;for(const [id,qty] of Object.entries(lines))if(available[id]<Number(qty))missingBySku[id]++}
  }
  pending[best]--;assigned[best]++;
 }
 const stockInitial=Object.fromEntries(catalog.map(p=>[p.id,nonnegative(stock[p.id]??p.initial)]));
 const consumed=Object.fromEntries(catalog.map(p=>[p.id,stockInitial[p.id]-available[p.id]]));
 const skuMetrics=catalog.map(p=>{
  const demand=demandBySku[p.id],onHand=stockInitial[p.id],unitCost=nonnegative(p.unitCost??0);
  const dailyDemand=demand/30,leadDays=nonnegative(p.leadDays??0),safetyDays=nonnegative(p.safetyDays??0);
  const reorderPoint=Math.ceil(dailyDemand*(leadDays+safetyDays));
  const daysCover=dailyDemand>0?onHand/dailyDemand:null;
  const valueDemand=demand*unitCost;
  return {id:p.id,name:p.name,rotation:p.rotation||'sin clasificar',demand,onHand,remaining:available[p.id],consumed:consumed[p.id],unitCost,valueDemand,leadDays,safetyDays,reorderPoint,daysCover,reorderSuggested:available[p.id]<=reorderPoint,reorderAtStart:onHand<=reorderPoint,shortageUnits:Math.max(0,demand-onHand)};
 });
 const totalDemandValue=skuMetrics.reduce((n,p)=>n+p.valueDemand,0);
 const abc=[...skuMetrics].sort((a,b)=>b.valueDemand-a.valueDemand).map((p,i,all)=>({id:p.id,share:totalDemandValue?p.valueDemand/totalDemandValue*100:0}));
 let cumulative=0;for(const p of abc){const before=cumulative;cumulative+=p.share;p.cumulativeValue=cumulative;p.abc=before<80?'A':before<95?'B':'C';}
 const abcById=Object.fromEntries(abc.map(p=>[p.id,p]));
 for(const p of skuMetrics){p.valueShare=abcById[p.id].share;p.abc=abcById[p.id].abc;p.cumulativeValue=abcById[p.id].cumulativeValue;}
 return {skuMetrics,orders:count,complete,pending:count-complete,fulfillment:count?100*complete/count:100,rows,stockInitial,stockRemaining:available,consumed,demandBySku,missingBySku,blockedByStock:shortage,blockedByCapacity:count-complete-shortage,dispatchLimit:limit,method:'Secuencia intercalada proporcional y determinista; pedidos completos solamente (no FIFO cronológico)'};
}
