import {normalizeI2GameState} from './i2-game-state.js';
import {i2OperationalEventsForSeed} from './operational-event-schedule.js';
import {I2_RECEIVING_SHIFT} from './i2-receiving-shift.js';
import {I2_QUALITY_BRIDGE} from './i2-quality-bridge.js';

/**
 * I2-35.7a · Registro de órdenes FECHADAS ya autorizadas por el gerente.
 *
 * NO es un nuevo motor de simulación ni una segunda fuente de inventario.
 * Reconstruye órdenes exclusivamente del estado confirmado, sin almacenar
 * fechas/recursos duplicados y sin leer jornadas posteriores a la observada.
 *
 * "Jornada objetivo alcanzada" NO equivale a SKU físicamente recibidos,
 * liberados o expedidos; esas magnitudes solo las confirma el ledger SKU.
 */
const freeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const x of Object.values(value))freeze(x);
  Object.freeze(value);
 }
 return value;
};
const invalid=message=>{throw new Error('I2-35.7a: '+message)};
const TYPE=Object.freeze({
 buy:{area:'purchasing',title:'Compra urgente de SKU',icon:'🛒'},
 reserve:{area:'inventory',title:'Traslado de reserva existente',icon:'📦'},
 dock:{area:'receiving',title:'Turno extraordinario de Recepción',icon:'🏗️'},
 bridge:{area:'quality',title:'Línea alternativa de Calidad',icon:'🔎'}
});
function makeOrder(kind,number,issuedDay,effectiveDay,currentDay,detail,extraCostCLP=null){
 if(!TYPE[kind]||!Number.isSafeInteger(issuedDay)||issuedDay<1||
  !Number.isSafeInteger(effectiveDay)||effectiveDay<=issuedDay||effectiveDay>12||
  issuedDay>currentDay||!Number.isSafeInteger(currentDay)||currentDay>12||
  (extraCostCLP!==null&&(!Number.isSafeInteger(extraCostCLP)||extraCostCLP<0)))
  invalid('orden fechada fuera de cronología o sin causalidad');
 const type=TYPE[kind];
 return {
  id:'OPS-'+number+'-'+kind.toUpperCase(),
  kind,areaId:type.area,title:type.title,icon:type.icon,
  issuedDay,effectiveDay,detail,extraCostCLP,
  status:effectiveDay>currentDay?'programada':
   effectiveDay===currentDay?'jornada-objetivo':'fecha-objetivo-transcurrida',
  statusLabel:effectiveDay>currentDay?'Pendiente de fecha objetivo':
   effectiveDay===currentDay?'Hoy corresponde su fecha objetivo':
    'La fecha objetivo ya pasó; verificar ejecución física',
  boundary:'Compromiso de operación, no comprobante de unidades efectivamente procesadas.'
 };
}

/**
 * Solo lectura del DIARIO ya abierto. Excluye el segundo incidente y sus
 * decisiones hasta que realmente se observen y se hayan confirmado.
 */
export function i2DatedOrdersForObservedDay(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='recover'||!state.reveal||
  !state.eventSeed||!state.recoveryConfirmation||
  !Number.isSafeInteger(state.incidentViewDay))
  invalid('órdenes visibles únicamente en una jornada operacional observada');
 const day=state.incidentViewDay;
 const events=i2OperationalEventsForSeed(state.eventSeed);
 const first=events[0];
 if(day<=first.startDay)invalid('todavía no comenzó el seguimiento');
 const actions=state.incidentStep===2?state.incidentFirstActions:
  state.recoveryConfirmation.actions;
 if(!actions)invalid('primera orden confirmada no disponible');
 const orders=[];
 const push=(kind,number,issue,effect,detail,cost=null)=>{
  orders.push(makeOrder(kind,number,issue,effect,day,detail,cost));
 };
 if(actions.urgentPurchase.enabled){
  push('buy',1,first.startDay,actions.urgentPurchase.arrivalDay,
   'Cobertura solicitada '+actions.urgentPurchase.coveragePercent+
   ' % del faltante. Llegada prevista, sujeta a Recepción y Calidad.');
 }
 if(actions.reserveTransfer.enabled){
  push('reserve',1,first.startDay,actions.reserveTransfer.releaseDay,
   'Mover unidades previamente separadas: no se crea inventario nuevo.');
 }
 if(state.receivingResponse){
  push('dock',1,first.startDay,I2_RECEIVING_SHIFT.day,
   'Hasta '+I2_RECEIVING_SHIFT.extraCapacitySkuUnits+
   ' cupos SKU adicionales en la jornada contratada.',
   I2_RECEIVING_SHIFT.shiftCostCLP);
 }
 if(state.incidentStep===2){
  const second=events[1];
  if(!second||day<=second.startDay)invalid('segundo incidente no observado');
  const choice=state.incidentSecondDecision;
  const latest=state.recoveryConfirmation.actions;
  if(['urgent-next','urgent-and-reserve'].includes(choice)){
   push('buy',2,second.startDay,latest.urgentPurchase.arrivalDay,
    'Segunda compra autorizada, llegada prevista a Recepción; no adelanta el calendario.');
  }
  if(['reserve-next','urgent-and-reserve'].includes(choice)){
   push('reserve',2,second.startDay,latest.reserveTransfer.releaseDay,
    'Segundo traslado de unidades ya reservadas, sin duplicación de SKU.');
  }
  if(choice==='quality-bridge'){
   push('bridge',2,second.startDay,I2_QUALITY_BRIDGE.day,
    'Hasta '+I2_QUALITY_BRIDGE.capacitySkuUnits+
    ' SKU liberables por línea certificada alternativa; parada principal continúa.',
    I2_QUALITY_BRIDGE.shiftCostCLP);
  }
 }
 return freeze({
  day,horizonDays:12,orders,
  committedCount:orders.length,
  waitingForDate:orders.filter(x=>x.status==='programada').length,
  objectiveToday:orders.filter(x=>x.status==='jornada-objetivo').length,
  trace:'i2-game-state + calendario de incidentes confirmados + compromisos físicos existentes',
  note:'Las órdenes no son unidades ejecutadas. Para verificar resultados físicos consulta expedidos, muelle, Calidad y el radar diario; los costos de compra y refuerzo global se concilian al cierre.'
 });
}
