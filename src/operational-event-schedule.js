/**
 * I2-35.5a · Calendario reproducible de incidentes OPERACIONALES.
 *
 * Distinto de demandSeed: cambiar una decisión gerencial o el shock de
 * demanda NO debe reescribir qué incidente externo ocurrió.
 * El código es público: el sellado es narrativo, no criptográfico.
 * No activar este catálogo en /juego/ antes de integrar la persistencia,
 * el instante causal de revelación y las comparaciones de recuperación.
 */
export const I2_OPERATIONAL_EVENT_SEEDS=Object.freeze([
 'ops-dock-01','ops-quality-01','ops-combined-01'
]);

const PRESETS=Object.freeze({
 'ops-dock-01':Object.freeze([
  Object.freeze({id:'EVT-DOCK-01',kind:'receiving-stop',startDay:2,durationDays:1})
 ]),
 'ops-quality-01':Object.freeze([
  Object.freeze({id:'EVT-QUALITY-01',kind:'quality-stop',startDay:4,durationDays:2})
 ]),
 'ops-combined-01':Object.freeze([
  Object.freeze({id:'EVT-DOCK-02',kind:'receiving-stop',startDay:2,durationDays:1}),
  Object.freeze({id:'EVT-QUALITY-02',kind:'quality-stop',startDay:4,durationDays:2})
 ])
});
const validDay=n=>Number.isSafeInteger(n)&&n>=0&&n<=365;
const invalid=message=>{throw new Error('I2-35.5a: '+message)};

/**
 * Estricta frontera del motor: acepta únicamente dos mecanismos físicos
 * modelados. Un incidente de recepción no destruye mercadería: retiene
 * unidades en muelle. Uno de calidad no rechaza lotes: demora su liberación.
 */
export function normalizeOperationalEvents(events=[],days=12){
 if(!validDay(days)||!Array.isArray(events)||events.length>3)
  invalid('calendario operacional inválido');
 const ids=new Set();
 const result=events.map(event=>{
  if(!event||typeof event!=='object'||Array.isArray(event)
   ||Object.keys(event).sort().join(',')!=='durationDays,id,kind,startDay'
   ||typeof event.id!=='string'||!/^EVT-[A-Z0-9-]{1,32}$/.test(event.id)
   ||!['receiving-stop','quality-stop'].includes(event.kind)
   ||!validDay(event.startDay)
   ||!Number.isSafeInteger(event.durationDays)||event.durationDays<1
   ||event.startDay+event.durationDays>days+1
   ||ids.has(event.id))invalid('incidente desconocido, repetido o fuera del horizonte');
  ids.add(event.id);
  return Object.freeze({
   id:event.id,kind:event.kind,
   startDay:event.startDay,durationDays:event.durationDays
  });
 });
 // No registrar dos incidentes incompatibles sobre la misma etapa y jornada.
 for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++){
  const a=result[i],b=result[j];
  if(a.kind===b.kind&&a.startDay<b.startDay+b.durationDays
   &&b.startDay<a.startDay+a.durationDays)
   invalid('dos incidentes solapados sobre la misma etapa');
 }
 return Object.freeze(result.sort((a,b)=>a.startDay-b.startDay||a.id.localeCompare(b.id)));
}

/** Solo la metadata no reveladora es apta para la portada. */
export function i2OperationalEventSealed(seed){
 if(!Object.hasOwn(PRESETS,seed))invalid('semilla operacional inexistente');
 return Object.freeze({
  sealed:true,eventSeedCommitted:true,
  horizonDays:12,scope:'sku-cohort',
  description:'Además de la demanda podría ocurrir una interrupción operacional. Su naturaleza y fecha no se muestran antes de observarla.',
  boundary:'Catálogo público, no compromiso criptográfico.'
 });
}

/** Solo uso después de la revelación correspondiente o en pruebas del motor. */
export function i2OperationalEventsForSeed(eventSeed){
 if(!Object.hasOwn(PRESETS,eventSeed))invalid('semilla operacional inexistente');
 return normalizeOperationalEvents(PRESETS[eventSeed],12);
}
