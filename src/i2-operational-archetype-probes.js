/**
 * I2-35.2 · Evidence-based, non-playable operational archetype catalogue.
 *
 * These are reproducible physical probes, NOT new playable missions:
 * scene/reveal, managerial options and evaluation still require the game's
 * validated scenario contract. Never reveal these results before demand reveal.
 */
import {i2DefaultChoices,i2MvpPhysicalResult} from './i2-mvp-adapter.js';
import {I2_DEFAULT_ADVANCED} from './i2-advanced-settings.js';

const shared=i2DefaultChoices();
const config=(seed,choices={},extra={})=>Object.freeze({
 seed,choices:Object.freeze({...shared,...choices}),
 advanced:Object.freeze({...I2_DEFAULT_ADVANCED,...extra})
});

const CASES=Object.freeze([
 Object.freeze({
  id:'ARC-06',name:'Picking restringido por capacidad física',
  learning:'La capacidad real de preparar SKU puede impedir expediciones aunque exista demanda.',
  comparisonType:'two-exogenous-physical-contexts',
  left:config('alpha-case-04',{}, {pickingLimitSkuPerDay:'10'}),
  right:config('alpha-case-04'),
  rightOption:'wait',
  limits:'Quitar el tope desde la configuración NO es una recuperación gerencial dentro de la partida. Falta convertirlo en reto con política ejecutable.'
 }),
 Object.freeze({
  id:'ARC-05',name:'Material retenido en Calidad',
  learning:'Desbloquear unidades puede reducir la retención sin aumentar pedidos expedidos.',
  comparisonType:'two-pre-reveal-management-policies',
  left:config('alpha-case-01',{
   planning:'buffer',purchasing:'express',receiving:'low',
   quality:'slow',inventory:'count',picking:'reinforce',transport:'low'
  },{stockProfile:'low'}),
  right:config('alpha-case-01',{
   planning:'buffer',purchasing:'express',receiving:'low',
   quality:'priority',inventory:'count',picking:'reinforce',transport:'low'
  },{stockProfile:'low'}),
  rightOption:'wait',
  limits:'Priorizar Calidad es una decisión de planificación antes de reveal; no es recuperación posterior. Retener no significa rechazar.'
 }),
 Object.freeze({
  id:'ARC-08',name:'Refuerzo caro sin pedidos recuperados',
  learning:'Gastar en capacidad no ayuda cuando otra etapa sigue restringiendo el flujo.',
  comparisonType:'same-physical-baseline-recovery',
  left:config('alpha-case-04',{quality:'slow'},
   {extraCapacityDailyCostCLP:100000}),
  right:config('alpha-case-04',{quality:'slow'},
   {extraCapacityDailyCostCLP:100000}),
  rightOption:'overtime',
  limits:'El gasto es solo incremental y conocido; no representa costo total ni utilidad.'
 })
]);

export const I2_EVIDENCED_ARCHETYPES=Object.freeze(CASES.map(c=>Object.freeze({
 id:c.id,name:c.name,learning:c.learning,
 comparisonType:c.comparisonType,playable:false,
 limits:c.limits
})));

function evidence(result){
 return Object.freeze({
  actualOrders:result.actualOrders,
  shipped:result.shippedOrders,pending:result.pendingOrders,
  heldQualitySku:result.quality.totals.peakHeldSkuUnits,
  dockQueueSku:result.receiving.totals.peakDockQueueSkuUnits,
  stagingOrders:result.transport.totals.peakStagingOrders,
  incrementalExpenseCLP:result.incrementalExpenseCLP
 });
}

/** Must be used only by diagnostics/tests or after explicit reveal. */
export function i2OperationalArchetypeProbe(id){
 const c=CASES.find(item=>item.id===id);
 if(!c)throw new Error('I2-35.2: arquetipo sin evidencia');
 const left=i2MvpPhysicalResult({...c.left,option:'wait'});
 const right=i2MvpPhysicalResult({...c.right,option:c.rightOption});
 if(left.actualOrders!==right.actualOrders)
  throw new Error('I2-35.2: la demanda exógena cambió');
 if(c.comparisonType==='same-physical-baseline-recovery'&&
    (left.baselineKey!==right.baselineKey ||
     JSON.stringify(left.originalPurchaseOrders)!==
     JSON.stringify(right.originalPurchaseOrders)))
  throw new Error('I2-35.2: baseline alterado por intervención');
 return Object.freeze({
  id:c.id,comparisonType:c.comparisonType,playable:false,
  left:evidence(left),right:evidence(right),
  shippedDelta:right.shippedOrders-left.shippedOrders,
  limits:c.limits
 });
}
