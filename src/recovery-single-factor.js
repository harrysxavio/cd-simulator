/**
 * M6-29 · Contrafactual físico de UNA variable, sobre el baseline SKU congelado.
 *
 * Esta prueba es una simulación de sensibilidad, no una identificación causal
 * exclusiva ni una promesa de despacho/entrega. No modifica compras, stock,
 * pedidos, costos o decisiones persistidas. Nunca mezcla el motor agregado.
 */
import {assertRecoveryBaseline} from './recovery-baseline.js';
import {eventSimulation} from './events.js';
import {assertFrozenOriginalPurchases} from './original-purchase.js';

const fail=message=>{throw new Error('Contrafactual SKU: '+message)};
const frozen=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  for(const v of Object.values(x))frozen(v);
  Object.freeze(x);
 }
 return x;
};
const LIMITS=Object.freeze({
 receivingUnitCapacity:{label:'Recepción',unit:'unidades SKU/día',max:100000},
 qualityReleasePercent:{label:'Calidad',unit:'% de liberación diaria',max:100},
 inventoryAccuracyPercent:{label:'Inventario',unit:'% verificable',max:100},
 pickingUnitCapacity:{label:'Picking',unit:'unidades SKU/día',max:100000},
 transportUnitCapacity:{label:'Transporte',unit:'unidades SKU/día',max:100000},
 dailyCapacity:{label:'Límite compartido Picking/Transporte',unit:'pedidos/día',max:100000}
});
const precision=x=>Number.isSafeInteger(x)&&x>=0;
const backlogDays=replay=>replay.ledger.slice(0,-1).reduce((n,r)=>n+r.backlog,0);

/** Ofrece solo cambios modelables. null significa capacidad ilimitada, no cero. */
export function availableSingleFactorTrials(baselineSnapshot){
 const baseline=assertRecoveryBaseline(baselineSnapshot,baselineSnapshot?.seed??{});
 const seed=baseline.seed;
 return frozen(Object.entries(LIMITS).flatMap(([factor,info])=>{
  const before=seed[factor];
  // Sin staging, una mejora de Transporte no puede aislar una cola preparada.
  if(factor==='transportUnitCapacity'&&!seed.separateTransport)return [];
  if(before===null||typeof before!=='number'||!Number.isFinite(before)
   ||before<0||before>=info.max)return [];
  const step=info.max===100?20:Math.max(1,Math.ceil(before*0.2));
  return [{factor,label:info.label,unit:info.unit,before,
   suggestedValue:Math.min(info.max,Math.ceil(before+step))}];
 }));
}

/**
 * Repite solo el replay intervenido; compara contra el replay baseline existente.
 * La selección de un factor y su valor objetivo son explícitos y auditables.
 */
export function singleFactorCounterfactualReadModel({baselineSnapshot,factor,targetValue}={}){
 const baseline=assertRecoveryBaseline(baselineSnapshot,baselineSnapshot?.seed??{});
 const available=availableSingleFactorTrials(baseline);
 const selected=available.find(x=>x.factor===factor);
 if(!selected)fail('factor no disponible o ya sin margen de mejora');
 const afterValue=targetValue===undefined?selected.suggestedValue:targetValue;
 const max=LIMITS[factor].max;
 if(!Number.isSafeInteger(afterValue)||afterValue<=selected.before||afterValue>max){
  fail('el objetivo debe ser mayor, entero y estar dentro del rango');
 }
 const seed=baseline.seed,original=baseline.integrated.actual;
 const changed={...seed,[factor]:afterValue};
 const alternative=eventSimulation({
  policy:seed.policy,orders:seed.actualOrders,days:seed.days,
  stock:baseline.openingState.openingBySku,
  reserveStock:baseline.openingState.reserveBySku,
  delayDays:seed.delayDays,supplierFill:seed.supplierFill,
  fixedPurchases:baseline.integrated.purchase,extraDeliveries:[],
  receivingUnitCapacity:changed.receivingUnitCapacity,
  pickingUnitCapacity:changed.pickingUnitCapacity,
  transportUnitCapacity:changed.transportUnitCapacity,
  qualityReleasePercent:changed.qualityReleasePercent,
  inventoryAccuracyPercent:changed.inventoryAccuracyPercent,
  dailyCapacity:changed.dailyCapacity,separateTransport:seed.separateTransport
 });
 // Misma orden original y proveedor, sin orden nueva ni entrada ficticia.
 assertFrozenOriginalPurchases(baseline.integrated.originalPurchaseOrders,alternative);
 if(alternative.orders!==original.orders||alternative.days!==original.days
  ||alternative.ledger.length!==original.ledger.length
  ||alternative.extraDeliveries.length!==0
  ||JSON.stringify(alternative.deliveries)!==JSON.stringify(original.deliveries)
  ||JSON.stringify(alternative.initial)!==JSON.stringify(original.initial)
  ||JSON.stringify(alternative.openingReserve)!==JSON.stringify(original.openingReserve)
  ||alternative.ordersDetail.length!==original.ordersDetail.length
  ||alternative.ordersDetail.some((o,i)=>o.id!==original.ordersDetail[i].id
   ||o.templateId!==original.ordersDetail[i].templateId
   ||JSON.stringify(o.lines)!==JSON.stringify(original.ordersDetail[i].lines))
  ||Object.keys(LIMITS).some(k=>k!==factor&&alternative[k]!==original[k])
  ||alternative.separateTransport!==original.separateTransport){
  fail('demanda, pedido, proveedor, apertura o supuestos físicos se alteraron');
 }
 const daily=original.ledger.map((before,i)=>{
  const after=alternative.ledger[i];
  if(before.day!==i||after?.day!==i||!precision(after.shipped)
   ||!precision(after.completed)||!precision(after.backlog)
   ||after.completed+after.backlog!==original.orders){
   fail('despachos/pendientes diarios no concilian');
  }
  return {day:i,beforeShipped:before.shipped,afterShipped:after.shipped,
   beforeCumulative:before.completed,afterCumulative:after.completed,
   beforePending:before.backlog,afterPending:after.backlog,
   deltaShipped:after.shipped-before.shipped,
   deltaCumulative:after.completed-before.completed};
 });
 if(daily.at(-1).afterCumulative!==alternative.completed
  ||daily.at(-1).beforeCumulative!==original.completed
  ||alternative.completed+alternative.pending!==seed.actualOrders
  ||original.completed+original.pending!==seed.actualOrders){
  fail('el resultado final no concilia con la misma cohorte');
 }
 const delta=alternative.completed-original.completed;
 return frozen({
  passed:true,scope:'sku-cohort',type:'one-factor-sensitivity',
  baselineKey:baseline.scenarioKey,days:seed.days,orders:seed.actualOrders,
  factor,label:selected.label,unit:selected.unit,
  beforeValue:selected.before,afterValue,changedFactors:[factor],
  baseline:{dispatched:original.completed,pending:original.pending,
   backlogOrderDays:backlogDays(original)},
  alternative:{dispatched:alternative.completed,pending:alternative.pending,
   backlogOrderDays:backlogDays(alternative)},
  delta:{dispatched:delta,pending:alternative.pending-original.pending,
   backlogOrderDays:backlogDays(alternative)-backlogDays(original)},
  daily,
  checks:{frozenBaseline:true,sameOrderCohort:true,
   sameOpeningStock:true,sameOriginalPurchases:true,
   sameSupplierArrivals:true,onlyOneInputChanged:true,completeOrdersBalanced:true},
  incrementalCostCLP:null,
  improvementObserved:delta>0,
  uniqueRootCauseProven:false,
  note:'Ensayo de sensibilidad del modelo: solo cambia '+selected.label+
   '. Los pedidos se conservan íntegros; el flujo real de Recepción, Calidad, Inventario, Picking y Transporte puede impedir una mejora de despachos. Un valor positivo NO prueba causa raíz exclusiva, retorno económico ni entregas a cliente. El costo de modificar esta capacidad/porcentaje no está calibrado; desconocido no equivale a CLP 0.'
 });
}
