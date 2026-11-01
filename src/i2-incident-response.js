import {normalizeI2GameState} from './i2-game-state.js';
import {i2OperationalEventsForSeed} from './operational-event-schedule.js';
import {i2CompareMultiRecovery,i2EmptyRecoveryActions,i2NormalizeMultiRecovery} from './i2-multi-recovery.js';
import {i2ConfirmMultiRecovery} from './i2-recovery-confirmation.js';

const invalid=reason=>{throw new Error('I2-35.5c2: '+reason)};
const freeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const item of Object.values(value))freeze(item);
  Object.freeze(value);
 }
 return value;
};
const OPTIONS=Object.freeze(['wait','urgent-fast','urgent-conservative','reserve-next','buy-and-reserve']);

/**
 * Primer checkpoint gerencial realmente posterior a una interrupción.
 * Se calcula el ledger de referencia, pero se entrega SOLO el snapshot de la
 * jornada observada. Nunca se devuelven eventos futuros ni resultado final.
 */
export function i2IncidentDecisionCheckpoint(raw){
 const state=normalizeI2GameState(raw);
 if(!state||!state.eventSeed||!state.reveal
   ||!['recover','review','result'].includes(state.phase))
  invalid('el evento solo se observa luego de confirmar y revelar la campaña');
 const calendar=i2OperationalEventsForSeed(state.eventSeed);
 const first=calendar[0];
 if(!first||first.startDay>=12)invalid('primer incidente fuera de la decisión');
 const baseline=i2CompareMultiRecovery({
  state,plans:[i2EmptyRecoveryActions()],
  reservePercent:state.advanced.reservePercent??0
 });
 const rows=baseline.baseline.integrated.actual.ledger;
 const day=rows[first.startDay],previous=rows[first.startDay-1];
 if(!day||day.day!==first.startDay||!day.activeOperationalEvents.some(e=>e.id===first.id)
   ||(first.kind==='receiving-stop'&&!day.receivingStopped)
   ||(first.kind==='quality-stop'&&!day.qualityStopped)
   ||day.completed<previous.completed)
  invalid('cronología física del incidente no concilia');
 const reserveUnits=Object.values(baseline.baseline.openingState.reserveBySku)
  .reduce((n,x)=>n+x,0);
 // Visible metrics are the snapshot at the opening event, NEVER end-of-campaign
 // totals, hidden future disruptions or strategy counterfactuals.
 return freeze({
  status:'incident-observed',scope:'sku-cohort',decisionDay:first.startDay,
  incidentKind:first.kind,incidentId:first.id,incidentDays:first.durationDays,
  description:first.kind==='receiving-stop'
   ?'El muelle no puede recibir hoy. Las entregas que lleguen esperan en cola.'
   :'Calidad suspendió liberaciones. Los lotes recibidos quedan retenidos.',
  waitingDockSkuUnits:day.waitingReceiving,
  waitingQualitySkuUnits:day.waitingQuality,
  shippedOrdersToDate:day.completed,
  pendingOrdersAtDay:day.backlog,
  previousShippedOrders:previous.completed,
  reserveAvailable:reserveUnits>0,
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
 return i2ConfirmMultiRecovery(state,i2IncidentResponseActions(state,kind));
}

export const I2_INCIDENT_RESPONSE_OPTIONS=OPTIONS;
