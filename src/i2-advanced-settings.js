import {SKU_CATALOG} from './sku.js';
import {SKU_COST_DEFAULTS} from './sku-cost-catalog.js';

/**
 * I2-15 · Opciones avanzadas que sí afectan el modelo SKU canónico.
 * Las listas restringidas evitan configuraciones imposibles en un teléfono.
 * No mezclar existencias SKU con el stock agregado de una jornada.
 */
export const I2_ADVANCED_FIELDS=Object.freeze({
 plannedOrders:Object.freeze([160,200,240]),
 pickingLimitSkuPerDay:Object.freeze(['base','10','40']),
 stockProfile:Object.freeze(['low','standard','high']),
 extraCapacityDailyCostCLP:Object.freeze([50000,70000,100000])
});
export const I2_DEFAULT_ADVANCED=Object.freeze({
 plannedOrders:200,pickingLimitSkuPerDay:'base',stockProfile:'standard',
 extraCapacityDailyCostCLP:SKU_COST_DEFAULTS.recovery.addedCapacityCLPPerDay
});

export function i2ValidateAdvanced(value){
 if(!value||typeof value!=='object'||Array.isArray(value)
  ||Object.keys(value).some(key=>!Object.hasOwn(I2_ADVANCED_FIELDS,key))
  ||Object.keys(I2_ADVANCED_FIELDS).some(key=>!I2_ADVANCED_FIELDS[key].includes(value[key]))){
  throw new Error('I2-15: configuración avanzada inválida');
 }
 return Object.freeze({
  plannedOrders:value.plannedOrders,pickingLimitSkuPerDay:value.pickingLimitSkuPerDay,
  stockProfile:value.stockProfile,extraCapacityDailyCostCLP:value.extraCapacityDailyCostCLP
 });
}

/**
 * Solo inventario físico A/B/C: conserva la proporción del catálogo.
 * El perfil no genera compras/recepciones; crea otra apertura explícita.
 */
export function i2AdvancedPhysicalOptions(value=I2_DEFAULT_ADVANCED){
 const config=i2ValidateAdvanced(value);
 const factor={low:0.75,standard:1,high:1.25}[config.stockProfile];
 const openingStock=Object.fromEntries(SKU_CATALOG.map(product=>[
  product.id,Math.floor(product.initial*factor)
 ]));
 return Object.freeze({
  plannedOrders:config.plannedOrders,
  // null mantiene el modelo original: solo aplica un tope extra explícito.
  pickingUnitCapacityLimit:config.pickingLimitSkuPerDay==='base'?null:
   Number(config.pickingLimitSkuPerDay),
  openingStock:Object.freeze(openingStock),
  extraCapacityDailyCost:config.extraCapacityDailyCostCLP
 });
}
