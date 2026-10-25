import {NODES} from './engine.js';
import {normalizeI2GameState} from './i2-game-state.js';
import {SKU_CATALOG} from './sku.js';

const QUALITY=NODES.find(area=>area.id==='quality');
const SKU_IDS=SKU_CATALOG.map(s=>s.id);
const PREVIOUS='commercial,planning,purchasing,receiving';
const fail=(why)=>{throw new Error('I2-22: '+why)};
const deepFreeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const part of Object.values(value))deepFreeze(part);
  Object.freeze(value);
 }
 return value;
};
const sum=(list,key)=>list.reduce((n,r)=>n+r[key],0);
const positiveInt=n=>Number.isSafeInteger(n)&&n>0;
const nonnegativeInt=n=>Number.isSafeInteger(n)&&n>=0;

/**
 * Inputs only: the chosen daily release assumption, never the unknown physical
 * demand, supplier arrivals or future observations.
 */
export function i2QualityReleasePreview(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='area'||state.index!==4||state.reveal
  ||state.confirmedAreas.slice(0,4).join(',')!==PREVIOUS)
  fail('Calidad requiere las cuatro áreas anteriores confirmadas');
 const selected=QUALITY.choices.find(c=>c.id===state.choices.quality);
 const reference=QUALITY.choices.find(c=>c.id==='normal');
 if(!selected||!reference||!nonnegativeInt(selected.release)
  ||selected.release>100)fail('tasa de liberación inválida');
 const change=selected.release-reference.release;
 return deepFreeze({
  phase:'pre-reveal',scope:'sku-cohort',status:'release-assumption-only',
  option:selected.id,selectedReleasePercent:selected.release,
  referenceReleasePercent:reference.release,
  differencePoints:change,
  definition:'Se libera por jornada un porcentaje supuesto de lo que está esperando en Calidad, incluidos lotes de días anteriores.',
  example:'Si 40 unidades esperan revisión y hoy logramos liberar 30, las 10 restantes siguen en control. No están perdidas.',
  note:'Revisar más rápido solo ayuda cuando existe mercancía recibida. No crea stock ni omite controles.',
  boundary:'Es un parámetro previo al evento, no una medición de lotes aceptados, rechazos, mermas, resultados ni demanda futura.',
  source:'NODES.quality.choices.release, política de liberación diaria de eventSimulation.'
 });
}

/**
 * Read-only, lot-accurate Quality view of a single, frozen, original replay.
 * An incoming warehouse receipt (lotId) is held until release events for that
 * SAME lot actually make units available. There are no simulated rejects/losses.
 */
export function i2QualityReleaseOutcomeReading(comparison){
 const replay=comparison?.base;
 if(!replay||replay.days!==12||!Array.isArray(replay.ledger)
  ||replay.ledger.length!==replay.days+1)
  fail('faltan eventos físicos del escenario original');
 const pct=replay.qualityReleasePercent;
 if(!Number.isFinite(pct)||pct<0||pct>100)
  fail('tasa física inválida');
 const lots=new Map(),totalsBySku=Object.fromEntries(SKU_IDS.map(id=>[id,{
  receivedSkuUnits:0,releasedSkuUnits:0,heldSkuUnits:0
 }]));
 let prevHeld=0,receivedTotal=0,releasedTotal=0,releasedUnitDays=0;
 const rows=replay.ledger.map((day,i)=>{
  if(day.day!==i||!Array.isArray(day.receiptEvents)||!Array.isArray(day.releaseEvents)
   ||!nonnegativeInt(day.waitingQuality)||!day.received||!day.released||!day.heldQuality)
   fail('diario físico inválido');
  const received=day.receiptEvents.reduce((n,e)=>{
   if(e.urgent||!SKU_IDS.includes(e.skuId)||!positiveInt(e.qty)
    ||e.day!==i||typeof e.lotId!=='string'||lots.has(e.lotId))
    fail('lote de ingreso inválido');
   lots.set(e.lotId,{lotId:e.lotId,skuId:e.skuId,receivedDay:i,
    receivedSkuUnits:e.qty,releasedSkuUnits:0,releaseEvents:[]});
   totalsBySku[e.skuId].receivedSkuUnits+=e.qty;
   return n+e.qty;
  },0);
  const released=day.releaseEvents.reduce((n,e)=>{
   const lot=lots.get(e.lotId);
   if(!lot||lot.skuId!==e.skuId||!positiveInt(e.qty)||e.day!==i
    ||lot.releasedSkuUnits+e.qty>lot.receivedSkuUnits)
    fail('liberación sin lote recibido o exceso físico');
   lot.releasedSkuUnits+=e.qty;
   lot.releaseEvents.push({day:i,qty:e.qty});
   releasedUnitDays+=e.qty*(i-lot.receivedDay);
   totalsBySku[e.skuId].releasedSkuUnits+=e.qty;
   return n+e.qty;
  },0);
  const expectedBudget=Math.ceil((prevHeld+received)*pct/100);
  const expectedReleased=Math.min(prevHeld+received,expectedBudget);
  if(released!==expectedReleased)
   fail('liberación observada difiere del motor y la capacidad elegida');
  const held=prevHeld+received-released;
  if(held!==day.waitingQuality)
   fail('stock retenido no concilia con entradas y salidas');
  for(const skuId of SKU_IDS){
   const skuReceived=day.receiptEvents.filter(e=>e.skuId===skuId)
    .reduce((n,e)=>n+e.qty,0);
   const skuReleased=day.releaseEvents.filter(e=>e.skuId===skuId)
    .reduce((n,e)=>n+e.qty,0);
   if(day.received[skuId]!==skuReceived||day.released[skuId]!==skuReleased)
    fail('totales de eventos por SKU no coinciden');
   const heldSku=totalsBySku[skuId].receivedSkuUnits-
    totalsBySku[skuId].releasedSkuUnits;
   if(!nonnegativeInt(heldSku)||day.heldQuality[skuId]!==heldSku)
    fail('retención por SKU no conciliada');
  }
  receivedTotal+=received;releasedTotal+=released;
  const pendingLots=[...lots.values()].filter(l=>l.receivedSkuUnits>l.releasedSkuUnits);
  const oldest=pendingLots.length?Math.max(...pendingLots.map(l=>i-l.receivedDay)):0;
  prevHeld=held;
  return {
   day:i,receivedSkuUnits:received,releasedSkuUnits:released,
   heldEndOfDaySkuUnits:held,heldLots:pendingLots.length,
   oldestHeldDays:oldest
  };
 });
 if(receivedTotal!==releasedTotal+prevHeld
  ||sum(Object.values(totalsBySku),'receivedSkuUnits')!==receivedTotal
  ||sum(Object.values(totalsBySku),'releasedSkuUnits')!==releasedTotal)
  fail('conservación física de Calidad inválida');
 const lotRows=[...lots.values()].map(lot=>{
  const held=lot.receivedSkuUnits-lot.releasedSkuUnits;
  return {...lot,heldSkuUnits:held,
   firstReleaseDay:lot.releaseEvents[0]?.day??null,
   lastReleaseDay:lot.releaseEvents.at(-1)?.day??null};
 });
 const maxQueue=Math.max(...rows.map(d=>d.heldEndOfDaySkuUnits));
 const pendingSkuDays=rows.slice(0,-1)
  .reduce((n,r)=>n+r.heldEndOfDaySkuUnits,0);
 return deepFreeze({
  phase:'post-reveal',scope:'sku-cohort',horizonDays:replay.days,
  modeledReleasePercent:pct,
  totals:{
   receivedSkuUnits:receivedTotal,
   releasedSkuUnits:releasedTotal,
   heldAtCutoffSkuUnits:prevHeld,
   peakHeldSkuUnits:maxQueue,
   pendingSkuDays,
   lotsReceived:lotRows.length,
   lotsStillHeld:lotRows.filter(l=>l.heldSkuUnits>0).length,
   maxHeldDays:Math.max(...rows.map(r=>r.oldestHeldDays)),
   meanDaysToRelease:releasedTotal?releasedUnitDays/releasedTotal:null
  },
  rows,
  bySku:SKU_IDS.map(skuId=>({skuId,...totalsBySku[skuId],
   heldSkuUnits:totalsBySku[skuId].receivedSkuUnits-
    totalsBySku[skuId].releasedSkuUnits})),
  lots:lotRows,
  source:'comparison.base.ledger: receiptEvents, releaseEvents, waitingQuality y heldQuality del motor físico original.',
  boundary:'Retenido significa pendiente de revisión/liberación, NO rechazado, defectuoso, perdido ni merma. El modelo supone liberación según capacidad y no simula rechazos o inspecciones fallidas. Liberado todavía no significa pedido preparado o expedido.'
 });
}
