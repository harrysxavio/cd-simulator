/**
 * M7-37 · Lectura ejecutiva de resultados físicos en lenguaje sencillo.
 *
 * No decide ni causa cambios: consume el comparador M5-26 ya auditado, valida
 * las cinco alternativas con el lector M7-36 y se limita a interpretar
 * despachos, días-pedido de espera y compromisos parciales.
 */
import {readableRecoveryResultsReadModel} from './recovery-readable-results.js';

const freeze=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  Object.values(x).forEach(freeze);
  Object.freeze(x);
 }
 return x;
};
const signed=x=>Number.isSafeInteger(x)&&Math.abs(x)<=Number.MAX_SAFE_INTEGER;
const status=(delta,betterPositive=true)=>{
 if(delta===0)return 'same';
 return (delta>0)===betterPositive?'better':'worse';
};
export function interpretRecoveryOutcomeReadModel({comparison}={}){
 const readable=readableRecoveryResultsReadModel({comparison,view:'service'});
 const selected=readable.rows.find(row=>row.selected);
 const waiting=readable.rows.find(row=>row.option==='wait');
 const raw=comparison.selected;
 if(!selected||!waiting||!signed(selected.changeDispatched)
  ||selected.dispatched!==raw.shippedOrders
  ||selected.pending!==raw.pendingOrders
  ||!Number.isSafeInteger(raw.backlogOrderDays)||raw.backlogOrderDays<0
  ||!Number.isSafeInteger(comparison.baseline.backlogOrderDays)
  ||comparison.baseline.backlogOrderDays<0
  ||raw.ordersDelta!==selected.changeDispatched
  ||selected.dispatched+selected.pending!==readable.orders){
  throw new Error('Lectura de resultado: las cifras físicas no concilian');
 }
 const ordersDelta=selected.changeDispatched;
 const delayDelta=raw.backlogOrderDays-comparison.baseline.backlogOrderDays;
 if(!signed(delayDelta))throw new Error('Lectura de resultado: espera no conciliable');
 const resultStatus=status(ordersDelta);
 const delayStatus=status(delayDelta,false);
 const costStatus=selected.costStatus;
 const costNumber=selected.visibleCommitmentCLP;
 const physicalMessage=resultStatus==='better'
  ?'Mejoró el servicio simulado: '+ordersDelta+' pedidos completos adicionales salieron del CD.'
  :resultStatus==='worse'
   ?'Empeoró el servicio simulado: '+Math.abs(ordersDelta)+' pedidos menos salieron del CD.'
   :'El servicio no cambió: salen los mismos pedidos completos que sin intervenir.';
 const delayMessage=delayStatus==='better'
  ?'Disminuyó la espera acumulada en '+Math.abs(delayDelta)+' días-pedido.'
  :delayStatus==='worse'
   ?'Aumentó la espera acumulada en '+delayDelta+' días-pedido.'
   :'La espera acumulada no cambió frente a no intervenir.';
 const costMessage=costStatus==='unknown-reserve-transfer'
  ?'Traslado de reserva sin tarifa: su costo total es desconocido, aunque el proxy modelado sea CLP 0.'
  :costStatus==='no-new-modeled-action'
   ?'No activaste una intervención adicional; el costo total de la operación no es CLP 0.'
   :'Se modelan CLP '+Math.round(costNumber)+
    ' de compras urgentes, recargos o refuerzos adicionales. No es gasto total real ni caja pagada.';
 const caution=ordersDelta<=0&&costStatus==='partial-components-only'&&costNumber>0
  ?'Advertencia: hay compromisos adicionales modelados sin mejora en pedidos expedidos.'
  :ordersDelta>0&&delayDelta>0
   ?'Atención: salen más pedidos, pero la espera acumulada aumenta. Una mejora no garantiza mejorar todas las métricas.'
   :costStatus==='unknown-reserve-transfer'
    ?'Falta tarifar el traslado antes de comparar financieramente esta opción.'
    :ordersDelta>0?'La mejora es física y simulada; aún falta comprobar su costo integral y ejecución real.'
     :'Revisa restricciones físicas y recursos antes de comprometer más gastos.';
 return freeze({
  passed:true,scope:'sku-cohort',type:'what-improved-what-worsened',
  baselineKey:readable.baselineKey,
  selectedOption:readable.selectedOption,
  orders:readable.orders,horizonDays:readable.horizonDays,
  baseline:{dispatched:readable.baseline.dispatched,pending:readable.baseline.pending,
   backlogOrderDays:comparison.baseline.backlogOrderDays},
  current:{dispatched:selected.dispatched,pending:selected.pending,
   backlogOrderDays:raw.backlogOrderDays},
  signals:[
   {id:'service',status:resultStatus,delta:ordersDelta,label:'Pedidos expedidos',
    text:physicalMessage,unit:'pedidos completos'},
   {id:'waiting',status:delayStatus,delta:delayDelta,label:'Espera acumulada',
    text:delayMessage,unit:'días-pedido'},
   {id:'cost',status:costStatus==='unknown-reserve-transfer'?'unknown':
      costStatus==='no-new-modeled-action'?'same':'partial',
    delta:null,label:'Compromisos económicos',
    text:costMessage,unit:'CLP parcial/no tarifado'}
  ],
  headline:resultStatus==='better'?'Más pedidos despachados':
   resultStatus==='worse'?'Menos pedidos despachados':'Mismos pedidos despachados',
  caution,
  limitations:[
   'Expedición desde el CD no equivale a entrega confirmada al cliente.',
   'Los pedidos pendientes no tienen una fecha prometida de entrega.',
   'No se acredita costo total, caja real, utilidad ni factibilidad de proveedores.',
   'Son cinco alternativas de la misma cohorte SKU; no sumar con unidades de la jornada agregada.'
  ],
  checks:{commonBaseline:true,physicalOrdersReconciled:true,
   noFullCostOrRootCauseAsserted:true,readOnly:true},
  note:'Lectura educativa de efectos observados, no recomendación obligatoria ni diagnóstico de causa raíz única.'
 });
}
