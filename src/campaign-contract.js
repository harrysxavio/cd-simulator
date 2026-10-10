import {flow} from './flow.js';
import {numericValue} from './engine.js';
import {SKU_CATALOG} from './sku.js';
import {SCOPE_DEFINITIONS} from './measurements.js';

/**
 * One explicitly documented contract between campaign decisions and the SKU lab.
 * This is an ADAPTER, not yet an economic or physical merger of both engines.
 *
 * The main exercise expresses demand and results as aggregate units in one shift.
 * The SKU lab models complete orders over several days. The fixed-size order
 * cohort is a representative sample; never sum it with main-campaign units.
 *
 * All downstream SKU comparisons receive the same validated, immutable inputs.
 */
export function campaignSkuContract({
 decisions={},actions={},scenario={},policy='balanced',
 supplierDelay=false,plannedSampleOrders=200,campaignId='SKU-LAB'
}={}){
 if(!['lean','balanced','service'].includes(policy))throw new Error('Política SKU inválida');
 if(!Number.isSafeInteger(plannedSampleOrders)||plannedSampleOrders<1||plannedSampleOrders>100000)throw new Error('Tamaño de muestra SKU inválido');
 if(typeof campaignId!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(campaignId))throw new Error('Identificador de campaña inválido');
 const area=flow(decisions,actions,scenario);
 // The commercial forecast and purchase coverage are committed against the
 // planned campaign. A revealed demand surprise must not rewrite these inputs.
 const commercialForecast=area.plannedDemand>0?Math.max(1,Math.min(200,100*area.estimated/area.plannedDemand)):100;
 const planningCoverage=Math.max(0,Math.min(150,numericValue('planning',decisions)+(area.actions.planning||0)));
 const supplierRate=area.ordered>0?Math.max(0,Math.min(100,100*area.delivered/area.ordered)):numericValue('purchasing',decisions);
 const actualSampleOrders=Math.max(1,Math.round(plannedSampleOrders*area.demand/area.plannedDemand));
 // Quantities received by the SKU model are the catalog's physical SKU units.
 // The user's aggregate stock level does NOT automatically represent SKU stock.
 const skuAreaCapacity={
  plannedForecastPercent:commercialForecast,
  planningCoveragePercent:planningCoverage,
  supplierFill:Object.fromEntries(SKU_CATALOG.map(p=>[p.id,supplierRate])),
  qualityReleasePercent:Math.max(0,Math.min(100,numericValue('quality',decisions)+(area.actions.quality||0))),
  // The inventory choice gates which PHYSICAL on-hand units may be promised.
  // Inventory recovery reserve action remains aggregate-only until SKU reserve
  // is physically sourced and audited: never manufacture SKU stock from it.
  inventoryAccuracyPercent:Math.max(0,Math.min(100,numericValue('inventory',decisions))),
  receivingUnitCapacity:area.receivingCapacity,
  pickingUnitCapacity:area.pickingCapacity,
  transportUnitCapacity:area.stages[7].capacity
 };
 const skuInputs={
  policy,plannedOrders:plannedSampleOrders,actualOrders:actualSampleOrders,
  delayDays:supplierDelay?{A:8}:{},...skuAreaCapacity
 };
 const trace={
  campaignId,scope:'sample-not-accounting',aggregateUnit:SCOPE_DEFINITIONS.aggregate.displayUnit,
  skuUnit:SCOPE_DEFINITIONS.sku.skuDisplayUnit,orderUnit:SCOPE_DEFINITIONS.sku.orderDisplayUnit,plannedCampaignUnits:area.plannedDemand,
  actualCampaignUnits:area.demand,plannedSampleOrders,actualSampleOrders,
  sampleRatio:area.demand/area.plannedDemand,
  stockFromCatalog:true,inventoryAccuracyLinked:true,inventoryReserveActionNotLinked:true,
  note:'Muestra de pedidos SKU derivada de la proporción de demanda de la campaña agregada. No representa la totalidad de sus unidades ni de su inventario. La exactitud de Inventario condiciona el picking SKU sin destruir existencias. La reserva de Inventario agregado y los costos todavía no son intercambiables.'
 };
 // Freeze nested arrays/objects to prevent one UI view from mutating the plan
 // used by recovery, procurement reconciliation and SKU audit.
 const freeze=value=>{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
   for(const nested of Object.values(value))freeze(nested);
   Object.freeze(value);
  }
  return value;
 };
 return freeze({campaignId,area,commercialForecast,planningCoverage,supplierRate,
  plannedSampleOrders,actualSampleOrders,skuAreaCapacity,skuInputs,trace});
}
