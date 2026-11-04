import {normalizeI2GameState} from './i2-game-state.js';
import {i2OperationalEventsForSeed} from './operational-event-schedule.js';
import {i2CompareMultiRecovery,i2EmptyRecoveryActions,i2NormalizeMultiRecovery} from './i2-multi-recovery.js';
import {i2ConfirmMultiRecovery} from './i2-recovery-confirmation.js';
import {I2_QUALITY_BRIDGE} from './i2-quality-bridge.js';
import {I2_RECEIVING_SHIFT} from './i2-receiving-shift.js';

const invalid=reason=>{throw new Error('I2-35.5c2: '+reason)};
const freeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const item of Object.values(value))freeze(item);
  Object.freeze(value);
 }
 return value;
};
const OPTIONS=Object.freeze(['wait','urgent-fast','urgent-conservative','reserve-next','buy-and-reserve','dock-shift']);

/**
 * Primer checkpoint gerencial realmente posterior a una interrupción.
 * Se calcula el ledger de referencia, pero se entrega SOLO el snapshot de la
 * jornada observada. Nunca se devuelven eventos futuros ni resultado final.
 */
export function i2IncidentDecisionCheckpoint(raw,{index=0}={}){
 const state=normalizeI2GameState(raw);
 if(!state||!state.eventSeed||!state.reveal
   ||!['recover','review','result'].includes(state.phase))
  invalid('el evento solo se observa luego de confirmar y revelar la campaña');
 const calendar=i2OperationalEventsForSeed(state.eventSeed);
 const first=calendar[index];
 if(!first||first.startDay>=12||!Number.isInteger(index)||![0,1].includes(index))
  invalid('incidente fuera de la cronología');
 if(index===1&&(state.incidentStep!==1||!state.recoveryConfirmation
   ||calendar.length<2||state.incidentViewDay!==undefined))
  invalid('segundo incidente todavía no observable');
 // La segunda observación se obtiene de la operación con la primera orden
 // ya ejecutada, NO de un futuro contrafactual ni del escenario sin acción.
 const firstActions=index===1?state.recoveryConfirmation.actions:i2EmptyRecoveryActions();
 const baseline=i2CompareMultiRecovery({
  state,plans:[firstActions],
  reservePercent:state.advanced.reservePercent??0
 });
 const rows=index===1?baseline.results[0].comparison.recovered.ledger:
  baseline.baseline.integrated.actual.ledger;
 const day=rows[first.startDay],previous=rows[first.startDay-1];
 if(!day||day.day!==first.startDay||!day.activeOperationalEvents.some(e=>e.id===first.id)
   ||(first.kind==='receiving-stop'&&!day.receivingStopped)
   ||(first.kind==='quality-stop'&&!day.qualityStopped)
   ||day.completed<previous.completed)
  invalid('cronología física del incidente no concilia');
 const reserveUnits=Object.values(baseline.baseline.openingState.reserveBySku)
  .reduce((n,x)=>n+x,0);
 const firstReserve=index===1&&firstActions.reserveTransfer.enabled;
 const firstUrgent=index===1&&firstActions.urgentPurchase.enabled;
 // Visible metrics are the snapshot at the opening event, NEVER end-of-campaign
 // totals, hidden future disruptions or strategy counterfactuals.
 return freeze({
  status:'incident-observed',scope:'sku-cohort',
  checkpoint:index+1,decisionDay:first.startDay,
  incidentKind:first.kind,incidentId:first.id,incidentDays:first.durationDays,
  description:first.kind==='receiving-stop'
   ?'El muelle no puede recibir hoy. Las entregas que lleguen esperan en cola.'
   :'Calidad suspendió liberaciones. Los lotes recibidos quedan retenidos.',
  waitingDockSkuUnits:day.waitingReceiving,
  waitingQualitySkuUnits:day.waitingQuality,
  shippedOrdersToDate:day.completed,
  pendingOrdersAtDay:day.backlog,
  previousShippedOrders:previous.completed,
  reserveAvailable:reserveUnits>0&&!firstReserve,
  canBuyUrgent:!firstUrgent,
  nextDay:first.startDay+1,
  conservativeDay:first.startDay+3,
  boundary:'Información hasta el día del primer incidente. No se conocen futuros eventos ni pedidos expedidos al día 12.'
 });
}

/** Las decisiones solo empiezan después del incidente; no hay refuerzo retroactivo. */
export function i2IncidentResponseActions(raw,kind){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='recover'||state.recoveryConfirmation)
  invalid('una respuesta operativa requiere un evento observado y sin confirmación previa');
 if(!OPTIONS.includes(kind))invalid('respuesta desconocida');
 const checkpoint=i2IncidentDecisionCheckpoint(state);
 if(['reserve-next','buy-and-reserve'].includes(kind)&&!checkpoint.reserveAvailable)
  invalid('no existe reserva SKU física preubicada');
 const urgent=['urgent-fast','urgent-conservative','buy-and-reserve'].includes(kind);
 const reserve=['reserve-next','buy-and-reserve'].includes(kind);
 const arrivalDay=kind==='urgent-conservative'
  ?checkpoint.conservativeDay:checkpoint.nextDay;
 const actions=i2NormalizeMultiRecovery({
  urgentPurchase:{enabled:urgent,arrivalDay,coveragePercent:100},
  reserveTransfer:{enabled:reserve,releaseDay:checkpoint.nextDay},
  capacityBoost:{enabled:false}
 });
 if(urgent&&actions.urgentPurchase.arrivalDay<=checkpoint.decisionDay
   ||reserve&&actions.reserveTransfer.releaseDay<=checkpoint.decisionDay)
  invalid('no es válido actuar antes o durante la jornada observada');
 return actions;
}

export function i2ConfirmIncidentResponse(raw,kind){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='recover'||!state.eventSeed)
  invalid('no hay misión operacional activa');
 const confirmed=i2ConfirmMultiRecovery(state,i2IncidentResponseActions(state,kind));
 // The extra Receiving shift is committed after the observed day-2 closure.
 if(kind!=='dock-shift')return confirmed;
 const check=i2IncidentDecisionCheckpoint(state);
 if(check.incidentKind!=='receiving-stop'||check.decisionDay!==2)
  invalid('refuerzo de Recepción no corresponde al incidente observado');
 const final=normalizeI2GameState({...confirmed,receivingResponse:I2_RECEIVING_SHIFT});
 if(!final)invalid('refuerzo de muelle no cumple persistencia');
 return freeze(final);
}

/**
 * Segundo incidente (únicamente misiones con 2 incidentes).
 * La primera orden es INMUTABLE: solo se puede activar una palanca aún libre.
 * Las dos opciones se consolidan en un único replay canónico y se conserva
 * la orden original, la primera decisión y su fecha en el save didáctico.
 */
export function i2ConfirmNextIncidentResponse(raw,kind){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='recover'||state.incidentStep!==1
  ||!state.recoveryConfirmation||state.incidentFirstActions)
  invalid('segundo incidente no habilitado');
 if(!['hold','urgent-next','reserve-next','urgent-and-reserve','quality-bridge'].includes(kind))
  invalid('segunda respuesta desconocida');
 const check=i2IncidentDecisionCheckpoint(state,{index:1});
 const first=state.recoveryConfirmation.actions;
 const wantBuy=['urgent-next','urgent-and-reserve'].includes(kind);
 const wantReserve=['reserve-next','urgent-and-reserve'].includes(kind);
 if(wantBuy&&!check.canBuyUrgent)invalid('compra urgente ya comprometida en la primera decisión');
 if(wantReserve&&!check.reserveAvailable)invalid('reserva inexistente o ya movilizada');
 const actions=i2NormalizeMultiRecovery({
  urgentPurchase:wantBuy
   ?{enabled:true,arrivalDay:check.nextDay,coveragePercent:100}
   :first.urgentPurchase,
  reserveTransfer:wantReserve
   ?{enabled:true,releaseDay:check.nextDay}
   :first.reserveTransfer,
  capacityBoost:{enabled:false}
 });
 if((wantBuy&&actions.urgentPurchase.arrivalDay<=check.decisionDay)
  ||(wantReserve&&actions.reserveTransfer.releaseDay<=check.decisionDay))
  invalid('intervención con fecha anterior o simultánea al segundo incidente');
 // Reconfirmar la nueva combinación como UNA simulación física, nunca
 // reescribir compras originales ni crear una trayectoria paralela.
 const pending={...state};
 delete pending.recoveryConfirmation;
 delete pending.incidentStep;
 // Reconfirming the purchases requires a temporarily uncommitted action;
 // the original day-3 dock shift is restored verbatim after the second command.
 delete pending.receivingResponse;
 delete pending.receivingFollowupIssuedDay;
 // Segunda incidencia: conservar también la compra autorizada en día 3,
 // pero quitar momentáneamente su marcador al reconfirmar el plan.
 delete pending.urgentFollowupIssuedDay;
 const updated=i2ConfirmMultiRecovery(pending,actions);
 const final=normalizeI2GameState({
  ...updated,incidentStep:2,incidentFirstActions:first,
  incidentSecondDecision:kind,
  ...(state.receivingResponse?{receivingResponse:state.receivingResponse}:{}),
  ...(state.receivingFollowupIssuedDay===3?{receivingFollowupIssuedDay:3}:{}),
  ...(state.urgentFollowupIssuedDay===3?{urgentFollowupIssuedDay:3}:{}),
  ...(kind==='quality-bridge'?{operationalResponse:I2_QUALITY_BRIDGE}:{})
 });
 if(!final)invalid('segunda orden no cumple contrato de persistencia');
 return freeze(final);
}

export const I2_INCIDENT_RESPONSE_OPTIONS=OPTIONS;
