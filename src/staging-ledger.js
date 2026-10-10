import {SKU_CATALOG} from './sku.js';

const sum=(xs,fn)=>xs.reduce((n,x)=>n+fn(x),0);
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const sameLines=(a,b)=>a&&b
 &&Object.keys(a).length===Object.keys(b).length
 &&Object.keys(a).every(k=>b[k]===a[k]);
const fail=message=>{throw new Error('Staging SKU: '+message)};
const frozen=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(frozen);Object.freeze(x)}
 return x;
};

/**
 * M3-12a physical staging integrity audit, derived from one replay.
 * Prepared stock remains INSIDE the CD until the carrier's dispatch event.
 * This audit does not create or book a second stock movement.
 */
export function stagingIntegrityReadModel(replay){
 if(replay?.separateTransport!==true||!Array.isArray(replay.ledger)
  ||!Array.isArray(replay.ordersDetail)||!valid(replay.days)
  ||replay.ledger.length!==replay.days+1)fail('sin simulación segregada');
 const ids=SKU_CATALOG.map(p=>p.id),orders=replay.ordersDetail;
 const byId=new Map(orders.map(o=>[o.id,o]));
 if(byId.size!==orders.length||orders.length!==replay.orders)fail('pedidos originales inconsistentes');
 const prepared=new Map(),shipped=new Map(),stage=Object.fromEntries(ids.map(id=>[id,0]));
 const totalBySku=Object.fromEntries(ids.map(id=>[id,0]));
 let receivedToDate=0,shippedUnitsToDate=0;
 const days=[];
 for(const d of replay.ledger){
  if(d.day!==days.length||!Array.isArray(d.pickEvents)||!Array.isArray(d.shipmentEvents)
   ||!valid(d.pickedOrders)||!valid(d.pickedUnits)||!valid(d.shipped)||!valid(d.shippedUnits)
   ||d.pickEvents.length!==d.pickedOrders||d.shipmentEvents.length!==d.shipped
   ||d.pickedOrders>replay.dailyCapacity||d.shipped>replay.dailyCapacity
   ||d.pickedUnits>(replay.pickingUnitCapacity??Infinity)
   ||d.shippedUnits>(replay.transportUnitCapacity??Infinity)){
   fail('jornada o límites de Picking/Transporte inválidos');
  }
  for(const p of d.pickEvents){
   const o=byId.get(p?.orderId);
   if(!o||prepared.has(o.id)||p.pickId!=='PICK-'+o.id
    ||p.day!==d.day||p.templateId!==o.templateId
    ||!sameLines(p.lines,o.lines)||!valid(p.units)||p.units===0
    ||p.units!==sum(Object.values(o.lines),v=>v)
    ||o.pickedDay!==d.day)fail('preparación falsa o pedido con BOM distinto');
   prepared.set(o.id,p);
   for(const [id,qty] of Object.entries(o.lines)){
    if(!ids.includes(id)||!valid(qty)||qty<1)fail('SKU de preparación inválido');
    stage[id]+=qty;
   }
  }
  if(sum(d.pickEvents,p=>p.units)!==d.pickedUnits)fail('cantidad preparada incorrecta');
  for(const s of d.shipmentEvents){
   const o=byId.get(s?.orderId),p=prepared.get(o?.id);
   if(!p||shipped.has(o.id)||s.day!==d.day||o.fulfilledDay!==d.day
    ||o.pickedDay>d.day||s.pickId!==p.pickId
    ||s.templateId!==o.templateId||!sameLines(s.lines,p.lines)
    ||s.units!==p.units)fail('salida del CD sin pedido previamente preparado');
   shipped.set(o.id,s);
   for(const [id,qty] of Object.entries(o.lines)){
    stage[id]-=qty;
    if(stage[id]<0)fail('staging negativo');
   }
  }
  if(sum(d.shipmentEvents,s=>s.units)!==d.shippedUnits)fail('cantidad expedida incorrecta');
  const remaining=orders.filter(o=>prepared.has(o.id)&&!shipped.has(o.id));
  const stagingUnits=sum(Object.values(stage),qty=>qty);
  const expectedQty=Object.fromEntries(ids.map(id=>[id,sum(remaining,o=>o.lines[id]||0)]));
  if(d.stagingOrders!==remaining.length||d.stagingUnits!==stagingUnits
   ||ids.some(id=>d.stagingStock?.[id]!==stage[id]||stage[id]!==expectedQty[id])){
   fail('cola de staging no concilia por pedido/SKU');
  }
  receivedToDate+=sum(Object.values(d.received),qty=>qty);
  shippedUnitsToDate+=d.shippedUnits;
  const warehouse=sum(ids,id=>(d.stock?.[id]??NaN)+(d.reserveStock?.[id]??NaN)+(d.heldQuality?.[id]??NaN)+stage[id]);
  const opening=sum(Object.values(replay.initial),n=>n);
  if(warehouse!==opening+receivedToDate-shippedUnitsToDate){
   fail('conservación física diaria: PICK-FACE + STAGING + RESERVA + Calidad');
  }
  const oldestWaitingDays=remaining.reduce((n,o)=>Math.max(n,d.day-o.pickedDay),0);
  days.push({day:d.day,pickedOrders:d.pickedOrders,shippedOrders:d.shipped,
   stagingOrders:remaining.length,stagingSkuUnits:stagingUnits,oldestWaitingDays,
   preparedSkuUnits:d.pickedUnits,shippedSkuUnits:d.shippedUnits,
   stagingStock:{...stage}});
 }
 if(shipped.size!==replay.completed||replay.pending!==orders.length-shipped.size
  ||prepared.size-shipped.size!==replay.endingStagingOrders
  ||ids.some(id=>stage[id]!==replay.endingStagingStock?.[id]
   ||totalBySku[id]!==0)
  ||sum(Object.values(replay.consumed),v=>v)!==shippedUnitsToDate
  ||orders.some(o=>o.fulfilledDay!==null&&(o.pickedDay===null||o.pickedDay>o.fulfilledDay))){
  fail('balance acumulado de pedidos preparados y expedidos inválido');
 }
 return frozen({scope:'sku-cohort',mode:'independent-staging',passed:true,
  horizonDays:replay.days,daily:days,
  totals:{preparedOrders:prepared.size,shippedOrders:shipped.size,
   stagingOrders:prepared.size-shipped.size,
   stagingSkuUnits:sum(Object.values(stage),v=>v),
   unpickedOrders:orders.length-prepared.size,
   shippedSkuUnits:shippedUnitsToDate},
  boundary:'STAGING-CD contiene kits completos preparados físicamente. Un kit no sale del CD hasta un evento distinto de Transporte. Es una prueba interna del motor M3-12a; el resto de áreas todavía no consume este modo hasta M3-12b. El despacho no prueba entrega al cliente.'});
}
