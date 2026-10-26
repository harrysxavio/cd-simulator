import {NODES} from './engine.js';
import {normalizeI2GameState} from './i2-game-state.js';
import {i2PickingFulfillmentReading} from './i2-picking-bom.js';

const AREA=NODES.find(node=>node.id==='transport');
const BEFORE='commercial,planning,purchasing,receiving,quality,inventory,picking';
const fail=reason=>{throw new Error('I2-25: '+reason)};
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const freezeDeep=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(freezeDeep);
  Object.freeze(value);
 }
 return value;
};

/**
 * Before demand reveal, show ONLY the selected, published transport capacity.
 * No actual orders, supplier arrivals or simulated shipments are accessible.
 */
export function i2TransportCapacityPreview(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='area'||state.index!==7||state.reveal
  ||state.confirmedAreas.slice(0,7).join(',')!==BEFORE)
  fail('Transporte requiere siete decisiones previas confirmadas');
 const selected=AREA.choices.find(c=>c.id===state.choices.transport);
 const normal=AREA.choices.find(c=>c.id==='normal');
 if(!selected||!normal||!valid(selected.capacity)||!valid(normal.capacity))
  fail('elección de Transporte inválida');
 return freezeDeep({
  phase:'pre-reveal',scope:'sku-cohort',horizonDays:12,
  status:'capacity-assumption-only',choice:selected.id,
  nominalDispatchSkuUnitsPerDay:selected.capacity,
  referenceDispatchSkuUnitsPerDay:normal.capacity,
  deltaDispatchSkuUnitsPerDay:selected.capacity-normal.capacity,
  example:'Ejemplo: con capacidad de 500 SKU por jornada, 200 pedidos de 3 SKU cada uno requieren 600 unidades y no todos podrán salir ese día, incluso si están preparados.',
  caution:'Capacidad de salida en SKU/jornada, no cantidad de pedidos, entregas al cliente, ocupación real de camiones ni productividad por persona-hora.',
  context:'Si falta un SKU o Picking no completó el pedido, agregar rutas no resuelve por sí solo el cuello de botella. Una ruta más cara puede no aumentar los pedidos expedidos.',
  source:'NODES.transport.choices.capacity; campaignSkuContract.skuAreaCapacity.transportUnitCapacity'
 });
}

/**
 * Audit real dispatch events against the unchanged V1 baseline.
 * Picking's strict reconciliation proves the physical linkage from full BOM
 * preparation to each shipment. These are not results of the recovery choice.
 */
export function i2TransportDispatchReading(comparison){
 const base=comparison?.base;
 if(!base||base.days!==12||!Array.isArray(base.ledger)
  ||base.ledger.length!==13||!Array.isArray(base.ordersDetail))
  fail('libro original de transporte no disponible');
 // Reuse the existing Picking auditor; do not duplicate an events engine.
 const picking=i2PickingFulfillmentReading(comparison);
 const cap=base.transportUnitCapacity;
 if(cap!==null&&(!valid(cap)||cap>100000))
  fail('capacidad física de expedición inválida');
 if(!valid(base.dailyCapacity))fail('capacidad diaria de pedidos inválida');
 let cumulativeOrders=0,cumulativeSkuUnits=0;
 const rows=base.ledger.map((day,index)=>{
  if(day.day!==index||!valid(day.shipped)||!valid(day.shippedUnits)
   ||!valid(day.completed)||!valid(day.backlog)
   ||!valid(day.stagingOrders)||!valid(day.stagingUnits)
   ||!Array.isArray(day.shipmentEvents))
   fail('registro de jornada inválido');
  const skuUnits=day.shipmentEvents.reduce((n,event)=>n+event.units,0);
  if(day.shipped!==day.shipmentEvents.length||day.shippedUnits!==skuUnits
   ||day.shipped>base.dailyCapacity
   ||cap!==null&&skuUnits>cap)
   fail('expediciones superan capacidad o carecen de eventos válidos');
  cumulativeOrders+=day.shipped;cumulativeSkuUnits+=skuUnits;
  if(day.completed!==cumulativeOrders||day.backlog!==base.orders-cumulativeOrders)
   fail('pendientes no concilian con expediciones');
  if(day.stagingOrders!==picking.rows[index].preparedNotDispatchedOrders
   ||day.stagingUnits!==picking.rows[index].preparedNotDispatchedSkuUnits)
   fail('staging no concilia con preparación física');
  return {
   day:index,dispatchedOrders:day.shipped,
   dispatchedSkuUnits:skuUnits,cumulativeDispatchedOrders:cumulativeOrders,
   pendingOrders:day.backlog,preparedAwaitingDispatchOrders:day.stagingOrders,
   preparedAwaitingDispatchSkuUnits:day.stagingUnits,
   capacitySkuUnitsPerDay:cap,
   dispatchCapacityUsedPercent:cap>0?100*skuUnits/cap:null
  };
 });
 const last=rows.at(-1);
 if(last.cumulativeDispatchedOrders!==base.completed||last.pendingOrders!==base.pending
  ||cumulativeOrders!==picking.totals.dispatchedOrders
  ||cumulativeSkuUnits!==picking.totals.dispatchedSkuUnits
  ||last.preparedAwaitingDispatchOrders!==picking.totals.preparedNotDispatchedOrders
  ||base.completed+base.pending!==base.orders
  ||base.pending!==base.orders-picking.totals.dispatchedOrders)
  fail('cierre sin conciliación con pedido, Picking y staging');
 const availableSkuUnits=cap===null?null:cap*rows.length;
 return freezeDeep({
  phase:'post-reveal',scope:'sku-cohort',horizonDays:12,
  mode:base.separateTransport?'transport-separated-staging':'same-day-pick-and-dispatch',
  capacitySkuUnitsPerDay:cap,
  totals:{
   requestedOrders:base.orders,
   dispatchedOrders:base.completed,
   pendingOrders:base.pending,
   preparedAwaitingDispatchOrders:last.preparedAwaitingDispatchOrders,
   neverPreparedOrders:picking.totals.neverPreparedOrders,
   dispatchedSkuUnits:cumulativeSkuUnits,
   peakStagingOrders:Math.max(...rows.map(r=>r.preparedAwaitingDispatchOrders)),
   daysWithDispatch:rows.filter(r=>r.dispatchedOrders>0).length,
   nominalCapacitySkuUnitsAcrossDays:availableSkuUnits,
   nominalCapacityUsedPercent:availableSkuUnits>0
    ?100*cumulativeSkuUnits/availableSkuUnits:null
  },
  rows,
  source:'comparison.base.ledger.shipmentEvents, shippedUnits, completed, backlog y staging; auditor de i2PickingFulfillmentReading',
  boundary:'Datos del plan original SIN recuperación. Expedidos del CD no equivale a entregados al consumidor. Pedidos pendientes incluyen no preparados y preparados en staging, sin atribuirles automáticamente una causa. En el modo estándar, preparación y salida son simultáneas; no inferir una cola de camiones que no existe. La utilización representa solo capacidad nominal de SKU por jornada, no flota, horas-persona ni costos de transporte.'
 });
}
