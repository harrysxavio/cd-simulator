import {NODES} from './engine.js';
import {SKU_CATALOG,ORDER_TEMPLATES} from './sku.js';
import {normalizeI2GameState} from './i2-game-state.js';

const PICKING=NODES.find(area=>area.id==='picking');
const SKU_IDS=SKU_CATALOG.map(s=>s.id);
const VALID_TEMPLATES=new Map(ORDER_TEMPLATES.map(t=>[t.id,t]));
const fail=msg=>{throw new Error('I2-24: '+msg)};
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const count=(arr,k)=>arr.reduce((n,x)=>n+x[k],0);
const freeze=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  Object.values(x).forEach(freeze);Object.freeze(x);
 }
 return x;
};
const sumLines=lines=>Object.values(lines).reduce((n,k)=>n+k,0);
function checkLines(lines,template){
 if(!lines||typeof lines!=='object'||Array.isArray(lines)||
  Object.keys(lines).length!==Object.keys(template.lines).length||
  Object.keys(lines).some(id=>!SKU_IDS.includes(id)||!valid(lines[id])||
   lines[id]!==template.lines[id]))
  fail('pedido no conserva su lista de productos BOM');
}
/**
 * A teaching-only preview. A template is a model input, not a future observed
 * order. The chosen capacity is from the LEGACY aggregate planning control and
 * is not mislabeled as physical SKU capacity for this campaign.
 */
export function i2PickingBOMPreview(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='area'||state.index!==6||state.reveal||
  state.confirmedAreas.slice(0,6).join(',')!==
   'commercial,planning,purchasing,receiving,quality,inventory')
  fail('Picking requiere seis áreas previas confirmadas');
 const selected=PICKING.choices.find(c=>c.id===state.choices.picking);
 const normal=PICKING.choices.find(c=>c.id==='normal');
 if(!selected||!normal||!valid(selected.lines)||selected.lines===0)
  fail('opción de Picking inválida');
 return freeze({
  phase:'pre-reveal',scope:'illustrative-bom',
  option:selected.id,nominalShiftUnitCapacity:selected.lines,
  referenceShiftUnitCapacity:normal.lines,
  nominalShiftDelta:selected.lines-normal.lines,
  horizonDays:12,skuCount:SKU_CATALOG.length,
  templateExamples:ORDER_TEMPLATES.map(t=>({
   id:t.id,name:t.name,lines:{...t.lines},unitsPerCompleteOrder:sumLines(t.lines)
  })),
  skuLeadDays:SKU_CATALOG.map(s=>({id:s.id,leadDays:s.leadDays})),
  example:'Pedido combinado: una unidad de A y otra de B. Aunque exista A, el pedido no queda completo mientras falte B.',
  explanation:'Los tres SKU pueden llegar en días diferentes; la campaña observa del día 0 al 12 para que importen el abastecimiento, las esperas y el día en que se prepara cada pedido.',
  question:'¿De qué sirve reforzar Picking si todavía faltan productos por recibir, liberar o localizar?',
  boundary:'Las capacidades de la tarjeta son referencias nominales de jornada agregada de V1, NO productividad por persona-hora ni resultado físico SKU. Los ejemplos no revelan pedidos reales futuros.',
  source:'NODES.picking.choices.lines y ORDER_TEMPLATES/SKU_CATALOG de V1. Sin ejecutar evento físico.'
 });
}

/** Strict read-only auditor of real picking versus real shipping events.
 * A prepared order is only shipped if its own shipment event exists. */
export function i2PickingBOMOutcome(comparison){
 const r=comparison?.base;
 if(!r||r.days!==12||!Array.isArray(r.ledger)||r.ledger.length!==13
  ||!Array.isArray(r.ordersDetail)||r.ordersDetail.length!==r.orders||
  !valid(r.dailyCapacity)||r.dailyCapacity===0&&r.orders===0)
  fail('libro físico original incompatible');
 const details=new Map(r.ordersDetail.map(o=>[o.id,o]));
 if(details.size!==r.ordersDetail.length)fail('pedidos duplicados');
 for(const o of details.values()){
  const t=VALID_TEMPLATES.get(o.templateId);
  if(!t||!/^ORD-[0-9]{6}$/.test(o.id))fail('pedido o plantilla desconocidos');
  checkLines(o.lines,t);
  for(const d of [o.pickedDay,o.fulfilledDay])if(d!==null&&!valid(d))
   fail('fecha de pedido inválida');
  if(o.fulfilledDay!==null&&(o.pickedDay===null||o.fulfilledDay<o.pickedDay))
   fail('pedido expedido sin preparación');
 }
 const picked=new Set(),shipped=new Set();
 const byTemplate=Object.fromEntries(ORDER_TEMPLATES.map(t=>[t.id,{
  templateId:t.id,name:t.name,lines:{...t.lines},
  requestedOrders:0,preparedOrders:0,shippedOrders:0,
  unitsPerOrder:sumLines(t.lines)
 }]));
 const bySku=Object.fromEntries(SKU_IDS.map(id=>[id,{
  skuId:id,preparedSkuUnits:0,shippedSkuUnits:0
 }]));
 for(const order of details.values())byTemplate[order.templateId].requestedOrders++;
 const rows=[];
 for(const [day,entry] of r.ledger.entries()){
  if(entry.day!==day||!Array.isArray(entry.pickEvents)||!Array.isArray(entry.shipmentEvents)
   ||!valid(entry.pickedOrders)||!valid(entry.pickedUnits)
   ||!valid(entry.shipped)||!valid(entry.shippedUnits)
   ||!valid(entry.stagingOrders)||!valid(entry.stagingUnits))
   fail('eventos diarios faltantes o corruptos');
  let preparedUnits=0,expeditedUnits=0;
  for(const e of entry.pickEvents){
   const order=details.get(e.orderId);
   if(!order||picked.has(e.orderId)||e.day!==day
    ||e.pickId!=='PICK-'+e.orderId
    ||e.templateId!==order.templateId||order.pickedDay!==day
    ||!valid(e.units)||e.units<1)
    fail('preparación falsa, duplicada o sin orden');
   checkLines(e.lines,VALID_TEMPLATES.get(order.templateId));
   if(e.units!==sumLines(e.lines))fail('unidades del BOM preparado no concilian');
   picked.add(order.id);preparedUnits+=e.units;
   byTemplate[order.templateId].preparedOrders++;
   for(const [id,qty] of Object.entries(e.lines))bySku[id].preparedSkuUnits+=qty;
  }
  for(const e of entry.shipmentEvents){
   const order=details.get(e.orderId);
   if(!order||!picked.has(e.orderId)||shipped.has(e.orderId)
    ||e.day!==day||e.pickId!=='PICK-'+e.orderId
    ||e.templateId!==order.templateId||order.fulfilledDay!==day
    ||!valid(e.units)||e.units<1)
    fail('expedición sin orden completa ya preparada');
   checkLines(e.lines,VALID_TEMPLATES.get(order.templateId));
   if(e.units!==sumLines(e.lines))fail('unidades expedidas no coinciden con BOM');
   shipped.add(order.id);expeditedUnits+=e.units;
   byTemplate[order.templateId].shippedOrders++;
   for(const [id,qty] of Object.entries(e.lines))bySku[id].shippedSkuUnits+=qty;
  }
  if(entry.pickedOrders!==entry.pickEvents.length||entry.pickedUnits!==preparedUnits||
    entry.shipped!==entry.shipmentEvents.length||entry.shippedUnits!==expeditedUnits||
    entry.pickedOrders>r.dailyCapacity||entry.shipped>r.dailyCapacity||
    (r.pickingUnitCapacity!==null&&preparedUnits>r.pickingUnitCapacity)||
    (r.transportUnitCapacity!==null&&expeditedUnits>r.transportUnitCapacity))
   fail('volumen diario/capacidad de órdenes SKU incompatible');
  const stagedOrders=picked.size-shipped.size;
  const stagedSkuUnits=SKU_IDS.reduce((n,id)=>n+
   bySku[id].preparedSkuUnits-bySku[id].shippedSkuUnits,0);
  if(stagedOrders!==entry.stagingOrders||stagedSkuUnits!==entry.stagingUnits)
   fail('staging físico no concilia con preparación y salida');
  if(!r.separateTransport&&(stagedOrders!==0||stagedSkuUnits!==0))
   fail('el modo acoplado no puede contener staging');
  rows.push({
   day,preparedOrders:entry.pickedOrders,preparedSkuUnits:preparedUnits,
   shippedOrders:entry.shipped,shippedSkuUnits:expeditedUnits,
   awaitingDispatchOrders:stagedOrders,
   awaitingDispatchSkuUnits:stagedSkuUnits,
   remainingUnpreparedOrders:r.orders-picked.size
  });
 }
 for(const o of details.values()){
  if((o.pickedDay!==null)!==picked.has(o.id)||
   (o.fulfilledDay!==null)!==shipped.has(o.id))
   fail('fecha de pedido no coincide con bitácora física');
 }
 const preparedOrders=picked.size,shippedOrders=shipped.size;
 if(shippedOrders!==r.completed||r.pending!==r.orders-shippedOrders
  ||preparedOrders<shippedOrders)
  fail('el cierre de pedidos no concilia con el libro original');
 return freeze({
  phase:'post-reveal',scope:'sku-cohort',horizonDays:r.days,
  separateTransport:r.separateTransport,
  pickingUnitCapacitySkuPerDay:r.pickingUnitCapacity,
  orderCapacityPerDay:r.dailyCapacity,
  totals:{
   requestedOrders:r.orders,preparedOrders,shippedOrders,
   unpreparedOrders:r.orders-preparedOrders,
   awaitingDispatchOrders:preparedOrders-shippedOrders,
   pendingOrders:r.orders-shippedOrders,
   preparedSkuUnits:count(Object.values(bySku),'preparedSkuUnits'),
   shippedSkuUnits:count(Object.values(bySku),'shippedSkuUnits'),
   peakStagedOrders:Math.max(...rows.map(d=>d.awaitingDispatchOrders))
  },
  rows,byTemplate:Object.values(byTemplate),bySku:Object.values(bySku),
  source:'comparison.base.ledger.pickEvents/shipmentEvents y ordersDetail del mismo replay original; ORDER_TEMPLATES de V1.',
  boundary:'Un pedido requiere TODOS los SKU de su BOM. Preparado no significa expedido ni entregado al cliente. En el modo actual acoplado Picking y expedición son el mismo día; staging solo aparece en replay segregado. Los faltantes no se atribuyen a una causa única sin diagnóstico del resto de áreas.'
 });
}
