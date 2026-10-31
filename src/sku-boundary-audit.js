/**
 * M3-13b: audit the ONE-WAY decision adapter, not the SKU movements.
 *
 * The aggregate flow is a one-shift teaching model. Its managerial rates and
 * capacity settings are *hypotheses* applied to an independent SKU order sample;
 * they are not observed SKU inventory, measured throughput, or money.
 *
 * An unexpected aggregate result must NEVER be represented as a physical
 * receipt, dispatch, stock opening or customer delivery in this boundary.
 */
import {SKU_CATALOG} from './sku.js';
import {normalizeOperationalEvents} from './operational-event-schedule.js';

const freezeDeep=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const nested of Object.values(value))freezeDeep(nested);
  Object.freeze(value);
 }
 return value;
};
const fail=reason=>{throw new Error('Contrato agregado/SKU: '+reason)};
const validInteger=n=>Number.isSafeInteger(n)&&n>=0;

/**
 * Inspect the exact inputs passed to SKU simulation. This is a pure,
 * read-only verification: it never calls either simulation engine.
 */
export function auditSkuDecisionBoundary({area,skuInputs,openingState,plannedSampleOrders,
 commercialForecast,planningCoverage,supplierRate,skuAreaCapacity}={}){
 if(!area||!skuInputs||!openingState||!skuAreaCapacity
  ||!validInteger(area.plannedDemand)||area.plannedDemand===0
  ||!validInteger(area.demand)||area.demand===0
  ||!validInteger(plannedSampleOrders)||plannedSampleOrders===0
  ||!validInteger(skuInputs.actualOrders)||skuInputs.actualOrders===0
  ||!Array.isArray(area.stages)||area.stages.length!==8)fail('faltan datos o períodos válidos');

 // A proportion of aggregate demand sizes a SAMPLE of complete orders.
 // It cannot convert equivalent shift units directly into physical SKU units.
 const expectedOrders=Math.max(1,Math.round(plannedSampleOrders*area.demand/area.plannedDemand));
 if(!Number.isSafeInteger(expectedOrders)||expectedOrders>100000
  ||skuInputs.plannedOrders!==plannedSampleOrders
  ||skuInputs.actualOrders!==expectedOrders)fail('muestra de pedidos incompatible con la demanda');

 const ids=SKU_CATALOG.map(x=>x.id);
 const sameIds=x=>x&&typeof x==='object'&&!Array.isArray(x)
  &&Object.keys(x).length===ids.length&&ids.every(id=>Object.hasOwn(x,id));
 if(!sameIds(skuInputs.stock)||!sameIds(openingState.openingBySku)
  ||ids.some(id=>!validInteger(skuInputs.stock[id])
   ||skuInputs.stock[id]!==openingState.openingBySku[id]))fail('stock SKU no procede exclusivamente de apertura física');
 if(!sameIds(skuInputs.supplierFill)
  ||ids.some(id=>!Number.isFinite(skuInputs.supplierFill[id])
   ||skuInputs.supplierFill[id]!==supplierRate))fail('cumplimiento de proveedor no coincide con proxy declarado');

 const names=['plannedForecastPercent','planningCoveragePercent','qualityReleasePercent',
  'inventoryAccuracyPercent','receivingUnitCapacity','pickingUnitCapacity','transportUnitCapacity'];
 if(names.some(key=>!Number.isFinite(skuInputs[key])||skuInputs[key]!==skuAreaCapacity[key])
  ||skuInputs.plannedForecastPercent!==commercialForecast
  ||skuInputs.planningCoveragePercent!==planningCoverage
  ||skuInputs.receivingUnitCapacity!==area.receivingCapacity
  ||skuInputs.pickingUnitCapacity!==Math.min(area.pickingCapacity,
    skuInputs.pickingUnitCapacityLimit??Infinity)
  ||skuInputs.transportUnitCapacity!==area.stages[7].capacity)fail('capacidad o tasa no se corresponde con la decisión');
 for(const name of ['receivingUnitCapacity','pickingUnitCapacity','transportUnitCapacity']){
  if(!validInteger(skuInputs[name]))fail('capacidad diaria SKU inválida');
 }
 for(const name of ['plannedForecastPercent','planningCoveragePercent','qualityReleasePercent','inventoryAccuracyPercent']){
  if(skuInputs[name]<0||skuInputs[name]>200)fail('tasa de gestión fuera de rango');
 }
 if(Object.hasOwn(skuInputs,'pickingUnitCapacityLimit')
  &&(!Number.isSafeInteger(skuInputs.pickingUnitCapacityLimit)
    ||skuInputs.pickingUnitCapacityLimit<1||skuInputs.pickingUnitCapacityLimit>100000))
  fail('límite SKU Picking inválido');
 // Whitelist: do not accidentally pass aggregate output, costs or reserves.
 // El único importe permitido es la tarifa didáctica de refuerzo SKU.
 // No se permite transportar finanzas/costos de la jornada agregada.
 if(Object.hasOwn(skuInputs,'extraCapacityDailyCost')
  &&(!Number.isSafeInteger(skuInputs.extraCapacityDailyCost)
    ||skuInputs.extraCapacityDailyCost<0||skuInputs.extraCapacityDailyCost>1000000))
  fail('tarifa SKU fuera de rango');
 if(Object.hasOwn(skuInputs,'reservePercent')&&(
  !Number.isSafeInteger(skuInputs.reservePercent)
  ||skuInputs.reservePercent!==openingState.reservePercent
  ||![0,25].includes(skuInputs.reservePercent)))
  fail('reserva física no corresponde con la apertura precomprometida');
 if(!Object.hasOwn(skuInputs,'reservePercent')&&openingState.reservePercent!==0)
  fail('reserva física sin supuesto de apertura');
 if(Object.hasOwn(skuInputs,'operationalEvents')){
  // External day/area incidents are not aggregate demand, new purchases or
  // balance adjustments; only the strict physical calendar is admissible.
  const scheduled=normalizeOperationalEvents(skuInputs.operationalEvents,12);
  if(!scheduled.length||JSON.stringify(scheduled)!==JSON.stringify(skuInputs.operationalEvents))
   fail('calendario operacional no canónico');
 }
 const allowed=['operationalEvents','policy','plannedOrders','actualOrders','stock','delayDays',
  'extraCapacityDailyCost','pickingUnitCapacityLimit','reservePercent',
  ...names,'supplierFill'];
 if(Object.keys(skuInputs).some(key=>!allowed.includes(key)))fail('campo agregado no autorizado en el replay SKU');
 if(!skuInputs.delayDays||typeof skuInputs.delayDays!=='object'
  ||Object.keys(skuInputs.delayDays).some(id=>!ids.includes(id)
   ||!validInteger(skuInputs.delayDays[id])))fail('retraso de proveedor SKU inválido');

 const mappings=[
  {area:'commercial',target:'plannedForecastPercent',kind:'planning-proxy',unit:'percent'},
  {area:'planning',target:'planningCoveragePercent',kind:'planning-proxy',unit:'percent'},
  {area:'purchasing',target:'supplierFill',kind:'supplier-proxy',unit:'percent-per-SKU'},
  {area:'receiving',target:'receivingUnitCapacity',kind:'assumed-daily-capacity',unit:'SKU/day'},
  {area:'quality',target:'qualityReleasePercent',kind:'assumed-release-rate',unit:'percent/day'},
  {area:'inventory',target:'inventoryAccuracyPercent',kind:'verification-gate',unit:'percent'},
  {area:'picking',target:'pickingUnitCapacity',kind:'assumed-daily-capacity',unit:'SKU/day'},
  {area:'transport',target:'transportUnitCapacity',kind:'assumed-daily-capacity',unit:'SKU/day'}
 ];
 if(mappings.some((m,i)=>area.stages[i]?.id!==m.area))fail('orden de las ocho áreas no coincide');
 return freezeDeep({
  passed:true,scope:'sample-not-accounting',sourceScope:'aggregate-shift',targetScope:'sku-cohort',
  physicalStockSource:openingState.source==='catalog'?'catalog-opening-only':'explicit-sku-opening',sampleSizeRule:'round(plannedSampleOrders * actualShiftDemand / plannedShiftDemand)',
  sampleOrders:{planned:plannedSampleOrders,actual:expectedOrders},
  mappings,
  excluded:[
   'aggregate.initialStock','aggregate.eligibleReserve','aggregate.received',
   'aggregate.released','aggregate.dispatched','aggregate.pending',
   'aggregate.costs','customerDeliveries'
  ],
  notes:'Las tasas y capacidades se trasladan como supuestos didácticos, sin calibración automática por duración o mezcla SKU. La reserva agregada no crea stock físico; no se suman pedidos, SKU, costos o despachos entre modelos. Salir del CD tampoco acredita entrega al cliente.'
 });
}
