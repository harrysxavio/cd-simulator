/**
 * M6-31 · Recomendaciones de recuperación sustentadas en el libro físico SKU.
 *
 * Solo LECTURA del comparador M5-26 auditado: no repite simulaciones ni
 * confirma decisiones. La evidencia económica es parcial y los costos de
 * traslados de reserva no se han calibrado (desconocido NO significa CLP 0).
 */
const fail=why=>{throw new Error('Recomendación SKU: '+why)};
const freeze=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  for(const v of Object.values(x))freeze(v);
  Object.freeze(x);
 }
 return x;
};
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const money=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=Number.MAX_SAFE_INTEGER;
const OPTIONS=Object.freeze(['wait','reserve','overtime','emergency','combined']);
const ORDER=Object.freeze(Object.fromEntries(OPTIONS.map((id,i)=>[id,i])));
export const RECOVERY_RECOMMENDATION_PRIORITIES=Object.freeze({
 service:{label:'Recuperar más pedidos',description:'Primero expediciones físicas, luego menor espera.'},
 commitments:{label:'Controlar compromisos modelados',description:'Solo compara desembolsos/compromisos ilustrativos con componentes trazados.'}
});

/**
 * Un costo 0 en el modelo NO demuestra que una intervención sea gratuita.
 * 'reserve' siempre queda fuera del desempate por dinero: no hay tarifa
 * auditada para traslado, ubicación ni personal requerido.
 */
export function evidenceBasedRecoveryRecommendationsReadModel({
 comparison,priority='service'
}={}){
 if(!Object.hasOwn(RECOVERY_RECOMMENDATION_PRIORITIES,priority))fail('prioridad no reconocida');
 if(comparison?.passed!==true||comparison.scope!=='sku-cohort'
  ||comparison.currency!=='CLP'
  ||!Object.isFrozen(comparison)||!Object.isFrozen(comparison.alternatives)
  ||!Object.values(comparison.checks??{}).every(x=>x===true)
  ||Object.keys(comparison.checks??{}).length===0
  ||!integer(comparison.demandOrders)||!integer(comparison.horizonDays)
  ||!integer(comparison.baseline?.completed)
  ||!integer(comparison.baseline?.pending)
  ||comparison.baseline.completed+comparison.baseline.pending!==comparison.demandOrders
  ||!Array.isArray(comparison.alternatives)||comparison.alternatives.length!==5){
  fail('falta comparador físico SKU auditado e inmutable');
 }
 const by=new Map(comparison.alternatives.map(x=>[x.option,x]));
 if(by.size!==5||!OPTIONS.every(id=>by.has(id)))fail('cinco alternativas originales requeridas');
 const base=comparison.baseline;
 const alternatives=OPTIONS.map(id=>{
  const a=by.get(id),delta=a.shippedOrders-base.completed;
  if(!integer(a.shippedOrders)||!integer(a.pendingOrders)
   ||a.shippedOrders+a.pendingOrders!==comparison.demandOrders
   ||a.ordersDelta!==delta||a.pendingDelta!==-delta
   ||!integer(a.backlogOrderDays)||!money(a.incrementalCommitmentAndCostProxyCLP)
   ||!money(a.urgentPurchasePrincipalCLP)||!money(a.urgentSurchargeCLP)
   ||!money(a.addedCapacityCostCLP)
   ||Math.abs(a.incrementalCommitmentAndCostProxyCLP-(
     a.urgentPurchasePrincipalCLP+a.urgentSurchargeCLP+a.addedCapacityCostCLP))>0.000001
   ||(id==='wait'&&(a.shippedOrders!==base.completed
     ||a.backlogOrderDays!==base.backlogOrderDays
     ||a.incrementalCommitmentAndCostProxyCLP!==0))
   ||(id==='reserve'&&a.urgentPurchasePrincipalCLP!==0)
   ||(['wait','reserve','overtime'].includes(id)&&a.urgentSurchargeCLP!==0)
   ||(['wait','reserve','emergency'].includes(id)&&a.addedCapacityCostCLP!==0)){
   fail('resultado físico, pendiente, compromiso o alternativa inconsistente');
  }
  const costCoverage=id==='reserve'?'unpriced-reserve-transfer':
   id==='wait'?'no-new-modeled-intervention':'partially-modeled';
  return {
   option:id,label:a.label,
   dispatched:a.shippedOrders,pending:a.pendingOrders,
   gainedOrders:delta,backlogOrderDays:a.backlogOrderDays,
   backlogOrderDaysDelta:a.backlogOrderDays-base.backlogOrderDays,
   modeledCommitmentCLP:a.incrementalCommitmentAndCostProxyCLP,
   urgentPurchaseCommitmentCLP:a.urgentPurchasePrincipalCLP,
   illustrativeUrgencySurchargeCLP:a.urgentSurchargeCLP,
   modeledReinforcementCLP:a.addedCapacityCostCLP,
   costCoverage,
   fullIncrementalCostCLP:null,
   modeledPhysicalGain:delta>0,
   modeledFeasibility:'physical-ledger-reconciled',
   executionFeasibility:'not-verified',
   externalSupplierCommitmentVerified:false,
   customerDeliveryVerified:false
  };
 });
 const wait=alternatives[0],improving=alternatives.filter(a=>a.gainedOrders>0);
 const isCostComparable=a=>a.costCoverage==='partially-modeled';
 // Never make a "cheap" claim for reserve merely because the transfer
 // has no calibrated price. Only modeled components are compared.
 const serviceSort=(a,b)=>b.dispatched-a.dispatched||
  a.backlogOrderDays-b.backlogOrderDays||
  (isCostComparable(a)&&isCostComparable(b)
   ?a.modeledCommitmentCLP-b.modeledCommitmentCLP:0)||
  ORDER[a.option]-ORDER[b.option];
 const commitmentsSort=(a,b)=>a.modeledCommitmentCLP-b.modeledCommitmentCLP||
  b.gainedOrders-a.gainedOrders||
  a.backlogOrderDays-b.backlogOrderDays||
  ORDER[a.option]-ORDER[b.option];
 const costComparable=improving.filter(isCostComparable);
 const leader=improving.length===0?wait:
  priority==='service'?[...improving].sort(serviceSort)[0]:
  [...costComparable].sort(commitmentsSort)[0]??null;
 const outcome=improving.length===0?'no-observed-gain':
  leader===null?'cost-information-insufficient':'conditional-recommendation';
 const why=outcome==='no-observed-gain'
  ?'Ninguna alternativa añade pedidos expedidos frente a no intervenir dentro del horizonte. No comprometer recursos solo por la apariencia de actividad.'
  :outcome==='cost-information-insufficient'
   ?'Hay mejora física simulada, pero no existe una intervención recuperadora con componentes de compromisos comparables. La reserva carece de costo de traslado calibrado: no se presenta como gratuita.'
   :priority==='service'
    ?'Prioriza más pedidos expedidos desde el CD y, si empatan, menos días-pedido pendientes. Los importes modelados no demuestran rentabilidad.'
    :'Entre alternativas con mejora y partidas modeladas, prioriza el menor compromiso/costo parcial supuesto; no es costo total real ni elección financieramente aprobada.';
 return freeze({
  passed:true,scope:'sku-cohort',type:'conditional-recovery-guidance',
  baselineKey:comparison.baselineKey,horizonDays:comparison.horizonDays,
  demandOrders:comparison.demandOrders,priority,outcome,
  recommendedOption:leader?.option??null,
  recommended:leader??null,
  baseline:{dispatched:base.completed,pending:base.pending,
   backlogOrderDays:base.backlogOrderDays},
  alternatives,optionsWithObservedGain:improving.length,
  optionsWithGainAndModeledCommitments:costComparable.length,
  why,
  checks:{sameFrozenPhysicalComparison:true,wholeOrdersOnly:true,
   sameOriginalBaseline:true,allFiveOptionsReviewed:true,
   noUnpricedReserveCostRank:true,noExternalFeasibilityAssumed:true},
  guardrails:{
   fullCostKnown:false,operationalExecutionValidated:false,
   customerDeliveriesMeasured:false,
   requiredBeforeExecuting:[
    'Validar disponibilidad del proveedor y plazos reales cuando corresponda',
    'Cotizar traslados internos, personal y servicios no tarifados',
    'Verificar capacidad real, inventario disponible y restricciones de seguridad',
    'Confirmar compromisos comerciales, transporte y costo financiero'
   ]
  },
  note:'Recomendación condicional, no orden automática ni plan de personal. Solo se observaron expediciones desde el CD en una simulación determinista; no OTIF ni entregas al cliente. Los montos comparables son compromisos de compra, recargo supuesto y refuerzo activado, no gasto total, caja pagada o utilidad. Los costos de reserva no calibrados no son CLP 0.'
 });
}
