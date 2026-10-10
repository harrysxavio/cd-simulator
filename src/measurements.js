/**
 * M2-01 · Observable dimensions and time scopes.
 *
 * Business rule: an equivalent shift unit, one physical SKU unit and one
 * complete customer order are different quantities. A 12-day order cohort
 * cannot be added to a one-shift aggregate, even if both are integers.
 *
 * Keep this module calculation-only (no DOM, persistence or simulation).
 */
export const SCOPE_DEFINITIONS=Object.freeze({
 aggregate:Object.freeze({
  scope:'aggregate-shift',horizonUnit:'shift',
  displayUnit:'unidades equivalentes de jornada',
  orderComparable:false
 }),
 sku:Object.freeze({
  scope:'sku-cohort',horizonUnit:'day',firstDay:0,
  skuDisplayUnit:'unidades SKU por día',
  orderDisplayUnit:'pedidos completos',
  orderComparable:true
 })
});

export const SKU_UNIT_CONVENTIONS=Object.freeze({
 orders:'pedidos completos',
 physical:'unidades por SKU',
 currency:'CLP',
 time:'días'
});

const VALID_UNITS=Object.freeze({
 'aggregate-shift':new Set(['shift-equivalent-units']),
 'sku-cohort':new Set(['orders','sku-units'])
});

/**
 * Create a nonnegative and integer-valued amount with an explicit dimension.
 * horizonDays represents the LAST campaign day, with day 0 included.
 */
export function measuredCount(value,{scope,unit,horizonDays=null}={}){
 if(!Number.isSafeInteger(value)||value<0)throw new Error('Cantidad no negativa entera requerida');
 if(!VALID_UNITS[scope]?.has(unit))throw new Error('Dimensión incompatible con el alcance');
 if(scope==='sku-cohort'){
  if(!Number.isSafeInteger(horizonDays)||horizonDays<0||horizonDays>365){
   throw new Error('Horizonte SKU inválido: día 0 hasta día de cierre');
  }
 }else if(horizonDays!==null){
  throw new Error('Una jornada agregada no tiene horizonte de días SKU');
 }
 return Object.freeze({value,scope,unit,horizonDays});
}

/**
 * Only quantities from the same scope, unit and horizon can be summed.
 * Do NOT apply conversion factors implicitly.
 */
export function addMeasuredCounts(...values){
 if(!values.length)throw new Error('La suma requiere al menos una cantidad');
 const first=values[0];
 for(const item of values){
  if(!item||item.scope!==first.scope||item.unit!==first.unit||item.horizonDays!==first.horizonDays){
   throw new Error('No sumar pedidos, unidades SKU o jornadas con alcances diferentes');
  }
  if(!Number.isSafeInteger(item.value)||item.value<0)throw new Error('Cantidad inválida');
 }
 const total=values.reduce((sum,x)=>sum+x.value,0);
 if(!Number.isSafeInteger(total))throw new Error('Desborde de cantidad');
 return measuredCount(total,first);
}

/**
 * Read-only description of what the manager may compare.
 * It contains only counts, never a new simulation or converted stock.
 */
export function skuServiceMeasurements({horizonDays,actualOrders,shippedOrders,pendingOrders,shippedSkuUnits}={}){
 const orderContext={scope:SCOPE_DEFINITIONS.sku.scope,unit:'orders',horizonDays};
 const skuContext={scope:SCOPE_DEFINITIONS.sku.scope,unit:'sku-units',horizonDays};
 const actual=measuredCount(actualOrders,orderContext);
 const shipped=measuredCount(shippedOrders,orderContext);
 const pending=measuredCount(pendingOrders,orderContext);
 const physicalShipped=measuredCount(shippedSkuUnits,skuContext);
 if(addMeasuredCounts(shipped,pending).value!==actual.value){
  throw new Error('Pedidos de campaña SKU no concilian');
 }
 return Object.freeze({
  scope:SCOPE_DEFINITIONS.sku.scope,
  firstDay:0,
  lastDay:horizonDays,
  inclusive:true,
  actualOrders:actual,shippedOrders:shipped,pendingOrders:pending,
  shippedSkuUnits:physicalShipped
 });
}
