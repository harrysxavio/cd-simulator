import {SKU_CATALOG,ORDER_TEMPLATES} from './sku.js';

const sum=(items,fn)=>items.reduce((n,item)=>n+fn(item),0);
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
const fail=reason=>{throw new Error('Picking SKU: '+reason)};
const linesMatch=(a,b)=>a&&b&&Object.keys(a).length===Object.keys(b).length
 &&Object.keys(a).every(id=>b[id]===a[id]);

/**
 * M3-11: a read-only audit of discrete preparation events for complete orders.
 *
 * At this milestone a picked order leaves the CD in the SAME simulated day.
 * Staging and independent dispatch timing belong to M3-12. Do not claim
 * picked-but-awaiting-transport orders from this ledger.
 */
export function pickingOrderReadModel({replay,shipments,orders}={}){
 if(!Array.isArray(replay?.ledger)||!Array.isArray(shipments)||!Array.isArray(orders)
  ||!valid(replay.days)||replay.ledger.length!==replay.days+1
  ||!valid(replay.dailyCapacity)
  ||!(replay.pickingUnitCapacity===null||valid(replay.pickingUnitCapacity))){
  fail('faltan eventos de preparación o límites');
 }
 const skuIds=SKU_CATALOG.map(p=>p.id);
 const templates=new Map(ORDER_TEMPLATES.map(t=>[t.id,t.lines]));
 const orderById=new Map(orders.map(o=>[o.id,o]));
 if(orderById.size!==orders.length||orders.length!==replay.orders)fail('pedidos duplicados o faltantes');
 const seenPicks=new Set(),seenDispatches=new Set(),daily=[];
 let pickedOrders=0,pickedSkuUnits=0;
 for(let day=0;day<=replay.days;day++){
  const frame=replay.ledger[day];
  if(frame?.day!==day||!Array.isArray(frame.pickEvents)
   ||!Array.isArray(frame.shipmentEvents)
   ||!valid(frame.pickedOrders)||!valid(frame.pickedUnits))fail('día de Picking inválido');
  const dayPicks=frame.pickEvents,dayShipments=shipments.filter(s=>s.day===day);
  if(dayPicks.length!==frame.pickedOrders||dayPicks.length>replay.dailyCapacity
   ||dayPicks.length!==dayShipments.length
   ||dayPicks.length!==frame.shipmentEvents.length)fail('preparación sin capacidad o sin expedición vinculada');
  let dayUnits=0;
  for(const p of dayPicks){
   const o=orderById.get(p?.orderId),bom=templates.get(p?.templateId);
   if(!o||!bom||!valid(p.day)||p.day!==day
    ||p.templateId!==o.templateId
    ||!linesMatch(p.lines,bom)||!linesMatch(p.lines,o.lines)
    ||!valid(p.units)||p.units===0||p.units!==sum(Object.values(bom),n=>n)
    ||p.pickId!=='PICK-'+p.orderId||seenPicks.has(p.pickId)
    ||o.pickedDay!==day||o.shippedDay!==day||o.status!=='shipped'){
    fail('pedido preparado con SKU, día o BOM inválido');
   }
   seenPicks.add(p.pickId);dayUnits+=p.units;
   const shipped=dayShipments.filter(s=>s.orderId===p.orderId);
   const event=frame.shipmentEvents.filter(s=>s.orderId===p.orderId);
   if(shipped.length!==1||event.length!==1||seenDispatches.has(p.orderId)
    ||shipped[0].pickId!==p.pickId||event[0].pickId!==p.pickId
    ||shipped[0].day!==day||event[0].day!==day
    ||shipped[0].units!==p.units||event[0].units!==p.units
    ||!linesMatch(shipped[0].lines,p.lines)||!linesMatch(event[0].lines,p.lines)){
    fail('expedición sin preparación confirmada');
   }
   seenDispatches.add(p.orderId);
  }
  if(dayUnits!==frame.pickedUnits||dayUnits!==frame.shippedUnits
   ||dayUnits>(replay.pickingUnitCapacity??Infinity)){
   fail('unidades preparadas exceden capacidad o difieren del despacho');
  }
  pickedOrders+=dayPicks.length;pickedSkuUnits+=dayUnits;
  daily.push({day,pickedOrders:dayPicks.length,pickedSkuUnits:dayUnits,
   shippedOrders:dayShipments.length,awaitingTransportOrders:0,
   capacitySkuUnits:replay.pickingUnitCapacity,
   orders:dayPicks.map(p=>({pickId:p.pickId,orderId:p.orderId,day:p.day,
    templateId:p.templateId,units:p.units,lines:{...p.lines}}))});
 }
 if(seenPicks.size!==shipments.length||seenDispatches.size!==shipments.length
  ||pickedOrders!==replay.completed
  ||pickedSkuUnits!==sum(shipments,s=>s.units)
  ||orders.some(o=>(o.status==='pending')!==(o.pickedDay===null&&o.shippedDay===null))){
  fail('preparaciones y órdenes no concilian con la campaña');
 }
 return freeze({
  scope:'sku-cohort',stage:'same-day-picking-to-dispatch',
  horizonDays:replay.days,daily,
  totals:{pickedOrders,pickedSkuUnits,shippedOrders:shipments.length,
   awaitingTransportOrders:0,pendingUnpickedOrders:orders.length-pickedOrders},
  passed:true,
  boundary:'Cada pedido completo tiene preparación física auditada por mezcla SKU, fecha y capacidad. Por ahora preparación y expedición ocurren el mismo día: no existe staging ni pedidos preparados esperando camión; M3-12 separará Transporte. Despacho no equivale a entrega al cliente.'
 });
}
