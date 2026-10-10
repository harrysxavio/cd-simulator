import {campaignSnapshot} from './campaign.js';
import {SKU_CATALOG} from './sku.js';
import {SKU_UNIT_CONVENTIONS,skuServiceMeasurements} from './measurements.js';

const sum=(items,fn)=>items.reduce((total,x)=>total+fn(x),0);
const units=n=>Math.round(n).toLocaleString('es-CL');
const frozen=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const nested of Object.values(value))frozen(nested);Object.freeze(value)}
 return value;
};

/**
 * M2/M3 bridge: eight educational management lenses on ONE physical SKU replay.
 * This is a read model: it never reruns demand, generates inventory, or adds
 * the one-shift aggregate flow. Picking and Transport currently commit in
 * the same shipment event; they are NOT separate witnessed operations.
 */
export function campaignAreaReadModel({comparison,campaign=null,campaignId='SKU-LAB',plannedOrders=200}={}){
 const source=campaign??campaignSnapshot({comparison,campaignId,plannedOrders});
 if(!comparison?.recovered?.ledger||source.scope!=='sku-cohort'||source.passed!==true)throw new Error('Campaña SKU sin conciliación de eventos');
 if(source.campaignId!==campaignId||source.plan.plannedOrders!==plannedOrders)throw new Error('Identidad o plan SKU no coincide');
 if(source.demand.actualOrders!==comparison.recovered.orders||source.horizonDays!==comparison.recovered.days)throw new Error('Horizonte o demanda SKU no coincide');
 const orderCount=source.orders.length;
 const originals=source.purchaseOrders.filter(p=>p.source==='original');
 const urgent=source.purchaseOrders.filter(p=>p.source==='urgent');
 const ordered=sum(originals,p=>p.orderedQty);
 const supplierFulfilled=sum(originals,p=>p.supplierFulfilledQty);
 const supplierUnfilled=sum(originals,p=>p.supplierUnfilledQty);
 const newOrdered=sum(urgent,p=>p.orderedQty);
 const received=sum(source.receipts,r=>r.qty);
 const released=sum(source.qualityReleases,r=>r.qty);
 const transferred=sum(source.reserveTransfers,r=>r.qty);
 const shippedOrders=source.shipments.length;
 const shippedSkuUnits=sum(source.shipments,r=>sum(Object.values(r.lines),n=>n));
 // The read model must not invent a second stock opening.
 const openingState=source.openingState;
 const physicalOpening=sum(source.inventory.bySku,s=>s.opening);
 const available=sum(source.inventory.bySku,s=>s.available);
 const heldQuality=sum(source.inventory.bySku,s=>s.held);
 const heldReserve=sum(source.inventory.bySku,s=>s.reserved);
 const pickable=sum(source.inventory.bySku,s=>s.closingPickable);
 const unverified=sum(source.inventory.bySku,s=>s.closingUnverified);
 const waitingReceiving=comparison.recovered.waitingReceiving;
 const waitingQuality=comparison.recovered.waitingQuality;
 const pending=source.orders.filter(o=>o.status==='pending').length;
 const deliveredToCustomer=null; // Shipment at CD != proof of last-mile delivery.
 const forecast=source.plan.forecastOrders;
 const target=Math.max(0,orderCount-forecast);
 const rows=[
  {id:'commercial',title:'Comercial',scope:'plan',headline:units(forecast)+' pedidos previstos',detail:'Se revelaron '+units(orderCount)+' pedidos reales. Desviación frente al pronóstico SKU: '+(orderCount>=forecast?'+':'−')+units(Math.abs(orderCount-forecast))+' pedidos.',input:source.plan.plannedOrders,output:forecast,unit:'pedidos',signal:target>0?'warning':'stable',causal:'El pronóstico influye en la compra inicial; después de revelar demanda no se reescribe.',evidence:['plan.forecastOrders','demand.actualOrders']},
  {id:'planning',title:'Planificación',scope:'plan',headline:units(ordered)+' unidades SKU comprometidas',detail:'Cobertura configurada '+source.plan.planningCoveragePercent+' %. Se conservaron '+units(physicalOpening)+' unidades físicas iniciales en el catálogo (incluida reserva).',input:forecast,output:ordered,unit:'entrada pedidos, salida unidades SKU',signal:pending>0?'warning':'stable',causal:'La planificación convirtió pronóstico, inventario de referencia y cobertura en compras por SKU. No existe equivalencia de 1 pedido = 1 unidad.',evidence:['plan.originalPurchase','inventory.initial']},
  {id:'purchasing',title:'Compras',scope:'purchase-orders',headline:units(supplierFulfilled)+' unidades confirmadas por proveedor original',detail:'Compra original '+units(ordered)+' SKU; incumplidas '+units(supplierUnfilled)+'; compra extraordinaria separada '+units(newOrdered)+' SKU.',input:ordered+newOrdered,output:supplierFulfilled+newOrdered,unit:'unidades SKU de proveedor, no stock de CD',signal:supplierUnfilled>0?'warning':'stable',causal:'Pedido a proveedor y entrega del proveedor son distintos de recepción física y liberación de Calidad.',evidence:['purchaseOrders','receipts']},
  {id:'receiving',title:'Recepción',scope:'receipts',headline:units(received)+' unidades ingresadas al CD',detail:units(waitingReceiving)+' unidades pendientes de procesar en Recepción al cierre. Ingresar no significa estar disponible para Picking.',input:supplierFulfilled+newOrdered,output:received,unit:'unidades SKU',signal:waitingReceiving>0?'warning':'stable',causal:'Solo los eventos de ingreso con ID de orden y lote prueban recepción física; las unidades en tránsito no se contabilizan como recibidas.',evidence:['receipts','dailyEvents']},
  {id:'quality',title:'Calidad',scope:'quality-release',headline:units(released)+' unidades liberadas',detail:units(heldQuality)+' unidades aún retenidas en Calidad al día '+source.horizonDays+'.',input:received,output:released,unit:'unidades SKU',signal:heldQuality>0?'warning':'stable',causal:'La liberación se registra por lote y día; no se confunde una recepción con unidades habilitadas.',evidence:['qualityLots','qualityReleases']},
  {id:'inventory',title:'Inventario',scope:'stock-zones',headline:units(available)+' unidades libres en PICK-FACE',detail:'Stock en RESERVA-CD '+units(heldReserve)+'; retenido Calidad '+units(heldQuality)+'; verificable al cierre '+units(pickable)+'; no verificable '+units(unverified)+'. Traslados '+units(transferred)+' SKU (internos, sin compra).',input:physicalOpening+received,output:available+heldQuality+heldReserve+shippedSkuUnits,unit:'unidades SKU',signal:pending>0&&(heldReserve>0||unverified>0)?'warning':'stable',causal:'Stock inicial + recibido = despachado + libre + reserva + Calidad. Un traslado de reserva cambia la ubicación, no el total físico.',evidence:['inventory.bySku','reserveTransfers','inventoryMovements']},
  {id:'picking',title:'Picking',scope:'coupled-shipment',headline:units(shippedOrders)+' pedidos completos preparados',detail:units(shippedSkuUnits)+' unidades SKU consumidas según BOM; '+units(pending)+' pedidos quedan pendientes.',input:orderCount,output:shippedOrders,unit:'pedidos completos (unidades SKU como consumo)',signal:pending>0?'warning':'stable',causal:'El motor solo confirma un pedido completo cuando tiene toda su mezcla SKU y capacidad de preparación; no existe cola física separada de pedidos preparados.',evidence:['orders','shipments']},
  {id:'transport',title:'Transporte',scope:'coupled-shipment',headline:units(shippedOrders)+' pedidos expedidos del CD',detail:units(shippedSkuUnits)+' unidades SKU; '+units(pending)+' pedidos aún sin despacho. Entregas confirmadas al cliente: sin información.',input:shippedOrders,output:shippedOrders,unit:'pedidos expedidos, no entregas',signal:pending>0?'warning':'stable',causal:'Picking y Transporte comparten el evento de expedición y límites diarios; no se modela staging, carga posterior ni prueba de entrega al cliente.',evidence:['shipments','orders']},
 ];
 // M2-01: these values are typed and tied to the inclusive day-0..close horizon.
 // A complete order count is never a physical SKU unit count.
 const measurements=skuServiceMeasurements({horizonDays:source.horizonDays,actualOrders:orderCount,shippedOrders,pendingOrders:pending,shippedSkuUnits});
 const days=source.inventory.daily.map(day=>{
  const within=source.shipments.filter(s=>s.day===day.day);
  const quantity=sum(within,x=>sum(Object.values(x.lines),n=>n));
  const dispatched=within.length;
  const arrived=sum(source.receipts.filter(r=>r.day===day.day),r=>r.qty);
  const inspected=sum(source.qualityReleases.filter(r=>r.day===day.day),r=>r.qty);
  const moved=sum(source.reserveTransfers.filter(r=>r.day===day.day),r=>r.qty);
  return {day:day.day,receivedSkuUnits:arrived,releasedSkuUnits:inspected,movedReserveSkuUnits:moved,shippedOrders:dispatched,shippedSkuUnits:quantity,
   cumulativeOrders:source.orders.filter(o=>o.shippedDay!==null&&o.shippedDay<=day.day).length,
   remainingOrders:source.orders.filter(o=>o.shippedDay===null||o.shippedDay>day.day).length,
   closingPickFaceSkuUnits:sum(Object.values(day.physical),n=>n),
   closingReserveSkuUnits:sum(Object.values(day.reserved),n=>n)};
 });
 const checks={
  allOrders:orderCount===shippedOrders+pending,
  sumReceipts:received===sum(comparison.recovered.ledger,d=>sum(Object.values(d.received),n=>n)),
  sumQuality:released===sum(comparison.recovered.ledger,d=>sum(Object.values(d.released),n=>n)),
  sameShipmentUnits:shippedSkuUnits===sum(Object.values(comparison.recovered.consumed),n=>n),
  sameShipments:shippedOrders===comparison.recovered.completed,
  physicalConservation:physicalOpening+received===shippedSkuUnits+available+heldQuality+heldReserve,
  stockConfidence:pickable+unverified===available,
  movedReserve:transferred===sum(comparison.recovered.ledger,d=>sum(Object.values(d.movedReserve),n=>n)),
  originalManifest:originals.every(po=>source.plan.originalPurchase[po.skuId]===po.orderedQty),
  sameOpening:!!openingState&&openingState.scope==='sku-cohort'
   &&source.inventory.bySku.every(s=>openingState.openingBySku[s.skuId]===s.opening)
   &&openingState.totals.physicalSkuUnits===physicalOpening,
  finalDay:days.at(-1)?.remainingOrders===pending&&days.at(-1)?.cumulativeOrders===shippedOrders,
  dailyShipments:sum(days,d=>d.shippedOrders)===shippedOrders,
  uniqueAreas:new Set(rows.map(r=>r.id)).size===8,
 };
 if(!Object.values(checks).every(Boolean))throw new Error('Lectura de las ocho áreas no reconcilia con la campaña SKU: '+Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>k).join(', '));
 return frozen({campaignId,scope:'sku-cohort',horizonDays:source.horizonDays,unitConventions:SKU_UNIT_CONVENTIONS,measurements,
  metrics:{plannedOrders:source.plan.plannedOrders,forecastOrders:forecast,actualOrders:orderCount,originalPurchaseSkuUnits:ordered,extraPurchaseSkuUnits:newOrdered,receivedSkuUnits:received,releasedSkuUnits:released,transferSkuUnits:transferred,openingSkuUnits:physicalOpening,closingPickFaceSkuUnits:available,closingReserveSkuUnits:heldReserve,closingQualitySkuUnits:heldQuality,shippedSkuUnits,shippedOrders,pendingOrders:pending,customerDeliveries:deliveredToCustomer},
  openingState,stages:rows,days,checks,passed:true,
  assumptions:'Lectura compartida de UN mismo registro SKU de doce días. Comercial/Planning son decisiones iniciales, no movimientos físicos; Pick y Transporte comparten un único evento de salida del CD. No representa ni se suma a las unidades económicas del motor agregado de una jornada ni implica entrega al cliente.'});
}
