import {i2EvaluateObjectives,i2ValidateObjectives} from './i2-management-objectives.js';
import {normalizeI2GameState} from './i2-game-state.js';

/** I2-34: Nico's result lessons and ONE earned badge are read-only.
 * Every award requires measured service + expense + pending evidence.
 * A selected button, purchased option or extra shift is never an award. */
const fail=why=>{throw new Error('I2-34: '+why)};
const count=n=>Number.isSafeInteger(n)&&n>=0;
const freeze=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  for(const v of Object.values(x))freeze(v);
  Object.freeze(x);
 }
 return x;
};
export const I2_EVIDENCE_AWARDS=freeze([
 {id:'prudence',name:'Decisión prudente',description:'No intervenir cuando el servicio y el costo ya cumplen, con cola final bajo control.'},
 {id:'clear-dispatch',name:'Cierre sin pendientes',description:'Expedir toda la muestra sin superar la meta de gasto incremental.'},
 {id:'effective-recovery',name:'Recuperación con criterio',description:'Recuperar pedidos, alcanzar la meta de servicio, controlar cola y respetar presupuesto.'},
 {id:'balanced-service',name:'Equilibrio de gestión',description:'Cumplir simultáneamente servicio, límite de gasto y cola tolerable.'}
]);
function activePlan(state){
 if(state.recoveryConfirmation){
  const a=state.recoveryConfirmation.actions;
  return {
   mode:'multi',
   description:[
    a.urgentPurchase.enabled?'Compra urgente con '+a.urgentPurchase.coveragePercent+' % de cobertura; llegada prevista día '+a.urgentPurchase.arrivalDay:null,
    a.reserveTransfer.enabled?'Traslado de reserva físicamente existente desde el día '+a.reserveTransfer.releaseDay:null,
    a.capacityBoost.enabled?'Refuerzo adicional modelado de preparación y expedición':null
   ].filter(Boolean)
  };
 }
 const labels={wait:'No intervenir',overtime:'Solicitar refuerzo operativo',
  reserve:'Trasladar reserva física',emergency:'Solicitar compra urgente',
  combined:'Compra urgente y refuerzo operativo'};
 return {mode:'classic',description:state.recovery==='wait'?[]:[labels[state.recovery]]};
}
export function i2NicoEvidenceLearning({state,scorecard,board,economics,objectives}={}){
 const safe=normalizeI2GameState(state);
 const cfg=i2ValidateObjectives(objectives);
 if(!safe||safe.phase!=='result'||safe.reveal!==true||safe.confirmedAreas.length!==8
  ||scorecard?.status!=='revealed-canonical'||scorecard.scope!=='sku-cohort'
  ||scorecard.horizonDays!==12
  ||board?.kind!=='i2-manager-result-board'
  ||board.scope!=='sku-cohort'||board.horizonDays!==12
  ||board.mode!==(safe.recoveryConfirmation?'multi':'classic')
  ||economics?.kind!=='i2-economic-manager-reading'
  ||economics.scope!=='sku-cohort'||economics.horizonDays!==12
  ||economics.selected?.status!=='audited-illustrative-not-PnL'
  ||economics.original?.baselineKey!==economics.selected?.baselineKey
  ||economics.unknown?.netProfitCLP!==null
  ||economics.unknown?.ebitdaCLP!==null
  ||economics.unknown?.customerDeliveries!==null)
  fail('resultado no revelado, no conciliado o con supuestos de contabilidad ficticia');
 const evaluation=i2EvaluateObjectives(scorecard,cfg);
 const s=scorecard.shippedOrders.value,n=scorecard.actualOrders.value;
 const pending=scorecard.pendingOrders.value;
 const base=scorecard.baselineShipped.value;
 const delta=scorecard.recoveredOrders.value;
 const expense=scorecard.incrementalExpense.value;
 const ratio=100*pending/n;
 const timeStatus=pending===0?'green':ratio<=10?'amber':'red';
 if(!count(s)||!count(n)||n===0||!count(pending)||!count(base)
  ||!Number.isSafeInteger(delta)||!count(expense)||s+pending!==n
  ||delta!==s-base||economics.change.recoveredOrders!==delta
  ||economics.change.incrementalExpenseCLP!==expense
  ||economics.change.costPerRecoveredOrderCLP!==(delta>0?expense/delta:null)
  ||economics.selected.ordersShipped!==s
  ||economics.original.ordersShipped!==base
  ||economics.selected.modeledIncrementalExpenseCLP!==expense
  ||economics.original.modeledIncrementalExpenseCLP!==0
  ||board.headline.dispatchedOrders!==s
  ||board.headline.pendingOrders!==pending
  ||board.headline.observedOrders!==n
  ||!Array.isArray(board.axes)||board.axes.length!==4
  ||board.axes.map(a=>a.id).join(',')!=='service,capacity,cost,time'
  ||board.axes[0].status!==evaluation.service.status
  ||board.axes[2].status!==evaluation.expense.status
  ||board.axes[3].status!==timeStatus
  ||board.axes[1].status!=='unknown'
  ||board.axes[0].value!==evaluation.service.actualPercent
  ||board.axes[2].value!==expense
  ||board.axes[3].value!==pending)
  fail('fórmulas, ejes, metas o costos del resultado han sido alterados');
 const plan=activePlan(safe);
 const isWait=plan.description.length===0;
 const serviceMet=evaluation.service.status==='green';
 const budgetMet=evaluation.expense.status==='green';
 const controlled=timeStatus!=='red';
 const safeAward=serviceMet&&budgetMet&&controlled;
 // At most ONE achievement. Tested ranking avoids stacking praise.
 let badge=null;
 if(safeAward){
  const id=isWait?'prudence':pending===0?'clear-dispatch':
   delta>0?'effective-recovery':'balanced-service';
  const item=I2_EVIDENCE_AWARDS.find(a=>a.id===id);
  badge={...item,proof:{
   actualServicePercent:evaluation.service.actualPercent,
   targetServicePercent:evaluation.service.targetPercent,
   modeledExtraExpenseCLP:expense,budgetCLP:cfg.incrementalBudgetCLP,
   pendingOrders:pending,pendingSharePercent:ratio,
   recoveredOrders:delta
  }};
 }
 const facts=[
  'Hecho: el plan original expidió '+base+' de '+n+
   ' pedidos completos y la estrategia elegida expidió '+s+
   ' al cierre del día 12 ('+(delta>=0?'+':'')+delta+' frente al original).',
  'Hecho: quedaron '+pending+' pedidos pendientes ('+ratio.toFixed(1)+
   ' %); la meta de expedición es '+evaluation.service.targetPercent+
   ' % y el resultado fue '+evaluation.service.actualPercent.toFixed(1)+' %.',
  'Hecho: gasto incremental modelado '+expense+' CLP frente al límite '+
   cfg.incrementalBudgetCLP+' CLP. Es un costo parcial, no el costo total del CD.',
  'Hecho: contribución parcial ilustrativa elegida '+
   economics.selected.partialContributionCLP+' CLP frente a '+
   economics.original.partialContributionCLP+' CLP del plan original; no es utilidad.'
 ];
 const good=[];
 if(delta>0)good.push('Se recuperaron '+delta+' pedidos completos sin sumar el efecto de alternativas aisladas.');
 if(serviceMet)good.push('La expedición alcanzó la meta didáctica de servicio.');
 if(budgetMet)good.push('El gasto extra modelado quedó dentro del presupuesto elegido.');
 if(pending===0)good.push('Todos los pedidos observados salieron del CD antes del corte.');
 if(isWait&&safeAward)good.push('No intervenir conservó recursos y cumplió la meta de expedición sin cola crítica.');
 if(!good.length)good.push('El resultado se puede auditar: permite identificar prioridades sin atribuir causalidad falsa.');
 const bad=[];
 if(!serviceMet)bad.push('La expedición no alcanzó la meta de servicio configurada.');
 if(!budgetMet)bad.push('La intervención excedió el límite de gasto incremental configurado.');
 if(!controlled)bad.push('La cola del día 12 supera el 10 % de los pedidos de la muestra.');
 if(delta<0)bad.push('La estrategia elegida expidió menos pedidos que la referencia sin intervenir.');
 if(delta===0&&expense>0)bad.push('Se asumió un gasto adicional sin recuperar pedidos completos dentro de los 12 días.');
 if(!bad.length)bad.push('No hay alertas críticas en los umbrales evaluados; siguen faltando costos y entregas reales.');
 const tradeoffs=[];
 if(delta>0&&expense>0)tradeoffs.push('Recuperar '+delta+' pedidos supuso '+
  expense+' CLP adicionales ('+economics.change.costPerRecoveredOrderCLP.toFixed(0)+
  ' CLP por pedido recuperado). No es un costo unitario integral.');
 if(delta<=0&&expense>0)tradeoffs.push('El gasto extra no se tradujo en un aumento neto de expediciones; revisar el plazo de activación y los cuellos del modelo.');
 if(expense===0)tradeoffs.push('No se incurrió en gasto incremental modelado; esto NO significa que operar el CD fuera gratis.');
 if(pending>0)tradeoffs.push('Quedaron pedidos sin expedir; ahorro de gastos no compensa por sí solo ese riesgo de servicio.');
 tradeoffs.push('Las compras comprometidas, el material consumido y el valor ilustrativo expedido son conceptos diferentes. No duplicar compras como gasto.');
 const hypotheses=[
  pending>0
   ?'Hipótesis a comprobar: revisa las BOM de pedidos pendientes y verifica stock liberado, capacidad de Picking y expedición por jornada antes de elegir otro refuerzo.'
   :'Hipótesis a comprobar: ¿se podría obtener la misma salida del CD con un menor gasto extra en otra combinación?',
  expense>0
   ?'Hipótesis a comprobar: compara una intervención más pequeña o más tardía usando el mismo reto y la misma apertura SKU. El beneficio marginal NO se obtiene sumando alternativas.'
   :'Hipótesis a comprobar: repetir el mismo reto con una acción costosa permitiría identificar si el plan ya era suficiente, sin anticipar su resultado.',
  'Validación faltante en una operación real: medir dotación, horas/persona, costos completos, promesas de entrega y confirmación efectiva del consumidor.'
 ];
 const recommendations=[
  !serviceMet?'Prioriza el servicio: identifica si la espera está en suministro, verificación, preparación o expedición antes de actuar.':
   'Mantén el servicio alcanzado y busca una alternativa que consuma menos recursos sin generar una cola crítica.',
  !budgetMet?'Reformula la inversión: busca una cobertura o capacidad menor y evalúa los pedidos realmente adicionales por CLP.':
   'Protege el límite de gasto: no incrementes capacidad o compras sin una mejora observable en expedición.',
  pending>0?'Revisa el día 12 y el historial de los tres SKU; un pedido exige toda su combinación de unidades.':
   'Revisa los días de mayor trabajo y cuellos ocultos; cero pendientes no prueba productividad por trabajador.'
 ];
 const verdict=!safeAward
  ?'Sin insignia en esta ronda: se requiere servicio cumplido, gasto dentro del límite y cola final no crítica. Una métrica buena no borra otra crítica.'
  :'Insignia ganada por resultados verificables de servicio, gasto y cola. No se entrega por elegir una palanca ni por gastar.';
 return freeze({
  kind:'i2-evidence-based-manager-learning',scope:'sku-cohort',horizonDays:12,
  phase:'result',mode:plan.mode,
  plan:{actions:plan.description,empty:isWait,
   label:isWait?'No intervenir':plan.mode==='multi'?'Combinación confirmada':'Recuperación clásica'},
  evidence:{facts,service:evaluation.service.status,
   cost:evaluation.expense.status,queue:timeStatus,actual:n,dispatched:s,
   originalDispatched:base,pending,recovered:delta,
   incrementalExpenseCLP:expense,budgetCLP:cfg.incrementalBudgetCLP,
   financialOutcome:'illustrative-partial-contribution-not-profit'},
  learning:{good,bad,tradeoffs,hypotheses,recommendations,verdict},
  award:badge,
  awardRules:'Una insignia máximo, con servicio verde, costo verde y cola no crítica. No depende de clics, gastos, elección de palanca o cantidad de acciones.',
  source:'i2SafeScorecard + i2EvaluateObjectives + i2ManagerResultBoard + i2EconomicManagerReading (V1 audit), estado confirmado',
  boundary:'Hechos observados son del MOTOR DIDÁCTICO SKU, no de una empresa real. Causas propuestas son HIPÓTESIS. Expedición CD no demuestra entrega al cliente. Contribución parcial no es rentabilidad ni EBITDA.'
 });
}
