import {NODES} from './engine.js';
import {SKU_CATALOG,ORDER_TEMPLATES} from './sku.js';
import {normalizeI2GameState} from './i2-game-state.js';
import {i2AdvancedPhysicalOptions} from './i2-advanced-settings.js';

const NODE=NODES.find(a=>a.id==='picking');
const PREVIOUS='commercial,planning,purchasing,receiving,quality,inventory';
const fail=msg=>{throw new Error('I2-24: '+msg)};
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const freezeDeep=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  Object.values(x).forEach(freezeDeep);Object.freeze(x);
 }
 return x;
};
const SKUS=new Set(SKU_CATALOG.map(s=>s.id));
const typeById=new Map(ORDER_TEMPLATES.map(t=>[t.id,t]));
const formatLines=lines=>Object.entries(lines).map(([id,qty])=>qty+'× SKU '+id).join(' + ');
const unitSum=lines=>Object.values(lines).reduce((n,v)=>n+v,0);
const validateLines=(lines,template)=>{
 if(!lines||typeof lines!=='object'||Array.isArray(lines)
  ||Object.keys(lines).length!==Object.keys(template.lines).length
  ||Object.entries(lines).some(([sku,qty])=>!SKUS.has(sku)||!valid(qty)
   ||qty===0||template.lines[sku]!==qty))
  fail('BOM de pedido distinta del catálogo canónico');
 return true;
};

/** Stable educational facts, never a physical projection or actual campaign result. */
export function i2WhySkuAndDays(){
 return freezeDeep({
  scope:'educational-example',sampleOrders:'No representa los pedidos reales de tu partida',
  horizonDays:12,firstDay:0,
  skus:SKU_CATALOG.map(x=>({skuId:x.id,leadDays:x.leadDays})),
  templates:ORDER_TEMPLATES.map(x=>({
   id:x.id,title:x.name,sharePercent:x.share,
   lines:{...x.lines},unitsPerOrder:unitSum(x.lines),formula:formatLines(x.lines)
  })),
  story:'Cada cliente pide una combinación de productos. Para preparar un pedido completo necesitamos TODAS las unidades de su lista; una caja suelta no equivale a un pedido listo.',
  timing:'La misión observa lo que ocurre desde el día 0 hasta el cierre del día 12. Ese tiempo permite ver atrasos de proveedor, recepción, Calidad, preparación y salida. Una compra que llega el día 13 no rescata pedidos dentro del plazo.',
  consumer:'Cuando falta una pieza del pedido o no hay capacidad, el consumidor puede esperar más. El simulador mide salida del CD, no la entrega real al cliente.',
  label:'Ejemplo didáctico, no datos de demanda futura ni un resultado calculado'
 });
}

/** Honest pre-reveal comparison: known capacity inputs only. */
export function i2PickingCapacityPreview(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='area'||state.index!==6||state.reveal
  ||state.confirmedAreas.slice(0,6).join(',')!==PREVIOUS)
  fail('Picking requiere las seis áreas anteriores confirmadas');
 const option=NODE.choices.find(c=>c.id===state.choices.picking);
 const reference=NODE.choices.find(c=>c.id==='normal');
 if(!option||!reference||!valid(option.lines))fail('opción de Picking inválida');
 const physical=i2AdvancedPhysicalOptions(state.advanced);
 return freezeDeep({
  phase:'pre-reveal',scope:'sku-cohort',status:'capacity-assumption-only',
  option:option.id,nominalSkuUnitsPerDay:option.lines,
  referenceSkuUnitsPerDay:reference.lines,
  deltaSkuUnitsPerDay:option.lines-reference.lines,
  separatePhysicalSkuLimitPerDay:physical.pickingUnitCapacityLimit,
  note:physical.pickingUnitCapacityLimit===null
   ?'Sin tope SKU adicional configurado en esta campaña.'
   :'Además hay un tope físico adicional de '+physical.pickingUnitCapacityLimit+' unidades SKU/día. Es otra restricción, no un multiplicador de productividad.',
  boundaries:'Capacidad prevista en unidades/jornada, NO pedidos completos, productividad por persona-hora ni pedidos reales preparados. Stock, combinaciones de productos y transporte también pueden limitar el resultado.',
  source:'NODES.picking.choices.lines e i2AdvancedPhysicalOptions; motor original eventSimulation'
 });
}

/**
 * Canonical original order and event register after reveal. Never invent a
 * recovery improvement or infer one exclusive bottleneck from pending orders.
 */
export function i2PickingFulfillmentReading(comparison){
 const base=comparison?.base;
 if(!base||base.days!==12||!Array.isArray(base.ordersDetail)
  ||!Array.isArray(base.ledger)||base.ledger.length!==13
  ||!Array.isArray(base.types)||base.types.length!==ORDER_TEMPLATES.length)
  fail('libro original de Picking no disponible');
 const orders=new Map(),picked=new Map(),shipped=new Map();
 for(const o of base.ordersDetail){
  const type=typeById.get(o.templateId);
  if(!type||typeof o.id!=='string'||orders.has(o.id))
   fail('pedido original inválido');
  validateLines(o.lines,type);
  orders.set(o.id,o);
 }
 if(orders.size!==base.orders)fail('cantidad de pedidos original no cuadra');
 const rows=base.ledger.map((d,day)=>{
  if(d.day!==day||!Array.isArray(d.pickEvents)||!Array.isArray(d.shipmentEvents)
   ||!valid(d.pickedOrders)||!valid(d.pickedUnits)
   ||!valid(d.shipped)||!valid(d.shippedUnits)
   ||!valid(d.stagingOrders)||!valid(d.stagingUnits))
   fail('día sin eventos completos');
  let pickUnits=0,shipUnits=0;
  for(const e of d.pickEvents){
   const order=orders.get(e.orderId),type=order&&typeById.get(order.templateId);
   if(!order||picked.has(e.orderId)||e.pickId!=='PICK-'+e.orderId
    ||e.day!==day||order.pickedDay!==day||e.templateId!==order.templateId)
    fail('preparación sin pedido original');
   validateLines(e.lines,type);
   if(e.units!==unitSum(e.lines))fail('líneas de Picking no concilian');
   picked.set(e.orderId,day);pickUnits+=e.units;
  }
  for(const e of d.shipmentEvents){
   const order=orders.get(e.orderId),type=order&&typeById.get(order.templateId);
   if(!order||shipped.has(e.orderId)||!picked.has(e.orderId)
    ||e.pickId!=='PICK-'+e.orderId||e.day!==day
    ||order.fulfilledDay!==day||e.templateId!==order.templateId
    ||picked.get(e.orderId)>day)
    fail('salida sin preparación completa');
   validateLines(e.lines,type);
   if(e.units!==unitSum(e.lines))fail('salida SKU inconsistente');
   shipped.set(e.orderId,day);shipUnits+=e.units;
  }
  if(d.pickedOrders!==d.pickEvents.length||d.pickedUnits!==pickUnits
   ||d.shipped!==d.shipmentEvents.length||d.shippedUnits!==shipUnits
   ||d.stagingOrders!==picked.size-shipped.size)
   fail('totales diarios no concilian');
  const stagingUnits=[...picked.keys()].filter(id=>!shipped.has(id))
   .reduce((n,id)=>n+unitSum(orders.get(id).lines),0);
  if(d.stagingUnits!==stagingUnits)fail('unidades en staging no concilian');
  return {
   day,preparedOrders:d.pickedOrders,
   preparedSkuUnits:pickUnits,
   dispatchedOrders:d.shipped,
   dispatchedSkuUnits:shipUnits,
   preparedNotDispatchedOrders:d.stagingOrders,
   preparedNotDispatchedSkuUnits:d.stagingUnits
  };
 });
 for(const o of orders.values()){
  if(o.pickedDay!==null&&!picked.has(o.id)
   ||o.fulfilledDay!==null&&!shipped.has(o.id)
   ||(o.fulfilledDay!==null&&o.pickedDay===null))
   fail('estado de pedido no concilia con diario');
 }
 const original=base.ordersDetail;
 const byTemplate=ORDER_TEMPLATES.map(type=>{
  const subset=original.filter(o=>o.templateId===type.id);
  return {
   templateId:type.id,title:type.name,
   formula:formatLines(type.lines),
   requested:subset.length,
   prepared:subset.filter(o=>o.pickedDay!==null).length,
   dispatched:subset.filter(o=>o.fulfilledDay!==null).length,
   pending:subset.filter(o=>o.fulfilledDay===null).length
  };
 });
 const totalPrepared=picked.size,totalDispatched=shipped.size;
 if(totalDispatched!==base.completed
  ||totalPrepared+original.filter(o=>o.pickedDay===null).length!==base.orders
  ||totalDispatched+base.pending!==base.orders
  ||byTemplate.reduce((n,r)=>n+r.requested,0)!==base.orders)
  fail('pedidos originales no concilian');
 return freezeDeep({
  phase:'post-reveal',scope:'sku-cohort',horizonDays:12,
  totals:{
   requestedOrders:base.orders,
   preparedOrders:totalPrepared,
   dispatchedOrders:totalDispatched,
   preparedNotDispatchedOrders:totalPrepared-totalDispatched,
   neverPreparedOrders:base.orders-totalPrepared,
   preparedSkuUnits:rows.reduce((n,r)=>n+r.preparedSkuUnits,0),
   dispatchedSkuUnits:rows.reduce((n,r)=>n+r.dispatchedSkuUnits,0)
  },
  rows,byTemplate,
  sampleTemplate:byTemplate.find(x=>x.templateId==='bulk'),
  source:'comparison.base.ordersDetail, ledger.pickEvents, shipmentEvents, stagingOrders de eventSimulation y ORDER_TEMPLATES',
  boundary:'Una unidad SKU no es un pedido: se requiere toda la BOM. Preparado no significa expedido ni entregado. Un pedido no preparado puede tener diversas restricciones anteriores o de capacidad; no se atribuye una causa única sin evidencia. En modo estándar preparación y salida ocurren el mismo día.'
 });
}
