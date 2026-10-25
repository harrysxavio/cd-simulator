import {NODES,DEFAULTS,PARAMETERS} from './engine.js';
import {SKU_CATALOG} from './sku.js';
import {normalizeI2GameState} from './i2-game-state.js';

const COMMERCIAL=NODES.find(x=>x.id==='commercial');
const percentByChoice=Object.freeze(Object.fromEntries(
 COMMERCIAL.choices.map(x=>[x.id,x.forecast])
));
const deepFreeze=obj=>{
 if(obj&&typeof obj==='object'&&!Object.isFrozen(obj)){
  for(const value of Object.values(obj))deepFreeze(value);
  Object.freeze(obj);
 }
 return obj;
};

/**
 * I2-18 · SOLO pronóstico antes de revelar: mismos porcentajes que V1.
 * forecastOrders es equivalente teórico de planificación en la muestra SKU,
 * NO demanda real y NO número de órdenes de compra ya emitidas.
 */
export function i2CommercialForecastLesson(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='area'||state.index!==0||state.reveal)
  throw new Error('I2-18: lectura comercial solo antes de la sorpresa');
 const selected=state.choices.commercial;
 const percent=percentByChoice[selected],base=percentByChoice[DEFAULTS.commercial];
 const plannedOrders=state.advanced.plannedOrders;
 if(!Number.isSafeInteger(percent)||percent<1||percent>200
   ||PARAMETERS.commercial.key!=='forecast')
  throw new Error('I2-18: fuente de forecast incompatible con V1');
 const forecastOrders=Math.max(1,Math.round(plannedOrders*percent/100));
 const referenceOrders=Math.max(1,Math.round(plannedOrders*base/100));
 const delta=forecastOrders-referenceOrders;
 const risk=delta<0?'under':delta>0?'over':'reference';
 return deepFreeze({
  phase:'pre-reveal',scope:'sku-cohort',selectedOption:selected,
  percent,plannedOrders,forecastOrders,referenceOrders,deltaVsReference:delta,
  type:'forecast-equivalent-only',risk,
  main:'Pronóstico equivalente: '+forecastOrders+' pedidos de muestra',
  secondary:(delta>0?'+':'')+delta+' pedidos frente al supuesto base de '+referenceOrders,
  whatIf:risk==='under'
   ?'Podrías comprometer menos reposición y dejar pedidos sin productos si la demanda resulta mayor.'
   :risk==='over'
   ?'Podrías elevar reposición, compromiso de compra y stock sobrante; no equivale a más ventas.'
   :'Usar el pronóstico base no garantiza acierto: la demanda observada podría subir o bajar.',
  chain:Object.freeze([
   'Comercial define el pronóstico, sin conocer la demanda futura.',
   'Planificación aplica cobertura y Compras selecciona proveedor sobre esa necesidad.',
   'Las órdenes SKU originales conservan cantidad y fecha de llegada; no se reescriben después del evento.',
   'Recepción, Calidad, Inventario, Picking y Transporte determinan el servicio físico posible.'
  ]),
  leadTimes:SKU_CATALOG.map(x=>({id:x.id,nominalDays:x.leadDays})),
  source:'NODES/DEFAULTS V1, estado I2 y SKU_CATALOG; regla Math.round(muestra × forecast % / 100) de commercial-planning.js',
  warning:'Simulación educativa: equivalente de pronóstico, no resultado, compra emitida, despacho ni costo total.'
 });
}

/**
 * I2-18 · Resumen posrevelación tomado del compromiso físico congelado en
 * freezeCommercialPlanning/commercialPlanningReading; no recalcula pedidos.
 */
export function i2CommercialOutcomeReading(canonicalReading){
 if(canonicalReading?.scope!=='sku-cohort'
  ||!Number.isSafeInteger(canonicalReading.actualOrders)
  ||!Number.isSafeInteger(canonicalReading.forecastOrders)
  ||!Number.isSafeInteger(canonicalReading.totalCommittedSkuUnits)
  ||!Number.isSafeInteger(canonicalReading.totalCommittedValueCLP)
  ||!Array.isArray(canonicalReading.rows)||canonicalReading.rows.length!==SKU_CATALOG.length
  ||canonicalReading.rows.some(x=>!SKU_CATALOG.some(s=>s.id===x.skuId)
    ||!Number.isSafeInteger(x.committedSkuUnits)||x.committedSkuUnits<0
    ||!Number.isSafeInteger(x.expectedArrivalDay)||x.expectedArrivalDay<0)
  ||canonicalReading.rows.reduce((sum,x)=>sum+x.committedSkuUnits,0)!==canonicalReading.totalCommittedSkuUnits
  ||canonicalReading.rows.reduce((sum,x)=>sum+x.committedValueCLP,0)!==canonicalReading.totalCommittedValueCLP){
  throw new Error('I2-18: cierre Comercial no conciliado');
 }
 const variance=canonicalReading.varianceVsForecastOrders;
 if(variance!==canonicalReading.actualOrders-canonicalReading.forecastOrders)
  throw new Error('I2-18: desviación de forecast inconsistente');
 return deepFreeze({
  scope:'sku-cohort',phase:'post-reveal',
  forecastOrders:canonicalReading.forecastOrders,
  actualOrders:canonicalReading.actualOrders,
  varianceVsForecastOrders:variance,
  errorDirection:canonicalReading.forecastDirection,
  originalCommittedSkuUnits:canonicalReading.totalCommittedSkuUnits,
  originalCommittedValueCLP:canonicalReading.totalCommittedValueCLP,
  originalRows:canonicalReading.rows.map(x=>({
   skuId:x.skuId,committedSkuUnits:x.committedSkuUnits,
   expectedArrivalDay:x.expectedArrivalDay
  })),
  source:'commercialPlanningReading + freezeCommercialPlanning (modelo SKU canónico)',
  boundary:'Compromiso previo a la sorpresa: no pago, no costo operativo total, no entrega ni órdenes extra de recuperación.'
 });
}
