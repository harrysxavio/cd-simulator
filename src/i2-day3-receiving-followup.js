import {normalizeI2GameState} from './i2-game-state.js';
import {i2OperationalEventsForSeed} from './operational-event-schedule.js';
import {i2DailyOperationsSnapshot} from './i2-daily-operations.js';
import {I2_RECEIVING_FOLLOWUP_SHIFT} from './i2-receiving-shift.js';

/**
 * I2-35.8a · Nueva decisión de una jornada intermedia, realmente aplicada
 * por el mismo motor de Recepción. El día 3 no se puede recalcular:
 * el turno recién autorizado solo añade capacidad en el día 4.
 */
export function i2ConfirmDay3ReceivingFollowup(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='recover'||state.incidentViewDay!==3||
  !state.eventSeed||!state.recoveryConfirmation||state.receivingResponse||
  state.incidentStep===2)
  throw new Error('I2-35.8a: turno adicional solo en el día 3 observado y sin uno ya contratado');
 if(i2OperationalEventsForSeed(state.eventSeed)[0]?.kind!=='receiving-stop')
  throw new Error('I2-35.8a: se requiere interrupción real de Recepción en el día 2');
 const before=i2DailyOperationsSnapshot(state);
 const next=normalizeI2GameState({
  ...state,receivingResponse:I2_RECEIVING_FOLLOWUP_SHIFT,
  receivingFollowupIssuedDay:3
 });
 if(!next)throw new Error('I2-35.8a: orden tardía no supera persistencia');
 const after=i2DailyOperationsSnapshot(next);
 // Reproducir exactamente el MISMO día 3 y no modificar ni una unidad
 // ni costo ya ocurrido; el efecto físico se aplica al día 4.
 if(JSON.stringify(before)!==JSON.stringify(after))
  throw new Error('I2-35.8a: orden tardía alteró física de día 3');
 return Object.freeze(next);
}
