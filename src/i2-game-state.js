import {DEFAULTS} from './engine.js';
import {I2_AREAS,I2_RECOVERIES} from './i2-product-contract.js';
import {I2_MVP_CASE} from './i2-mvp-adapter.js';
import {I2_DEFAULT_SEED,i2ChallengeForSeed} from './i2-challenge-config.js';
import {I2_DEFAULT_ADVANCED,i2ValidateAdvanced} from './i2-advanced-settings.js';
import {i2NormalizeMultiRecovery} from './i2-multi-recovery.js';
import {I2_OPERATIONAL_EVENT_SEEDS,i2OperationalEventsForSeed} from './operational-event-schedule.js';
import {i2ValidateQualityBridge} from './i2-quality-bridge.js';
import {i2ValidateReceivingShift} from './i2-receiving-shift.js';

/** I2-05: only educational choices and navigation are saved.
 * Never persist a physical SKU ledger, a recovery preview or V1's session. */
export const I2_GAME_STORAGE_KEY='supply-lab-i2-v1';
export const I2_GAME_SCHEMA=2;
const SEED=I2_DEFAULT_SEED; // el caso por defecto respeta todas las partidas anteriores
const PHASES=Object.freeze(['intro','area','reveal','recover','review','result']);
const ARRIVALS=Object.freeze([1,2,5,10,13]);
const COVERAGES=Object.freeze([0,25,50,75,100]);

export function newI2GameState({seed=SEED,advanced=I2_DEFAULT_ADVANCED,
 eventSeed=null,guidedScenario=null}={}){
 // No se acepta una semilla libre ni un resultado dictado por el jugador.
 i2ChallengeForSeed(seed);
 const config=i2ValidateAdvanced(advanced);
 if(guidedScenario!==null&&(seed!=='alpha-case-01'||
   config.stockProfile!=='low'||config.pickingLimitSkuPerDay!=='base'))
  throw new Error('I2-35.2: configuración guiada incompatible');
 if(eventSeed!==null&&!I2_OPERATIONAL_EVENT_SEEDS.includes(eventSeed))
  throw new Error('I2-35.5c: evento de misión desconocido');
 if(guidedScenario!==null&&
   (guidedScenario!=='quality-low-stock'||eventSeed!==null))
  throw new Error('I2-35.2: misión guiada inválida');
 return {
  schema:I2_GAME_SCHEMA,campaignId:I2_MVP_CASE.campaignId,seed,
  phase:'intro',substep:'briefing',index:0,
  choices:Object.fromEntries(I2_AREAS.map(a=>[a.id,DEFAULTS[a.id]])),
  recovery:'wait',arrivalDay:2,coverage:100,advanced:config,
  confirmedAreas:[],reveal:false,
  // Absent for legacy games: opt-in and never a silent migration to an incident.
  ...(eventSeed===null?{}:{eventSeed}),
  ...(guidedScenario===null?{}:{guidedScenario})
 };
}
function stepFor(phase){
 return {intro:'briefing',area:'decision',reveal:'shock',
  recover:'intervention',review:'plan-review',result:'learning'}[phase];
}

/**
 * Migrates historical v1 saves, verifies every option and removes all unknown
 * or sensitive/physical fields. Null means irrecoverably malformed.
 * No DOM, network or browser globals; safe to run in isolated Node tests.
 */
export function normalizeI2GameState(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||![1,2].includes(raw.schema)
  ||!PHASES.includes(raw.phase)||!Number.isSafeInteger(raw.index)
  ||raw.index<0||raw.index>=I2_AREAS.length||typeof raw.reveal!=='boolean'
  ||!ARRIVALS.includes(raw.arrivalDay)||!COVERAGES.includes(raw.coverage)
  ||!I2_RECOVERIES.some(r=>r.optionId===raw.recovery)
  ||!raw.choices||typeof raw.choices!=='object'||Array.isArray(raw.choices)
  ||Object.keys(raw.choices).some(k=>!I2_AREAS.some(a=>a.id===k))
  ||!Array.isArray(raw.confirmedAreas)){
  return null;
 }
 // An optional, independently committed operational scenario; never derive it
 // from demand seed, score, budget or a player's area choices.
 if(Object.hasOwn(raw,'eventSeed')&&
   !I2_OPERATIONAL_EVENT_SEEDS.includes(raw.eventSeed))return null;
 const eventSeed=raw.eventSeed??null;
 // Only a known optional guided mission may be persisted. It never coexists
 // with the independent operational incident, and old saves remain unchanged.
 if(Object.hasOwn(raw,'guidedScenario')&&
    (raw.guidedScenario!=='quality-low-stock'||eventSeed!==null))return null;
 const guidedScenario=raw.guidedScenario??null;
 const isV2=raw.schema===I2_GAME_SCHEMA;
 if(isV2){
  if(raw.campaignId!==I2_MVP_CASE.campaignId)return null;
  try{i2ChallengeForSeed(raw.seed)}catch{return null}
 }
 // Migración aditiva de esquemas históricos: al faltar configuración,
 // los valores anteriores siguen produciendo la misma simulación.
 let advanced;
 try{advanced=i2ValidateAdvanced(raw.advanced??I2_DEFAULT_ADVANCED)}catch{return null}
 // El marcador guiado no puede ocultar otro perfil o una semilla distinta.
 if(guidedScenario&&(advanced.stockProfile!=='low'||
    advanced.pickingLimitSkuPerDay!=='base'||raw.seed!=='alpha-case-01'))return null;
 const choices={};
 for(const area of I2_AREAS){
  const optionId=raw.choices[area.id];
  if(!area.choices.some(c=>c.optionId===optionId))return null;
  choices[area.id]=optionId;
 }
 const confirmed=new Set();
 for(const id of raw.confirmedAreas){
  if(!I2_AREAS.some(a=>a.id===id)||confirmed.has(id))return null;
  confirmed.add(id);
 }
 // A committed multi-plan is an additive optional event; historical V1/V2
 // save shapes remain byte-for-byte unaffected when this property is absent.
 // Never persist recovered orders, expense figures or physical ledger.
 let recoveryConfirmation=null;
 if(Object.hasOwn(raw,'recoveryConfirmation')){
  const c=raw.recoveryConfirmation;
  if(!c||typeof c!=='object'||Array.isArray(c)
   ||Object.keys(c).sort().join(',')!=='actions,baselineKey,observedOrders,plannedOrders,seed,version'
   ||c.version!==1||typeof c.baselineKey!=='string'
   ||c.baselineKey.length<10||c.baselineKey.length>2500
   ||typeof c.seed!=='string'||c.seed!==raw.seed
   ||c.plannedOrders!==advanced.plannedOrders
   ||!Number.isSafeInteger(c.observedOrders)||c.observedOrders<=0
   ||!raw.reveal||!['recover','review','result'].includes(raw.phase)
   ||confirmed.size!==I2_AREAS.length)return null;
  let actions;
  try{actions=i2NormalizeMultiRecovery(c.actions)}catch{return null}
  if(JSON.stringify(actions)!==JSON.stringify(c.actions))return null;
  if(actions.reserveTransfer.enabled&&(advanced.reservePercent??0)!==25)return null;
  recoveryConfirmation={
   version:1,seed:c.seed,plannedOrders:c.plannedOrders,
   observedOrders:c.observedOrders,baselineKey:c.baselineKey,actions
  };
 }
 // A second dated response is additive to the frozen first command.
 // It cannot activate earlier-day actions or rewrite the first PO manifest.
 let incidentStep=null,incidentFirstActions=null,incidentSecondDecision=null;
 let operationalResponse=null,receivingResponse=null;
 if(Object.hasOwn(raw,'receivingResponse')){
  if(!recoveryConfirmation||!eventSeed||
    i2OperationalEventsForSeed(eventSeed)[0]?.kind!=='receiving-stop')return null;
  try{
   receivingResponse=i2ValidateReceivingShift(
    raw.receivingResponse,i2OperationalEventsForSeed(eventSeed));
  }catch{return null}
  if(!receivingResponse)return null;
 }
 // La orden tardía del día 4 solo existe cuando hubo autorización
 // explícita en la jornada observada 3. No aceptar una fecha libre.
 const receivingFollowupIssuedDay=receivingResponse?.day===4?3:null;
 if(receivingFollowupIssuedDay!==null){
  if(raw.receivingFollowupIssuedDay!==3
   ||(raw.incidentViewDay!==undefined&&raw.incidentViewDay<3))
   return null;
 }else if(Object.hasOwn(raw,'receivingFollowupIssuedDay'))return null;
 // I2-35.8b: Compras e Inventario admiten decisiones nuevas en el día 3,
 // siempre con efecto día 4. Las fechas no son inputs editables libres.
 // El segundo incidente conserva estas órdenes ya comprometidas.
 const day3FollowupValid=()=>eventSeed!==null
  &&i2OperationalEventsForSeed(eventSeed)[0]?.kind==='receiving-stop'
  &&recoveryConfirmation!==null
  &&(raw.phase==='result'||raw.phase==='review'
   ||(raw.phase==='recover'&&(
    (Number.isSafeInteger(raw.incidentViewDay)&&raw.incidentViewDay>=3)
    ||raw.incidentStep===1||raw.incidentStep===2)));
 const purchaseFollowupIssuedDay=Object.hasOwn(raw,'purchaseFollowupIssuedDay')?3:null;
 if(purchaseFollowupIssuedDay!==null&&(
  raw.purchaseFollowupIssuedDay!==3||!day3FollowupValid()
  ||!recoveryConfirmation.actions.urgentPurchase.enabled
  ||recoveryConfirmation.actions.urgentPurchase.arrivalDay!==4
  ||recoveryConfirmation.actions.urgentPurchase.coveragePercent!==100))
  return null;
 const reserveFollowupIssuedDay=Object.hasOwn(raw,'reserveFollowupIssuedDay')?3:null;
 if(reserveFollowupIssuedDay!==null&&(
  raw.reserveFollowupIssuedDay!==3||!day3FollowupValid()
  ||(advanced.reservePercent??0)!==25
  ||!recoveryConfirmation.actions.reserveTransfer.enabled
  ||recoveryConfirmation.actions.reserveTransfer.releaseDay!==4))
  return null;
 if(Object.hasOwn(raw,'incidentStep')){
  if(![1,2].includes(raw.incidentStep)||!Number.isSafeInteger(raw.incidentStep)
   ||!recoveryConfirmation||!raw.eventSeed
   ||i2OperationalEventsForSeed(raw.eventSeed).length!==2)return null;
  incidentStep=raw.incidentStep;
  // No admitir un cierre forzado después de observar el segundo incidente.
  if(incidentStep===1&&raw.phase==='result')return null;
  if(incidentStep===2){
   const allowed=['hold','urgent-next','reserve-next','urgent-and-reserve','quality-bridge'];
   if(!allowed.includes(raw.incidentSecondDecision)||!raw.incidentFirstActions)
    return null;
   try{
    incidentFirstActions=i2NormalizeMultiRecovery(raw.incidentFirstActions);
    if(JSON.stringify(incidentFirstActions)!==JSON.stringify(raw.incidentFirstActions))
     return null;
   }catch{return null}
   incidentSecondDecision=raw.incidentSecondDecision;
   if(incidentSecondDecision==='quality-bridge'){
    try{
     operationalResponse=i2ValidateQualityBridge(
      raw.operationalResponse,i2OperationalEventsForSeed(raw.eventSeed));
    }catch{return null}
    if(!operationalResponse)return null;
   }else if(Object.hasOwn(raw,'operationalResponse'))return null;
   const first=incidentFirstActions,last=recoveryConfirmation.actions;
   const secondDay=i2OperationalEventsForSeed(raw.eventSeed)[1].startDay;
   const buy=['urgent-next','urgent-and-reserve'].includes(incidentSecondDecision);
   const reserve=['reserve-next','urgent-and-reserve'].includes(incidentSecondDecision);
   if(first.capacityBoost.enabled||last.capacityBoost.enabled
    ||(first.urgentPurchase.enabled&&(
      !last.urgentPurchase.enabled||
      first.urgentPurchase.arrivalDay!==last.urgentPurchase.arrivalDay||
      first.urgentPurchase.coveragePercent!==last.urgentPurchase.coveragePercent))
    ||(first.reserveTransfer.enabled&&(
      !last.reserveTransfer.enabled||
      first.reserveTransfer.releaseDay!==last.reserveTransfer.releaseDay))
    ||(buy&&(first.urgentPurchase.enabled||!last.urgentPurchase.enabled
      ||last.urgentPurchase.arrivalDay!==secondDay+1))
    ||(!buy&&first.urgentPurchase.enabled!==last.urgentPurchase.enabled)
    ||(reserve&&(first.reserveTransfer.enabled||!last.reserveTransfer.enabled
      ||last.reserveTransfer.releaseDay!==secondDay+1))
    ||(!reserve&&first.reserveTransfer.enabled!==last.reserveTransfer.enabled))
    return null;
  }else if(Object.hasOwn(raw,'incidentFirstActions')
     ||Object.hasOwn(raw,'incidentSecondDecision')
     ||Object.hasOwn(raw,'operationalResponse'))return null;
 }else if(Object.hasOwn(raw,'incidentFirstActions')
   ||Object.hasOwn(raw,'incidentSecondDecision')
   ||Object.hasOwn(raw,'operationalResponse'))return null;
 // Daily journal is OPTIONAL for legacy saves. Its bounds are tied to the
 // already committed response and to the earliest unobserved incident.
 let incidentViewDay=null;
 if(Object.hasOwn(raw,'incidentViewDay')){
  const n=raw.incidentViewDay;
  if(!Number.isSafeInteger(n)||!recoveryConfirmation||!eventSeed
   ||raw.phase!=='recover')return null;
  const events=i2OperationalEventsForSeed(eventSeed);
  const firstDay=events[0].startDay;
  if(incidentStep===1){
   if(events.length!==2||n<=firstDay||n>=events[1].startDay)
    return null;
  }else if(incidentStep===2){
   if(events.length!==2||n<=events[1].startDay||n>12)return null;
  }else if(events.length!==1||n<=firstDay||n>12)return null;
  incidentViewDay=n;
 }
 // Commit order is exactly the sequence of the eight operational areas.
 // Returning to a past step or intro is allowed, but never changing the plan
 // after the reveal or skipping a planning area.
 const expectedPrefix=I2_AREAS.slice(0,confirmed.size).map(a=>a.id);
 if([...confirmed].some((id,i)=>id!==expectedPrefix[i]))return null;
 if((['reveal','recover','review','result'].includes(raw.phase)&&confirmed.size!==I2_AREAS.length)
  ||(raw.phase==='reveal'&&raw.reveal)
  ||(['recover','review','result'].includes(raw.phase)&&!raw.reveal)
  ||(['intro','area'].includes(raw.phase)&&raw.reveal)
  ||(raw.phase==='intro'&&raw.index!==0)){
  return null;
 }
 return {
  schema:I2_GAME_SCHEMA,campaignId:I2_MVP_CASE.campaignId,seed:isV2?raw.seed:SEED,
  phase:raw.phase,substep:stepFor(raw.phase),index:raw.index,
  choices,recovery:raw.recovery,arrivalDay:raw.arrivalDay,coverage:raw.coverage,
  advanced,
  confirmedAreas:[...confirmed],reveal:raw.reveal,
  ...(eventSeed===null?{}:{eventSeed}),
  ...(guidedScenario===null?{}:{guidedScenario}),
  ...(recoveryConfirmation===null?{}:{recoveryConfirmation}),
  ...(incidentStep===null?{}:{incidentStep}),
  ...(incidentViewDay===null?{}:{incidentViewDay}),
  ...(operationalResponse===null?{}:{operationalResponse}),
  ...(receivingResponse===null?{}:{receivingResponse}),
  ...(receivingFollowupIssuedDay===null?{}:{receivingFollowupIssuedDay}),
  ...(purchaseFollowupIssuedDay===null?{}:{purchaseFollowupIssuedDay}),
  ...(reserveFollowupIssuedDay===null?{}:{reserveFollowupIssuedDay}),
  ...(incidentFirstActions===null?{}:{
   incidentFirstActions,incidentSecondDecision
  })
 };
}
export function saveI2GameState(storage,state){
 const safe=normalizeI2GameState(state);
 if(!safe)throw new Error('I2-05: estado de juego inválido');
 // Only the game key, never 'supply-lab-v90'.
 storage.setItem(I2_GAME_STORAGE_KEY,JSON.stringify(safe));
 return safe;
}
export function loadI2GameState(storage){
 try{
  const json=storage.getItem(I2_GAME_STORAGE_KEY);
  if(json===null)return newI2GameState();
  const raw=JSON.parse(json);
  const result=normalizeI2GameState(raw);
  if(!result)return newI2GameState();
  if(raw.schema!==I2_GAME_SCHEMA){
   // Best-effort upgrade; valid old progress still works in a storage-limited browser.
   try{saveI2GameState(storage,result)}catch{}
  }
  return result;
 }catch{return newI2GameState()}
}
