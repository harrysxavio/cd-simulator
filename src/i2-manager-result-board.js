import {i2EvaluateObjectives,i2ValidateObjectives} from './i2-management-objectives.js';
import {i2ManagementDiagnosis} from './i2-management-diagnosis.js';

const fail=reason=>{throw new Error('I2-31: '+reason)};
const fixed=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(fixed);Object.freeze(value);
 }
 return value;
};
const count=n=>Number.isSafeInteger(n)&&n>=0;
const statusName={green:'Adecuado',amber:'Atención',red:'Crítico',unknown:'Sin evaluación'};
const statusForBacklog=(pending,actual)=>{
 const share=100*pending/actual;
 return share===0?'green':share<=10?'amber':'red';
};
/**
 * I2-31: standalone read model for the end of a game.
 * Only safe canonical SKU scorecard + original wait-only diagnosis are read.
 * The chosen recovery may be legacy or joint. No physical/economic replay here.
 * Note: neutral productivity axis is deliberate; no labor-hour denominator.
 */
export function i2ManagerResultBoard({state,scorecard,baseline,objectives,mode='classic'}={}){
 if(!['classic','multi'].includes(mode))fail('tipo de intervención inválido');
 const cfg=i2ValidateObjectives(objectives);
 const original=i2ManagementDiagnosis(state,baseline);
 const evaluation=i2EvaluateObjectives(scorecard,cfg);
 const shipped=scorecard?.shippedOrders?.value;
 const actual=scorecard?.actualOrders?.value;
 const pending=scorecard?.pendingOrders?.value;
 const base=scorecard?.baselineShipped?.value;
 const recovered=scorecard?.recoveredOrders?.value;
 const money=scorecard?.incrementalExpense?.value;
 const originalPurchases=scorecard?.committedOriginalPurchases?.value;
 if(![shipped,actual,pending,base,money,originalPurchases].every(count)
  ||!Number.isSafeInteger(recovered)||actual<=0
  ||shipped+pending!==actual||recovered!==shipped-base
  ||base!==original.kpis.dispatchedOrders
  ||actual!==original.kpis.actualOrders
  ||scorecard.scope!=='sku-cohort'||scorecard.horizonDays!==12
  ||scorecard.customerDeliveredOrders!==null||scorecard.totalCostCLP!==null
  ||scorecard.netProfitCLP!==null)
  fail('resultado y baseline físico no concilian');
 const pendingShare=100*pending/actual;
 const throughput=shipped/12;
 const timeStatus=statusForBacklog(pending,actual);
 const e=statusName;
 const axes=[
  {
   id:'service',title:'Servicio desde el CD',
   status:evaluation.service.status,statusLabel:e[evaluation.service.status],
   value:evaluation.service.actualPercent,unit:'%',
   formula:'Pedidos completos expedidos / pedidos observados × 100',
   threshold:'Meta '+evaluation.service.targetPercent+' %; atención desde '+
    Math.max(0,evaluation.service.targetPercent-10)+' %; crítico bajo ese valor',
   explanation:pending>0
    ?'El servicio mide expedición, no promesa cumplida ni entrega efectiva. Hay pedidos sin despachar al cierre.'
    :'Todos los pedidos de la muestra salieron del CD; no contamos entregas en destino.',
   source:'i2SafeScorecard.shippedOrders / actualOrders; i2EvaluateObjectives.service'
  },
  {
   id:'capacity',title:'Capacidad y productividad',
   status:'unknown',statusLabel:e.unknown,
   value:throughput,unit:'pedidos/jornada (media del período)',
   formula:'Pedidos expedidos / 12 jornadas del escenario',
   threshold:'Sin umbral certificado: faltan horas-persona, dotación, capacidad disponible y turnos totales',
   explanation:'Es ritmo medio de salida durante la cohorte. No demuestra productividad del personal ni utilización de capacidad instalada. Aumentar el ritmo también puede encarecer la operación.',
   source:'i2SafeScorecard.shippedOrders / horizonteDays=12'
  },
  {
   id:'cost',title:'Costo incremental modelado',
   status:evaluation.expense.status,statusLabel:e[evaluation.expense.status],
   value:money,unit:'CLP',
   formula:'Compra urgente + recargo + turnos extra modelados de la intervención',
   threshold:'Verde hasta '+cfg.incrementalBudgetCLP+' CLP; atención hasta 110 % del límite; crítico sobre ese valor',
   explanation:'Es solo el gasto extra del plan elegido frente a no intervenir; compras originales comprometidas no son pago ni costo total. La meta presupuestaria no bloquea decisiones.',
   source:'i2SafeScorecard.incrementalExpense; i2EvaluateObjectives.expense'
  },
  {
   id:'time',title:'Tiempo y pedidos pendientes',
   status:timeStatus,statusLabel:e[timeStatus],
   value:pending,unit:'pedidos pendientes al día 12',
   secondary:pendingShare,
   formula:'Pendientes al día 12 / pedidos observados × 100',
   threshold:'Criterio didáctico de cola: verde si 0 pendientes; atención si >0 y hasta 10 %; crítico si supera 10 %',
   explanation:'Un pendiente al día 12 puede deberse a stock o a capacidad: el KPI no atribuye causa. Los eventos de recepción y Calidad mostrados abajo pertenecen al plan ORIGINAL, no a la recuperación.',
   source:'i2SafeScorecard.pendingOrders / actualOrders; horizonte día 12'
  }
 ];
 const wins=[];
 if(recovered>0)wins.push('La intervención recuperó '+recovered+' pedidos completos frente al plan original, sin sumar mejoras de alternativas.');
 if(evaluation.service.status==='green')wins.push('La expedición alcanzó la meta de servicio de '+evaluation.service.targetPercent+' %.');
 if(evaluation.expense.status==='green')wins.push('El gasto extra modelado quedó dentro del límite de '+cfg.incrementalBudgetCLP+' CLP.');
 if(pending===0)wins.push('No quedan pedidos de la muestra pendientes al cierre del día 12.');
 if(wins.length===0)wins.push('El plan original y el escenario recuperado están conciliados; la siguiente mejora debe basarse en las restricciones observadas.');
 const risks=[];
 if(pending>0)risks.push('Quedan '+pending+' pedidos pendientes ('+pendingShare.toFixed(1)+' %). Examina falta de SKU y capacidad antes de atribuir responsabilidades.');
 if(money>cfg.incrementalBudgetCLP)risks.push('El gasto incremental '+money+' CLP supera el límite didáctico '+cfg.incrementalBudgetCLP+' CLP.');
 if(recovered<=0&&money>0)risks.push('Se incurrió en gasto adicional sin recuperar pedidos completos al día 12.');
 if(evaluation.service.status==='red')risks.push('El semáforo de servicio es crítico: mejorar otra métrica no anula esta condición.');
 if(evaluation.expense.status==='red')risks.push('El semáforo económico es crítico, aunque se haya alcanzado la demanda.');
 if(risks.length===0)risks.push('No se observan alertas en servicio, costo incremental ni pendientes con estos umbrales. Productividad real y entrega al cliente siguen desconocidas.');
 const critical=axes.filter(a=>a.status==='red').map(a=>a.title);
 const glance=critical.length
  ?'No hay éxito global: '+critical.join(' y ')+' en estado crítico.'
  :'Se cumplen o no son críticos los umbrales evaluables. La productividad y entrega final aún no se pueden calificar.';
 const questions=[
  pending?'¿Los pedidos pendientes tienen la combinación completa de SKU, o el freno está en preparación/expedición?':'¿La capacidad adicional elegida produjo pedidos útiles o cupos ociosos?',
  money>0?'¿Cuántos pedidos adicionales justifica cada peso incremental, si el beneficio se mide solo en expediciones?':'¿La misma salida del CD pudo lograrse sin inversiones adicionales?',
  '¿Qué datos de turnos, dotación, promesas de entrega y costo operacional total necesitarías para certificar una gestión real?'
 ];
 return fixed({
  kind:'i2-manager-result-board',phase:'result',scope:'sku-cohort',
  horizonDays:12,mode,axes,
  headline:{dispatchedOrders:shipped,pendingOrders:pending,observedOrders:actual},
  coach:{
   title:'La mirada de Nico como gerente',
   verdict:glance,wins,risks,questions,
   comparison:'El plan original expidió '+base+' pedidos; la intervención cambió la salida en '+recovered+' pedidos, con '+money+' CLP de gasto extra modelado.',
   tradeoff:'Cumplir servicio gastando mucho también es una decisión gerencial que merece revisión. Cumplir presupuesto sin servir a los clientes tampoco es suficiente.',
   nextStep:'Compara servicio, cola, costos parciales y hechos físicos. Luego formula hipótesis comprobables, no explicaciones inventadas.'
  },
  originalContext:{
   waitingReceivingSkuUnits:original.queues.waitingReceivingSkuUnits,
   heldQualitySkuUnits:original.queues.heldQualitySkuUnits,
   originalPurchaseCommitmentCLP:originalPurchases,
   label:'Solo escenario original SIN recuperación; unidades SKU distintas de pedidos.'
  },
  limits:'4 ejes de lectura; 3 evaluables con umbrales didácticos, productividad/capacidad real sin denominador válido. Sin costos integrales, rentabilidad ni entregas reales al consumidor.',
  source:'i2SafeScorecard + i2EvaluateObjectives + i2ManagementDiagnosis(option=wait); ninguna simulación física adicional'
 });
}
