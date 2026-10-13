/**
 * M4-14: catalog of didactic SKU cost assumptions.
 *
 * All monetary rates here belong ONLY to the simulated 12-day SKU cohort.
 * They are not rates from the one-shift aggregate finance() model.
 * Defining a rate does NOT book an expense, payment, sale or inventory movement.
 */
const freezeDeep=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const part of Object.values(value))freezeDeep(part);
  Object.freeze(value);
 }
 return value;
};

/** One authoritative set of default rates; existing numbers are unchanged. */
export const SKU_COST_DEFAULTS=freezeDeep({
 currency:'CLP',
 scope:'sku-cohort',
 standardCostCLPPerSku:{A:1800,B:3200,C:6500},
 recovery:{
  revenueCLPPerShippedOrder:9000,
  urgentSurchargeRate:0.30,
  addedCapacityCLPPerDay:70000,
  backlogPenaltyCLPPerOrderDay:150,
  holdingFractionPerCLPDay:0.0005
 }
});

const ACTIVITY_RULES=freezeDeep([
 {id:'order-revenue',label:'Ingreso ilustrativo por pedido completo expedido',rateKey:'revenueCLPPerShippedOrder',basis:'CLP/pedido',category:'revenue-proxy',recognition:'estimated-not-confirmed',cashConfirmed:false},
 {id:'urgent-surcharge',label:'Recargo de compra extraordinaria',rateKey:'urgentSurchargeRate',basis:'fracción del valor de compra urgente',category:'incremental-purchase-commitment',recognition:'commitment-not-payment',cashConfirmed:false},
 {id:'extra-capacity',label:'Refuerzo de capacidad',rateKey:'addedCapacityCLPPerDay',basis:'CLP/jornada de refuerzo activada',category:'operational-assumption',recognition:'simplified-daily-cost',cashConfirmed:false},
 {id:'backlog-penalty',label:'Penalidad ilustrativa por retraso',rateKey:'backlogPenaltyCLPPerOrderDay',basis:'CLP/pedido pendiente/día',category:'decision-proxy',recognition:'not-booked-penalty',cashConfirmed:false},
 {id:'inventory-holding',label:'Tenencia ilustrativa de stock',rateKey:'holdingFractionPerCLPDay',basis:'fracción del valor SKU/día',category:'decision-proxy',recognition:'not-booked-storage',cashConfirmed:false}
]);
const UNPRICED_OPERATIONS=freezeDeep([
 {id:'receiving',label:'Recepción',unit:'SKU recibido',reason:'Sin tarifa operativa física por actividad'},
 {id:'quality',label:'Calidad',unit:'SKU liberado',reason:'Sin costo de inspección SKU calibrado'},
 {id:'inventory-move',label:'Movimiento entre ubicaciones',unit:'SKU trasladado',reason:'No equiparar movimiento de reserva con compra'},
 {id:'picking',label:'Picking',unit:'pedido preparado',reason:'Sin tarifa por preparación físicamente calibrada'},
 {id:'transport',label:'Transporte',unit:'pedido expedido',reason:'Sin tarifa de flete ni entrega confirmada'}
]);

const error=message=>{throw new Error('Catálogo de costos SKU: '+message)};
const finiteNonnegative=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;

/**
 * Read-only evidence of where each SKU/activity rate comes from.
 * Requires the actual SKU catalog, so a divergence cannot be hidden behind
 * an unrelated duplicate rate map. This function never runs the simulation.
 */
export function skuCostCatalogReadModel({catalog,defaults=SKU_COST_DEFAULTS}={}){
 if(!Array.isArray(catalog)||!catalog.length||!defaults
  ||defaults.currency!=='CLP'||defaults.scope!=='sku-cohort'
  ||!defaults.standardCostCLPPerSku||!defaults.recovery){
  error('faltan origen, moneda o alcance');
 }
 const skuIds=Object.keys(defaults.standardCostCLPPerSku);
 if(new Set(skuIds).size!==skuIds.length||catalog.length!==skuIds.length
  ||new Set(catalog.map(sku=>sku?.id)).size!==catalog.length
  ||catalog.some(sku=>!sku||typeof sku.id!=='string'
   ||!Object.hasOwn(defaults.standardCostCLPPerSku,sku.id)
   ||!Number.isSafeInteger(sku.unitCost)||sku.unitCost<0
   ||sku.unitCost!==defaults.standardCostCLPPerSku[sku.id])){
  error('tarifas físicas y catálogo de productos no coinciden');
 }
 const rules=ACTIVITY_RULES.map(rule=>{
  const rate=defaults.recovery[rule.rateKey];
  if(!finiteNonnegative(rate))error('tarifa de actividad inválida: '+rule.id);
  return {...rule,rate,source:'SKU_COST_DEFAULTS.recovery.'+rule.rateKey};
 });
 if(skuIds.some(id=>!Number.isSafeInteger(defaults.standardCostCLPPerSku[id])
  ||defaults.standardCostCLPPerSku[id]<0)
  ||Object.keys(defaults.recovery).length!==rules.length
  ||Object.keys(defaults.recovery).some(key=>!rules.some(rule=>rule.rateKey===key))){
  error('tarifas SKU incompletas o incompatibles');
 }
 const productCosts=catalog.map(sku=>({
  id:sku.id,label:sku.name,rateCLPPerPhysicalUnit:sku.unitCost,
  source:'SKU_COST_DEFAULTS.standardCostCLPPerSku.'+sku.id,
  category:'inventory-standard-cost',
  recognition:'unit-valuation-not-cash'
 }));
 return freezeDeep({
  passed:true,scope:'sku-cohort',currency:'CLP',period:'days-0-12',
  productCosts,activityRates:rules,unpricedOperations:UNPRICED_OPERATIONS.map(x=>({...x})),
  accountingStatus:'assumptions-only',
  source:'shared-default-rates',
  exclusions:['aggregate-shift-finance','confirmed-customer-delivery',
   'actual-payments','realized-profit','SKU-activity-labor-without-calibration'],
  note:'Una tarifa no crea una factura ni un movimiento. Valorizar existencias no equivale a pago. Los costos de los SKU son estándar ilustrativos; faltan gastos físicos por actividad y contabilidad completa de campaña.'
 });
}
