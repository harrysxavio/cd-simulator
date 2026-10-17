/**
 * M6-30 · Dos restricciones bajo el MISMO baseline SKU congelado.
 *
 * Corridas físicas: original ya calculado, factor A, factor B y A+B.
 * La interacción es la diferencia OBSERVADA entre el ensayo conjunto y la
 * suma hipotética de resultados individuales; nunca suma expediciones.
 * No edita sesiones, inventario, POs, ingresos ni costos no calibrados.
 */
import {assertRecoveryBaseline} from './recovery-baseline.js';
import {eventSimulation} from './events.js';
import {assertFrozenOriginalPurchases} from './original-purchase.js';
import {availableSingleFactorTrials,singleFactorCounterfactualReadModel} from './recovery-single-factor.js';

const fail=why=>{throw new Error('Contrafactual conjunto SKU: '+why)};
const freeze=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  for(const child of Object.values(x))freeze(child);
  Object.freeze(x);
 }
 return x;
};
const backlogDays=replay=>replay.ledger.slice(0,-1).reduce((n,d)=>n+d.backlog,0);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const valid=x=>Number.isSafeInteger(x)&&x>=0;

/** Lista de cambios elegibles sobre el escenario original, nunca sobre una recuperación. */
export function availablePairedFactorTrials(baselineSnapshot){
 const baseline=assertRecoveryBaseline(baselineSnapshot,baselineSnapshot?.seed??{});
 return availableSingleFactorTrials(baseline);
}

/**
 * A y B deben ser factores distintos. targetA / targetB omitidos utilizan las
 * propuestas pequeñas de M6-29; se permite subirlos explícitamente en pruebas.
 */
export function pairedCounterfactualReadModel({
 baselineSnapshot,factorA,factorB,targetA,targetB
}={}){
 const baseline=assertRecoveryBaseline(baselineSnapshot,baselineSnapshot?.seed??{});
 const trials=availablePairedFactorTrials(baseline);
 if(factorA===factorB||!trials.some(t=>t.factor===factorA)
  ||!trials.some(t=>t.factor===factorB)){
  fail('se necesitan exactamente dos factores diferentes y con margen de mejora');
 }
 const optsA={baselineSnapshot:baseline,factor:factorA,targetValue:targetA};
 const optsB={baselineSnapshot:baseline,factor:factorB,targetValue:targetB};
 const onlyA=singleFactorCounterfactualReadModel(optsA);
 const onlyB=singleFactorCounterfactualReadModel(optsB);
 if(onlyA.baselineKey!==baseline.scenarioKey||onlyB.baselineKey!==baseline.scenarioKey
  ||!same(onlyA.baseline,onlyB.baseline)||onlyA.changedFactors.length!==1
  ||onlyB.changedFactors.length!==1)fail('la base de ambos ensayos no concilia');
 const seed=baseline.seed,original=baseline.integrated.actual;
 const changed={...seed,[factorA]:onlyA.afterValue,[factorB]:onlyB.afterValue};
 const joint=eventSimulation({
  policy:seed.policy,orders:seed.actualOrders,days:seed.days,
  stock:baseline.openingState.openingBySku,
  reserveStock:baseline.openingState.reserveBySku,
  fixedPurchases:baseline.integrated.purchase,extraDeliveries:[],
  delayDays:seed.delayDays,supplierFill:seed.supplierFill,
  dailyCapacity:changed.dailyCapacity,
  receivingUnitCapacity:changed.receivingUnitCapacity,
  pickingUnitCapacity:changed.pickingUnitCapacity,
  transportUnitCapacity:changed.transportUnitCapacity,
  qualityReleasePercent:changed.qualityReleasePercent,
  inventoryAccuracyPercent:changed.inventoryAccuracyPercent,
  separateTransport:seed.separateTransport
 });
 assertFrozenOriginalPurchases(baseline.integrated.originalPurchaseOrders,joint);
 if(joint.orders!==original.orders||joint.days!==original.days
  ||joint.ledger.length!==original.ledger.length
  ||joint.extraDeliveries.length!==0
  ||!same(joint.deliveries,original.deliveries)
  ||!same(joint.initial,original.initial)
  ||!same(joint.openingReserve,original.openingReserve)
  ||joint.ordersDetail.length!==original.ordersDetail.length
  ||joint.ordersDetail.some((o,i)=>o.id!==original.ordersDetail[i].id
   ||o.templateId!==original.ordersDetail[i].templateId
   ||!same(o.lines,original.ordersDetail[i].lines))
  ||joint.separateTransport!==seed.separateTransport
  ||Object.keys({
   receivingUnitCapacity:0,pickingUnitCapacity:0,transportUnitCapacity:0,
   qualityReleasePercent:0,inventoryAccuracyPercent:0,dailyCapacity:0
  }).some(k=>joint[k]!==changed[k]||(k!==factorA&&k!==factorB&&joint[k]!==original[k]))){
  fail('se alteró otra condición física, de compra o la cohorte original');
 }
 const days=original.ledger.map((base,i)=>{
  const both=joint.ledger[i],a=onlyA.daily[i],b=onlyB.daily[i];
  if(!a||!b||base.day!==i||both?.day!==i||a.day!==i||b.day!==i
   ||!valid(both.shipped)||!valid(both.completed)||!valid(both.backlog)
   ||both.completed+both.backlog!==seed.actualOrders
   ||base.completed+base.backlog!==seed.actualOrders
   ||a.beforeCumulative!==base.completed||b.beforeCumulative!==base.completed
   ||a.beforePending!==base.backlog||b.beforePending!==base.backlog){
   fail('los pedidos y los cuatro ensayos diarios no concilian');
  }
  const predicted=a.afterCumulative+b.afterCumulative-base.completed;
  return {
   day:i,baselineShipped:base.shipped,onlyAShipped:a.afterShipped,
   onlyBShipped:b.afterShipped,jointShipped:both.shipped,
   baselineCompleted:base.completed,onlyACompleted:a.afterCumulative,
   onlyBCompleted:b.afterCumulative,jointCompleted:both.completed,
   baselinePending:base.backlog,jointPending:both.backlog,
   hypotheticalAdditiveCompleted:predicted,
   interactionOrders:both.completed-predicted
  };
 });
 if(days.at(-1).jointCompleted!==joint.completed
  ||joint.completed+joint.pending!==seed.actualOrders
  ||days.reduce((s,d)=>s+d.jointShipped,0)!==joint.completed){
  fail('el corte, despachos diarios y pendientes de la cohorte no cuadran');
 }
 const baseCompleted=original.completed;
 const deltaA=onlyA.alternative.dispatched-baseCompleted;
 const deltaB=onlyB.alternative.dispatched-baseCompleted;
 const jointDelta=joint.completed-baseCompleted;
 const additivePrediction=deltaA+deltaB;
 const interaction=jointDelta-additivePrediction;
 return freeze({
  passed:true,scope:'sku-cohort',type:'two-factor-sensitivity',
  baselineKey:baseline.scenarioKey,orders:seed.actualOrders,horizonDays:seed.days,
  factors:[
   {factor:factorA,label:onlyA.label,unit:onlyA.unit,before:onlyA.beforeValue,after:onlyA.afterValue},
   {factor:factorB,label:onlyB.label,unit:onlyB.unit,before:onlyB.beforeValue,after:onlyB.afterValue}
  ],
  baseline:{dispatched:baseCompleted,pending:original.pending,backlogOrderDays:backlogDays(original)},
  onlyA:{dispatched:onlyA.alternative.dispatched,pending:onlyA.alternative.pending,
   backlogOrderDays:onlyA.alternative.backlogOrderDays,deltaDispatched:deltaA},
  onlyB:{dispatched:onlyB.alternative.dispatched,pending:onlyB.alternative.pending,
   backlogOrderDays:onlyB.alternative.backlogOrderDays,deltaDispatched:deltaB},
  joint:{dispatched:joint.completed,pending:joint.pending,backlogOrderDays:backlogDays(joint),
   deltaDispatched:jointDelta},
  additivePredictionDelta:additivePrediction,
  interactionOrders:interaction,
  nonAdditive:interaction!==0,
  daily:days,
  checks:{frozenOriginal:true,sameCohortAndOrderBOM:true,
   identicalPOAndSupplierArrivals:true,identicalOpeningStock:true,
   exactlyTwoFactorsChanged:true,physicalReplayTogether:true,
   noDoubleCountedShipments:true},
  incrementalCostCLP:null,
  uniqueRootCauseProven:false,
  note:'Son cuatro observaciones del MISMO modelo: base, A, B y A+B. '+ 
   'La suma individual ('+additivePrediction+') es una referencia aritmética, NO pedidos despachados. '+
   'La intervención conjunta genera '+jointDelta+' pedidos adicionales frente a base; '+
   'la diferencia de interacción ('+interaction+') puede ser positiva, negativa o cero. '+
   'No se certifica causa empresarial exclusiva, personal, ingresos, entrega al cliente ni costo incremental. '+ 
   'El costo no calibrado es desconocido, nunca CLP 0.'
 });
}
