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
 const supplierLedger=source.supplierLedger;
 const receivingLedger=source.receivingLedger;
 const qualityLedger=source.qualityLedger;
 const inventoryLedger=source.inventoryLedger;
 if(!inventoryLedger?.passed||inventoryLedger.scope!=='sku-cohort'
  ||inventoryLedger.horizonDays!==source.horizonDays){
  throw new Error('Inventario no comparte la campaña física SKU');
 }
 if(!qualityLedger?.passed||qualityLedger.scope!=='sku-cohort'
  ||qualityLedger.horizonDays!==source.horizonDays
  ||qualityLedger.totals.closingHeldSkuUnits!==comparison.recovered.waitingQuality){
  throw new Error('Calidad no coincide con los lotes físicos de la campaña');
 }
 if(!receivingLedger?.passed||receivingLedger.scope!=='sku-cohort'
  ||receivingLedger.horizonDays!==source.horizonDays
  ||receivingLedger.totals.closingWaitingSkuUnits!==comparison.recovered.waitingReceiving){
  throw new Error('Recepción física no coincide con la misma cohorte SKU');
 }
 if(!supplierLedger?.passed||supplierLedger.scope!=='sku-cohort'||supplierLedger.horizonDays!==source.horizonDays){
  throw new Error('Compras carece de conciliación física de proveedor y Recepción');
 }
 const originals=source.purchaseOrders.filter(p=>p.source==='original');
 const urgent=source.purchaseOrders.filter(p=>p.source==='urgent');
 const ordered=sum(originals,p=>p.orderedQty);
 const supplierFulfilled=sum(originals,p=>p.supplierFulfilledQty);
 const supplierUnfilled=sum(originals,p=>p.supplierUnfilledQty);
 const supplierTotals=supplierLedger.totals;
 const fill=supplierLedger.originalSupplierFillPercent===null?'sin compra original':supplierLedger.originalSupplierFillPercent.toFixed(1).replace('.',',')+' %';
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
 const waitingReceiving=receivingLedger.totals.closingWaitingSkuUnits;
 const receivingDailyCapacity=receivingLedger.capacitySkuUnitsPerDay===null
  ?'sin tope diario':units(receivingLedger.capacitySkuUnitsPerDay)+' SKU/día';
 const waitingQuality=comparison.recovered.waitingQuality;
 const pending=source.orders.filter(o=>o.status==='pending').length;
 const deliveredToCustomer=null; // Shipment at CD != proof of last-mile delivery.
 // Both management areas explain one pre-shock commercial/planning read-model.
 const planning=source.plan.commercialPlanning;
 if(!planning||planning.scope!=='sku-cohort'||planning.actualOrders!==orderCount
  ||planning.plannedOrders!==plannedOrders||planning.totalCommittedSkuUnits!==ordered
  ||planning.forecastOrders!==source.plan.forecastOrders
  ||planning.rows.some(row=>source.plan.originalPurchase[row.skuId]!==row.committedSkuUnits)){
  throw new Error('Comercial y Planning no concilian con el libro SKU');
 }
 const forecast=planning.forecastOrders;
 const target=Math.max(0,planning.varianceVsForecastOrders);
 const rows=[
  {id:'commercial',title:'Comercial',scope:'plan',headline:units(forecast)+' pedidos previstos',detail:'Se revelaron '+units(planning.actualOrders)+' pedidos reales. Diferencia vs. pronóstico: '+(planning.varianceVsForecastOrders>=0?'+':'−')+units(Math.abs(planning.varianceVsForecastOrders))+' pedidos.',input:planning.plannedOrders,output:forecast,unit:'pedidos completos',signal:target>0?'warning':'stable',causal:'El pronóstico SKU se fija antes de observar la demanda. Si la demanda resulta mayor, la compra inicial no se reescribe: una nueva compra debe ser una decisión separada.',evidence:['plan.commercialPlanning.forecastOrders','plan.commercialPlanning.varianceVsForecastOrders']},
  {id:'planning',title:'Planificación',scope:'plan',headline:units(planning.totalCommittedSkuUnits)+' unidades SKU comprometidas',detail:'Se configuró '+planning.planningCoveragePercent+' % de cobertura. Las compras se calcularon con '+units(forecast)+' pedidos previstos y '+units(physicalOpening)+' unidades SKU de stock inicial, sin añadir reserva como nueva existencia.',input:forecast,output:ordered,unit:'entrada pedidos; salida unidades SKU',signal:pending>0?'warning':'stable',causal:'La planificación usa la mezcla de productos de los pedidos, el inventario inicial y la cobertura elegida. Un pedido completo puede contener varias unidades SKU.',evidence:['plan.commercialPlanning.rows','plan.originalPurchaseOrders','inventory.initial']},
  {id:'purchasing',title:'Compras',scope:'purchase-orders',headline:units(ordered)+' unidades SKU pedidas originalmente',detail:'Cumplimiento de proveedor '+fill+'; no suministradas '+units(supplierUnfilled)+' SKU. Con fecha de llegada modelada fuera del período '+units(supplierTotals.inTransitSkuUnits)+' SKU; en cola de Recepción '+units(supplierTotals.awaitingWarehouseReceiptSkuUnits)+' SKU; ya ingresadas al CD '+units(supplierTotals.warehouseReceivedSkuUnits)+' SKU. compra extraordinaria urgente '+units(newOrdered)+' SKU.',input:ordered+newOrdered,output:supplierTotals.arrivedByCutoffSkuUnits,unit:'unidades SKU; llegada modelada no significa ingreso a bodega',signal:supplierUnfilled>0||supplierTotals.inTransitSkuUnits>0||supplierTotals.awaitingWarehouseReceiptSkuUnits>0?'warning':'stable',causal:'Comprar, cumplir la orden, llegar al muelle e ingresar en bodega son etapas diferentes. El plazo extra del proveedor no adelanta recepciones y las compras urgentes se registran por separado.',evidence:['supplierLedger.rows','supplierLedger.totals','receipts']},
  {id:'receiving',title:'Recepción',scope:'receipts',headline:units(received)+' unidades ingresadas al CD',detail:units(waitingReceiving)+' unidades en cola del muelle al cierre. Capacidad '+receivingDailyCapacity+'; máxima cola '+units(receivingLedger.totals.peakWaitingSkuUnits)+' SKU; mayor espera '+units(receivingLedger.totals.oldestWaitingDays)+' días. La mercadería todavía en tránsito no está en bodega.',input:supplierTotals.arrivedByCutoffSkuUnits,output:received,unit:'unidades SKU por lote y día',signal:waitingReceiving>0?'warning':'stable',causal:'La cola se procesa por orden de llegada y dentro de la capacidad diaria. Un evento de recepción documenta el ingreso al CD; Calidad decide después cuándo puede prepararse.',evidence:['receivingLedger.daily','receipts','supplierLedger.rows']},
  {id:'quality',title:'Calidad',scope:'quality-release',headline:units(released)+' unidades liberadas',detail:units(heldQuality)+' unidades aún retenidas en Calidad al día '+source.horizonDays+'. Liberación diaria '+qualityLedger.releaseRatePercentPerDay+' % del stock en control; '+units(qualityLedger.totals.lotsStillHeld)+' lotes con saldo. Esta espera no es merma ni rechazo.',input:received,output:released,unit:'unidades SKU por lote y día',signal:heldQuality>0?'warning':'stable',causal:'Cada lote llega desde Recepción y permanece retenido hasta su liberación fechada. Solo tras esa liberación puede entrar al stock disponible, que Inventario vuelve a verificar antes de Picking.',evidence:['qualityLedger.daily','qualityLedger.lots','qualityReleases']},
  {id:'inventory',title:'Inventario',scope:'stock-zones',headline:units(available)+' unidades SKU en PICK-FACE',detail:'En RESERVA-CD '+units(heldReserve)+'; retenidas en Calidad '+units(heldQuality)+'; verificables '+units(pickable)+'; sin verificar '+units(unverified)+' (también existen físicamente). Traslados internos '+units(transferred)+' SKU. El stock se concilia por SKU y día.',input:physicalOpening+received,output:available+heldQuality+heldReserve+shippedSkuUnits,unit:'unidades SKU físicas, no pedidos',signal:pending>0&&(heldReserve>0||unverified>0)?'warning':'stable',causal:'Apertura + recepción = expedición + PICK-FACE + RESERVA-CD + Calidad. Una diferencia de verificación restringe Picking pero no desaparecen unidades; mover reserva cambia ubicación, no stock total.',evidence:['inventoryLedger.daily','inventoryLedger.totals','inventoryMovements']},
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
  const receivedThisDay=receivingLedger.daily[day.day];
  const arrived=sum(source.receipts.filter(r=>r.day===day.day),r=>r.qty);
  const qualityDay=qualityLedger.daily[day.day];
  const stockDay=inventoryLedger.daily[day.day];
  const inspected=sum(source.qualityReleases.filter(r=>r.day===day.day),r=>r.qty);
  const moved=sum(source.reserveTransfers.filter(r=>r.day===day.day),r=>r.qty);
  return {day:day.day,receivedSkuUnits:arrived,dockArrivedSkuUnits:receivedThisDay.arrivedSkuUnits,receivingQueueSkuUnits:receivedThisDay.waitingSkuUnits,receivingLots:receivedThisDay.receivedLots,releasedSkuUnits:inspected,qualityHeldSkuUnits:qualityDay.heldSkuUnits,qualityReleaseEvents:qualityDay.releaseEvents,movedReserveSkuUnits:moved,shippedOrders:dispatched,shippedSkuUnits:quantity,
   cumulativeOrders:source.orders.filter(o=>o.shippedDay!==null&&o.shippedDay<=day.day).length,
   remainingOrders:source.orders.filter(o=>o.shippedDay===null||o.shippedDay>day.day).length,
   closingPhysicalSkuUnits:stockDay.physicalSkuUnits,closingVerifiedSkuUnits:stockDay.verifiedSkuUnits,closingUnverifiedSkuUnits:stockDay.unverifiedSkuUnits,
   closingPickFaceSkuUnits:sum(Object.values(day.physical),n=>n),
   closingReserveSkuUnits:sum(Object.values(day.reserved),n=>n)};
 });
 const checks={
  allOrders:orderCount===shippedOrders+pending,
  sumReceipts:received===sum(comparison.recovered.ledger,d=>sum(Object.values(d.received),n=>n)),
  sumQuality:released===sum(comparison.recovered.ledger,d=>sum(Object.values(d.released),n=>n)),
  sameShipmentUnits:shippedSkuUnits===sum(Object.values(comparison.recovered.consumed),n=>n),
  sameShipments:shippedOrders===comparison.recovered.completed,
  inventoryReconciliation:inventoryLedger.passed
   &&inventoryLedger.totals.openingSkuUnits===physicalOpening
   &&inventoryLedger.totals.receivedSkuUnits===received
   &&inventoryLedger.totals.shippedSkuUnits===shippedSkuUnits
   &&inventoryLedger.totals.pickFaceSkuUnits===available
   &&inventoryLedger.totals.reserveSkuUnits===heldReserve
   &&inventoryLedger.totals.qualityHeldSkuUnits===heldQuality
   &&inventoryLedger.totals.verifiedSkuUnits===pickable
   &&inventoryLedger.totals.unverifiedSkuUnits===unverified,
  physicalConservation:physicalOpening+received===shippedSkuUnits+available+heldQuality+heldReserve,
  stockConfidence:pickable+unverified===available,
  movedReserve:transferred===sum(comparison.recovered.ledger,d=>sum(Object.values(d.movedReserve),n=>n)),
  originalManifest:originals.every(po=>source.plan.originalPurchase[po.skuId]===po.orderedQty),
  qualityReconciliation:qualityLedger.passed&&qualityLedger.totals.receivedSkuUnits===received
   &&qualityLedger.totals.releasedSkuUnits===released
   &&qualityLedger.totals.closingHeldSkuUnits===heldQuality
   &&qualityLedger.daily.every(d=>d.receivedSkuUnits>=0&&d.heldSkuUnits>=0),
  receivingReconciliation:receivingLedger.passed&&receivingLedger.totals.receivedSkuUnits===received
   &&receivingLedger.totals.closingWaitingSkuUnits===waitingReceiving
   &&receivingLedger.daily.every(d=>d.receivedSkuUnits<= (d.capacitySkuUnits??Infinity)),
  supplierReconciliation:supplierTotals.originalOrderedSkuUnits===ordered
   &&supplierTotals.originalFulfilledSkuUnits===supplierFulfilled
   &&supplierTotals.originalShortfallSkuUnits===supplierUnfilled
   &&supplierTotals.urgentOrderedSkuUnits===newOrdered
   &&supplierTotals.warehouseReceivedSkuUnits===received
   &&supplierTotals.awaitingWarehouseReceiptSkuUnits===waitingReceiving,
  commercialPlanning:planning.forecastOrders===forecast
   &&planning.varianceVsForecastOrders===orderCount-forecast
   &&planning.totalCommittedSkuUnits===ordered
   &&planning.rows.every(row=>originals.some(po=>po.id===row.purchaseOrderId&&po.orderedQty===row.committedSkuUnits)),
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
  openingState,commercialPlanning:planning,supplierLedger,receivingLedger,qualityLedger,inventoryLedger,stages:rows,days,checks,passed:true,
  assumptions:'Lectura compartida de UN mismo registro SKU de doce días. Comercial/Planning son decisiones iniciales, no movimientos físicos; Pick y Transporte comparten un único evento de salida del CD. No representa ni se suma a las unidades económicas del motor agregado de una jornada ni implica entrega al cliente.'});
}
