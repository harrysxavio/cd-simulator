import {normalizeI2GameState} from './i2-game-state.js';
import {i2CompareMultiRecovery} from './i2-multi-recovery.js';
import {i2OperationalEventsForSeed} from './operational-event-schedule.js';

const invalid=msg=>{throw new Error('I2-35.5c3b: '+msg)};
const total=record=>Object.values(record??{}).reduce((n,x)=>n+x,0);
const frozen=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const child of Object.values(value))frozen(child);
  Object.freeze(value);
 }
 return value;
};

/**
 * Read-only one-day observation; never return future ledger entries,
 * end-of-period outcomes, or incidents not yet observed.
 * Replays are recalculated from the committed commands, not saved as stock.
 */
export function i2DailyOperationsSnapshot(raw){
 const s=normalizeI2GameState(raw);
 if(!s||s.phase!=='recover'||!s.eventSeed||!s.recoveryConfirmation
  ||!Number.isInteger(s.incidentViewDay))
  invalid('no hay una jornada operacional abierta');
 const incidents=i2OperationalEventsForSeed(s.eventSeed);
 const dayNumber=s.incidentViewDay;
 const options=i2CompareMultiRecovery({
  state:s,plans:[s.recoveryConfirmation.actions]
 });
 const replay=options.results[0].comparison.recovered;
 const day=replay.ledger[dayNumber];
 const previous=replay.ledger[dayNumber-1];
 if(!day||!previous||day.day!==dayNumber||previous.day!==dayNumber-1
  ||day.completed<previous.completed||day.backlog<0)
  invalid('jornada no concilia con el motor físico');
 const known=incidents.filter(e=>e.startDay<=dayNumber);
 const active=day.activeOperationalEvents.map(e=>({
  kind:e.kind,startedDay:e.startDay,
  description:e.kind==='receiving-stop'
   ?'Recepción temporalmente detenida':'Calidad suspendió liberaciones'
 }));
 if(active.length!==known.filter(e=>
   dayNumber>=e.startDay&&dayNumber<e.startDay+e.durationDays).length)
  invalid('la evidencia de incidentes activos no concilia');
 return frozen({
  day:dayNumber,horizonDays:replay.days,
  newlyShippedOrders:day.shipped,shippedOrdersToDate:day.completed,
  pendingOrders:day.backlog,
  receivedSkuUnits:total(day.received),
  releasedSkuUnits:total(day.released),
  waitingDockSkuUnits:day.waitingReceiving,
  waitingQualitySkuUnits:day.waitingQuality,
  activeIncidents:active,
  // Deliberately do not return: future incident dates, final projected
  // dispatch, future costs, campaign-wide replay or hidden outcome.
  note:'Observación exclusivamente de esta jornada. Expedidos desde CD no significa entregados al cliente.'
 });
}
