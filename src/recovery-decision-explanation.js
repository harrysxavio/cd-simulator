/**
 * M6-32 · Explicaciones didácticas de cada decisión física SKU.
 *
 * Sólo usa el comparador M5-26, previamente conciliado e inmutable.
 * No genera órdenes, costos, dotaciones, entregas ni nueva simulación.
 */
const fail=s=>{throw new Error('Explicación SKU: '+s)};
const qty=x=>Number.isSafeInteger(x)&&x>=0;
const signed=x=>Number.isSafeInteger(x)&&Math.abs(x)<=Number.MAX_SAFE_INTEGER;
const amount=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=Number.MAX_SAFE_INTEGER;
const close=(a,b)=>Math.abs(a-b)<=Math.max(0.000001,8*Number.EPSILON*Math.max(Math.abs(a),Math.abs(b)));
const freeze=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  for(const y of Object.values(x))freeze(y);
  Object.freeze(x);
 }
 return x;
};
const OPTIONS=Object.freeze(['wait','reserve','overtime','emergency','combined']);
const ACTIONS=Object.freeze({
 wait:'No activar una recuperación adicional: continuar con el abastecimiento y las capacidades ya planificadas.',
 reserve:'Ensayar la habilitación de stock que ya existe en RESERVA-CD. No equivale a una compra nueva.',
 overtime:'Ensayar un refuerzo de capacidad de preparación/expedición modelado durante la campaña.',
 emergency:'Ensayar una compra urgente adicional. Es un compromiso de compra: su llegada y paso por el CD dependen del calendario y las capacidades.',
 combined:'Ensayar juntos el refuerzo operativo y la compra urgente, sin sumar artificialmente los pedidos de dos simulaciones aisladas.'
});

/**
 * Las cinco alternativas provienen de una misma cohorte fija.
 * option sólo controla lo que el alumno está leyendo; nunca una acción guardada.
 */
export function decisionExplanationReadModel({comparison,option}={}){
 if(comparison?.passed!==true||comparison.scope!=='sku-cohort'
  ||!Object.isFrozen(comparison)||!Object.isFrozen(comparison.alternatives)
  ||Object.keys(comparison.checks??{}).length===0
  ||Object.values(comparison.checks).some(x=>x!==true)
  ||!qty(comparison.demandOrders)||!qty(comparison.horizonDays)
  ||!qty(comparison.baseline?.completed)||!qty(comparison.baseline?.pending)
  ||!qty(comparison.baseline?.backlogOrderDays)
  ||comparison.baseline.completed+comparison.baseline.pending!==comparison.demandOrders
  ||!Array.isArray(comparison.alternatives)||comparison.alternatives.length!==5){
  fail('comparador físico no aprobado o modificado');
 }
 const choice=option??comparison.selectedOption;
 if(!OPTIONS.includes(choice))fail('decisión inexistente');
 const by=new Map(comparison.alternatives.map(x=>[x.option,x]));
 if(by.size!==5||!OPTIONS.every(x=>by.has(x)))fail('deben existir cinco alternativas únicas');
 const base=comparison.baseline,orderTotal=comparison.demandOrders;
 // Validate ALL options so an unrelated, corrupt record cannot remain hidden.
 for(const id of OPTIONS){
  const row=by.get(id);
  if(!qty(row.shippedOrders)||!qty(row.pendingOrders)
   ||!qty(row.backlogOrderDays)
   ||row.shippedOrders+row.pendingOrders!==orderTotal
   ||!signed(row.ordersDelta)||!signed(row.pendingDelta)
   ||row.ordersDelta!==row.shippedOrders-base.completed
   ||row.pendingDelta!==-row.ordersDelta
   ||!amount(row.incrementalCommitmentAndCostProxyCLP)
   ||!amount(row.urgentPurchasePrincipalCLP)||!amount(row.urgentSurchargeCLP)
   ||!amount(row.addedCapacityCostCLP)
   ||!close(row.incrementalCommitmentAndCostProxyCLP,
    row.urgentPurchasePrincipalCLP+row.urgentSurchargeCLP+row.addedCapacityCostCLP)
   ||(id==='wait'&&(row.ordersDelta!==0
      ||row.pendingDelta!==0
      ||row.backlogOrderDays!==base.backlogOrderDays
      ||row.incrementalCommitmentAndCostProxyCLP!==0))
   ||(['wait','reserve','overtime'].includes(id)&&row.urgentPurchasePrincipalCLP!==0)
   ||(['wait','reserve','overtime'].includes(id)&&row.urgentSurchargeCLP!==0)
   ||(['wait','reserve','emergency'].includes(id)&&row.addedCapacityCostCLP!==0)
   ||(row.firstDispatchDay!==null&&(!qty(row.firstDispatchDay)
    ||row.firstDispatchDay>comparison.horizonDays))
   ||(row.lastDispatchDay!==null&&(!qty(row.lastDispatchDay)
    ||row.lastDispatchDay>comparison.horizonDays))
   ||(row.shippedOrders===0&&(row.firstDispatchDay!==null||row.lastDispatchDay!==null))){
   fail('alternativas, pedidos, calendario o compromisos no concilian');
  }
 }
 const selected=by.get(choice);
 const delta=selected.ordersDelta;
 const balance=selected.backlogOrderDays-base.backlogOrderDays;
 const incremental=selected.incrementalCommitmentAndCostProxyCLP;
 const status=choice==='wait'?'no-new-action':
  delta>0?'more-dispatched':
  delta<0?'fewer-dispatched':
  incremental>0?'commitment-no-gain':'no-added-dispatch';
 const effect=choice==='wait'
  ?'Sin intervención: se mantiene el resultado físico original de '+base.completed+
   ' pedidos expedidos y '+base.pending+' pendientes.'
  :'Expedidos desde el CD: '+base.completed+' → '+selected.shippedOrders+
   ' ('+(delta>=0?'+':'')+delta+'); pendientes al corte: '+
   base.pending+' → '+selected.pendingOrders+'. '+
   (delta>0?'Se recuperan pedidos completos en el modelo.':
    delta<0?'La alternativa empeora el número de pedidos expedidos dentro del horizonte.':
    'No se recuperan pedidos completos adicionales en este horizonte.');
 const parts=choice==='reserve'
  ?'El traslado de reserva no tiene tarifa validada; costo desconocido, NO CLP 0.'
  :choice==='wait'
   ?'No se añade gasto por una decisión nueva dentro de este modelo.'
   :'Compromiso/costo incremental ilustrativo CLP '+Math.round(incremental)+
     ' (compra urgente '+Math.round(selected.urgentPurchasePrincipalCLP)+
     ', recargo '+Math.round(selected.urgentSurchargeCLP)+
     ', refuerzo '+Math.round(selected.addedCapacityCostCLP)+'). No es caja pagada ni costo integral.';
 const atCut='Día '+comparison.horizonDays+
  ': '+selected.shippedOrders+' pedidos expedidos de '+orderTotal+
  ' solicitados; '+selected.pendingOrders+' pendientes.';
 const dates=selected.firstDispatchDay===null
  ?'No hay despacho desde el CD dentro del horizonte.'
  :'Primer despacho desde el CD: día '+selected.firstDispatchDay+
   '; último despacho: día '+selected.lastDispatchDay+'.';
 const evidence=[
  {id:'orders',label:'Pedidos completos',baseline:base.completed,observed:selected.shippedOrders,unit:'pedidos'},
  {id:'pending',label:'Pendientes al corte',baseline:base.pending,observed:selected.pendingOrders,unit:'pedidos'},
  {id:'waiting',label:'Tiempo acumulado en espera',baseline:base.backlogOrderDays,observed:selected.backlogOrderDays,unit:'días-pedido'}
 ];
 const limits=[
  'Las colas observadas y los cambios en despachos no identifican por sí solos una causa raíz exclusiva.',
  'Son expediciones simuladas desde el CD; no demuestran entrega final ni OTIF al cliente.',
  'Los importes son componentes ilustrativos de compras y refuerzos, no caja ejecutada, utilidad o costo total.',
  'La disponibilidad real del proveedor, recursos, seguridad y plazos debe verificarse fuera del modelo.'
 ];
 if(choice==='reserve')limits.push('El costo del traslado y de la preparación de reserva no está calibrado; valor desconocido no equivale a cero.');
 if(choice==='combined')limits.push('El efecto combinado viene de una corrida física propia: no se suman recuperaciones aisladas.');
 if(choice==='emergency'||choice==='combined')limits.push('Una orden urgente no equivale a unidades recibidas, aprobadas por Calidad, despachadas o entregadas.');
 return freeze({
  passed:true,scope:'sku-cohort',type:'situation-action-effect-evidence',
  baselineKey:comparison.baselineKey,option:choice,label:selected.label,
  horizonDays:comparison.horizonDays,orders:orderTotal,status,
  situation:'Se solicitan '+orderTotal+' pedidos de la misma cohorte SKU. Sin recuperar, '+
   base.completed+' salen del CD y '+base.pending+' quedan pendientes al día '+
   comparison.horizonDays+'.',
  action:ACTIONS[choice],
  effect,
  evidence:{rows:evidence,atCut,dates,
   backlogDelta:balance,incrementalModeledCommitmentCLP:incremental,
   urgentPurchasePrincipalCLP:selected.urgentPurchasePrincipalCLP,
   urgencySurchargeCLP:selected.urgentSurchargeCLP,
   reinforcedCapacityCostCLP:selected.addedCapacityCostCLP,
   costExplanation:parts},
  limits,
  interpretation:status==='commitment-no-gain'
   ?'Alerta: existe un compromiso adicional en el modelo sin pedidos expedidos adicionales.'
   :status==='more-dispatched'?'Mejora física observada en la simulación; falta verificar la viabilidad y el costo total.'
    :status==='fewer-dispatched'?'Esta alternativa reduce los pedidos despachados en el período comparado.'
     :status==='no-new-action'?'Esperar no activa cambios ni compromisos adicionales modelados.'
      :'El resultado final no gana pedidos; revisar otras restricciones antes de gastar.',
  checks:{sameImmutableBaseline:true,fiveAuditedAlternatives:true,
   wholeOrderConservation:true,commitmentsReconciled:true,
   noUnverifiedCostOrDeliveryClaim:true},
  note:'Explicación educativa condicional: no guarda ni ejecuta la decisión y no reinterpreta unidades agregadas como SKU.'
 });
}
