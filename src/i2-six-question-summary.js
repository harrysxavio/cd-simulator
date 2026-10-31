/**
 * I2-37.1 (corte 1) · Six-question executive summary for the player.
 *
 * A pure read model: it MUST only use the audited scorecard and objectives.
 * It never reruns physics, predicts demand, or assumes delivery to the customer.
 */
const safeCount=n=>Number.isSafeInteger(n)&&n>=0;
const safeMoney=n=>Number.isSafeInteger(n)&&n>=0;
const freeze=value=>Object.freeze(value);

export function i2SixQuestionSummary(score,evaluation){
 if(score?.status!=='revealed-canonical'||score.scope!=='sku-cohort'
   ||score.horizonDays!==12||score.customerDeliveredOrders!==null
   ||score.totalCostCLP!==null||score.netProfitCLP!==null
   ||!evaluation||!['green','amber','red'].includes(evaluation.service?.status)
   ||!['green','amber','red'].includes(evaluation.expense?.status))
  throw new Error('I2-37.1: requiere evaluación posterior a revelación');
 const actual=score.actualOrders?.value,shipped=score.shippedOrders?.value;
 const pending=score.pendingOrders?.value,baseline=score.baselineShipped?.value;
 const recovered=score.recoveredOrders?.value,expense=score.incrementalExpense?.value;
 const budget=evaluation.expense.budgetCLP,target=evaluation.service.targetPercent;
 if(![actual,shipped,pending,baseline].every(safeCount)||actual===0
   ||!Number.isSafeInteger(recovered)||!safeMoney(expense)
   ||!safeMoney(budget)||typeof target!=='number'
   ||target<0||target>100||shipped+pending!==actual
   ||shipped-baseline!==recovered
   ||evaluation.expense.valueCLP!==expense)
  throw new Error('I2-37.1: cantidades y gasto no concilian');
 const numeral=n=>new Intl.NumberFormat('es-CL').format(n);
 const currency=n=>new Intl.NumberFormat('es-CL',{
  style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
 const next=evaluation.service.status==='red'
  ?'Antes de agregar gasto, verifica qué SKU o capacidad limita los pedidos completos.'
  :evaluation.expense.status==='red'
   ?'Repite la misma misión probando menos acciones y compara el gasto marginal.'
   :pending>0
    ?'Repite con otra política y compara los pedidos pendientes manteniendo la misma demanda.'
    :'Compara con no intervenir: ¿habrías obtenido una salida similar sin ese gasto?';
 const gain=recovered>0
  ?'Se expidieron '+numeral(recovered)+' pedidos más que sin intervenir.'
  :recovered===0
   ?'No aumentaron los pedidos expedidos frente a no intervenir.'
   :'Se expidieron '+numeral(Math.abs(recovered))+' pedidos menos que sin intervenir.';
 const rows=[
  {id:'objective',question:'1. ¿Qué debía lograr?',answer:
   'Meta de expedición '+target+' % y límite de gasto incremental '+currency(budget)+'.'},
  {id:'outcome',question:'2. ¿Qué sucedió?',answer:
   numeral(shipped)+' de '+numeral(actual)+' pedidos expedidos; '+numeral(pending)+' pendientes al día 12.'},
  {id:'delta',question:'3. ¿Qué cambió con mi decisión?',answer:gain},
  {id:'cost',question:'4. ¿Qué sacrifiqué?',answer:
   'Gasto extra modelado '+currency(expense)+
   (recovered>0?' ('+currency(Math.round(expense/recovered))+' por pedido adicional expedido).':'.')+
   ' No es costo total ni utilidad.'},
  {id:'customer',question:'5. ¿Qué pasó con el cliente?',answer:
   'Sabemos cuáles pedidos salieron del CD; no se mide entrega efectiva al consumidor.'},
  {id:'retry',question:'6. ¿Qué probaría ahora?',answer:next}
 ];
 return freeze({
  title:'Nico · Tu cierre en seis preguntas',
  verdict:evaluation.allGreen
   ?'Cumpliste ambas metas educativas de servicio y gasto extra.'
   :'Revisa el equilibrio: no basta con mejorar un solo indicador.',
  scope:'Mismo escenario, día 12 y resultados del motor SKU auditado.',
  rows:freeze(rows.map(row=>freeze(row))),
  boundary:'Las compras comprometidas no equivalen a pagos; faltan productividad por persona-hora y costo operacional total.'
 });
}
