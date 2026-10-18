/**
 * M7-36 · Comparación móvil legible de las cinco recuperaciones SKU.
 * Vista única del comparador consolidado M5-26; NO recalcula eventos ni costos,
 * no ordena opciones como rentabilidad y nunca interpreta un costo faltante como 0.
 */
const error=why=>{throw new Error('Comparación legible SKU: '+why)};
const options=Object.freeze(['wait','reserve','overtime','emergency','combined']);
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const amount=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const freeze=obj=>{
 if(obj&&typeof obj==='object'&&!Object.isFrozen(obj)){
  Object.values(obj).forEach(freeze);Object.freeze(obj);
 }
 return obj;
};
export const READABLE_RESULT_MODES=Object.freeze({
 service:'Pedidos físicos',
 commitments:'Compromisos supuestos'
});
export function readableRecoveryResultsReadModel({comparison,view='service'}={}){
 if(!Object.hasOwn(READABLE_RESULT_MODES,view))error('vista desconocida');
 if(comparison?.passed!==true||comparison.scope!=='sku-cohort'||comparison.currency!=='CLP'
  ||!Object.isFrozen(comparison)||!Object.isFrozen(comparison.alternatives)
  ||!Array.isArray(comparison.alternatives)||comparison.alternatives.length!==5
  ||!integer(comparison.demandOrders)||!integer(comparison.horizonDays)
  ||typeof comparison.baselineKey!=='string'||!comparison.baselineKey
  ||!options.includes(comparison.selectedOption)
  ||!integer(comparison.baseline?.completed)||!integer(comparison.baseline?.pending)
  ||comparison.baseline.completed+comparison.baseline.pending!==comparison.demandOrders
  ||Object.keys(comparison.checks??{}).length===0
  ||Object.values(comparison.checks).some(value=>value!==true)){
  error('se requiere comparación SKU reconciliada de cinco escenarios');
 }
 const by=new Map(comparison.alternatives.map(a=>[a.option,a]));
 if(by.size!==options.length||!options.every(o=>by.has(o)))error('faltan opciones comparables');
 const rows=options.map(option=>{
  const a=by.get(option),delta=a.shippedOrders-comparison.baseline.completed;
  if(typeof a.label!=='string'||!a.label.trim()
   ||!integer(a.shippedOrders)||!integer(a.pendingOrders)
   ||a.shippedOrders+a.pendingOrders!==comparison.demandOrders
   ||a.ordersDelta!==delta||a.pendingDelta!==-delta
   ||!integer(a.backlogOrderDays)||!amount(a.incrementalCommitmentAndCostProxyCLP)
   ||!amount(a.urgentPurchasePrincipalCLP)||!amount(a.urgentSurchargeCLP)
   ||!amount(a.addedCapacityCostCLP)
   ||Math.abs(a.incrementalCommitmentAndCostProxyCLP-(
     a.urgentPurchasePrincipalCLP+a.urgentSurchargeCLP+a.addedCapacityCostCLP))>0.000001
   ||(option==='wait'&&(delta!==0||a.incrementalCommitmentAndCostProxyCLP!==0))){
   error('pedidos, opciones o componentes de costo inconsistentes');
  }
  const costStatus=option==='reserve'?'unknown-reserve-transfer':
   option==='wait'?'no-new-modeled-action':'partial-components-only';
  return {
   option,label:a.label,selected:option===comparison.selectedOption,
   dispatched:a.shippedOrders,pending:a.pendingOrders,
   changeDispatched:delta,backlogOrderDays:a.backlogOrderDays,
   // Cost intentionally null for reserve (a missing tariff is NOT CLP zero).
   visibleCommitmentCLP:costStatus==='unknown-reserve-transfer'?null:
    a.incrementalCommitmentAndCostProxyCLP,
   costStatus,totalIncrementalCostCLP:null,
   meaning:view==='service'
    ?'Pedidos completos expedidos desde el CD'
    :'Compromisos parciales modelados, sin costo total'
  };
 });
 const current=rows.find(r=>r.selected);
 if(!current||current.dispatched!==comparison.selected.shippedOrders||
  current.pending!==comparison.selected.pendingOrders){
  error('la decisión seleccionada no concilia');
 }
 return freeze({
  passed:true,scope:'sku-cohort',type:'mobile-readable-recovery-results',
  baselineKey:comparison.baselineKey,view,
  horizonDays:comparison.horizonDays,
  dayCount:comparison.horizonDays+1,
  orders:comparison.demandOrders,selectedOption:comparison.selectedOption,
  baseline:{dispatched:comparison.baseline.completed,pending:comparison.baseline.pending},
  rows,checks:{sameFrozenBaseline:true,allFiveAlternatives:true,
   allOrdersReconciled:true,noUnpricedReserveAsFree:true,
   noEconomicRanking:true,noSessionMutation:true},
  explanation:view==='service'
   ?'Todas las filas usan los mismos pedidos originales y los mismos días. Expedidos = salieron del CD; no demuestra entrega al cliente.'
   :'Son compromisos/costos parciales ilustrativos, no dinero pagado, utilidad ni costo real total. Reserva: traslado sin tarifa, no CLP 0.',
  noFullCostKnown:true,
  note:'No comparar el modelo agregado de una jornada con pedidos físicos SKU de varios días. El costo original de compra permanece en la base; aquí solo se leen componentes incrementales. Ningún valor monetario prueba ejecución ni viabilidad.'
 });
}
