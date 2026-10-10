import {SKU_CATALOG} from './sku.js';

const total=(items,fn)=>items.reduce((sum,item)=>sum+fn(item),0);
const nonnegative=value=>Number.isSafeInteger(value)&&value>=0;
function freeze(value){
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(freeze);
  Object.freeze(value);
 }
 return value;
}
function fail(reason){throw new Error('Calidad SKU: '+reason)}

/**
 * M3-09: read-only, physical quality lot ledger for one campaign.
 *
 * Receipt at the CD creates a lot held by Quality; a dated positive release
 * is the ONLY way for that lot to become potentially pickable. The modeled
 * daily release percentage describes processing pace, not defect/rejection.
 * No additional stock or quality events are generated here.
 */
export function qualityLotReadModel({replay,receipts,qualityReleases,qualityLots}={}){
 if(!Array.isArray(replay?.ledger)||!Array.isArray(receipts)
  ||!Array.isArray(qualityReleases)||!Array.isArray(qualityLots)
  ||!nonnegative(replay.days)||replay.days>365
  ||replay.ledger.length!==replay.days+1
  ||!Number.isFinite(replay.qualityReleasePercent)
  ||replay.qualityReleasePercent<0||replay.qualityReleasePercent>100){
  fail('faltan eventos físicos o un porcentaje válido');
 }
 const ids=SKU_CATALOG.map(sku=>sku.id);
 const receiptByLot=new Map();
 for(const r of receipts){
  if(!r||typeof r.lotId!=='string'||!r.lotId||receiptByLot.has(r.lotId)
   ||!ids.includes(r.skuId)||!nonnegative(r.qty)||r.qty===0
   ||!nonnegative(r.day)||r.day>replay.days
   ||typeof r.purchaseOrderId!=='string'||!r.purchaseOrderId){
   fail('lote recibido duplicado, negativo o sin orden');
  }
  receiptByLot.set(r.lotId,r);
 }
 const currentLots=new Map(),orderedLots=[],releasedIds=new Set();
 let cumulativeReceived=0,cumulativeReleased=0,heldSkuDays=0,peakHeld=0,peakDay=0;
 const daily=[];
 for(let day=0;day<=replay.days;day++){
  const physics=replay.ledger[day];
  if(physics?.day!==day||!Array.isArray(physics.receiptEvents)
   ||!Array.isArray(physics.releaseEvents)){
   fail('falta el día físico de Calidad');
  }
  const newReceipts=receipts.filter(r=>r.day===day);
  if(newReceipts.length!==physics.receiptEvents.length
   ||newReceipts.some(r=>!physics.receiptEvents.some(e=>
    e.lotId===r.lotId&&e.purchaseOrderId===r.purchaseOrderId
    &&e.skuId===r.skuId&&e.qty===r.qty&&e.day===day))){
   fail('ingresos no coinciden con los lotes de Recepción');
  }
  for(const r of newReceipts){
   const item={lotId:r.lotId,skuId:r.skuId,purchaseOrderId:r.purchaseOrderId,
    receiptId:r.id,receivedDay:day,receivedSkuUnits:r.qty,
    releasedSkuUnits:0,heldSkuUnits:r.qty,firstReleaseDay:null,lastReleaseDay:null,releaseIds:[]};
   currentLots.set(item.lotId,item);
   orderedLots.push(item);
  }
  const arrivals=total(newReceipts,r=>r.qty);
  cumulativeReceived+=arrivals;
  const beforeRelease=total(orderedLots,l=>l.heldSkuUnits);
  let budget=Math.ceil(beforeRelease*replay.qualityReleasePercent/100);
  const expected=new Map();
  for(const lot of orderedLots){
   if(budget<=0)break;
   if(lot.heldSkuUnits<=0)continue;
   const qty=Math.min(lot.heldSkuUnits,budget);
   expected.set(lot.lotId,qty);
   budget-=qty;
  }
  const releases=qualityReleases.filter(r=>r.day===day);
  if(releases.length!==physics.releaseEvents.length
   ||releases.some(r=>!physics.releaseEvents.some(e=>e.lotId===r.lotId
    &&e.skuId===r.skuId&&e.qty===r.qty&&e.day===day))){
   fail('liberaciones difieren de los eventos de Calidad');
  }
  const seenToday=new Set();
  for(const r of releases){
   const lot=currentLots.get(r.lotId);
   if(!lot||typeof r.id!=='string'||releasedIds.has(r.id)
    ||seenToday.has(r.lotId)||lot.skuId!==r.skuId
    ||!nonnegative(r.qty)||r.qty===0||r.day<lot.receivedDay
    ||expected.get(r.lotId)!==r.qty){
    fail('liberación sin lote, anticipada o fuera del plan FIFO');
   }
   seenToday.add(r.lotId);releasedIds.add(r.id);
   lot.heldSkuUnits-=r.qty;lot.releasedSkuUnits+=r.qty;
   lot.firstReleaseDay??=day;lot.lastReleaseDay=day;
   lot.releaseIds.push(r.id);
  }
  if(seenToday.size!==expected.size){
   fail('faltan liberaciones programadas para los lotes');
  }
  const releasedToday=total(releases,r=>r.qty);
  cumulativeReleased+=releasedToday;
  const waiting=total(orderedLots,l=>l.heldSkuUnits);
  const heldBySku=Object.fromEntries(ids.map(id=>[id,total(orderedLots.filter(l=>l.skuId===id),l=>l.heldSkuUnits)]));
  const observed=physics.heldQuality||{};
  if(waiting!==physics.waitingQuality
   ||waiting!==cumulativeReceived-cumulativeReleased
   ||ids.some(id=>observed[id]!==heldBySku[id]||physics.released?.[id]!==
    total(releases.filter(r=>r.skuId===id),r=>r.qty))){
   fail('retención diaria no concilia con el libro físico');
  }
  heldSkuDays+=waiting;
  if(waiting>peakHeld){peakHeld=waiting;peakDay=day}
  const oldestWaitingDays=orderedLots.filter(l=>l.heldSkuUnits>0)
   .reduce((max,l)=>Math.max(max,day-l.receivedDay),0);
  daily.push({day,receivedSkuUnits:arrivals,releasedSkuUnits:releasedToday,
   heldSkuUnits:waiting,heldBySku,oldestWaitingDays,
   receiptLots:newReceipts.length,releaseEvents:releases.length});
 }
 if(qualityLots.length!==orderedLots.length||receiptByLot.size!==qualityLots.length){
  fail('la cantidad de lotes de Calidad no coincide con Recepción');
 }
 for(const actual of qualityLots){
  const lot=currentLots.get(actual?.id);
  if(!lot||actual.receiptId!==lot.receiptId||actual.skuId!==lot.skuId
   ||actual.receivedDay!==lot.receivedDay
   ||actual.receivedQty!==lot.receivedSkuUnits
   ||actual.releasedQty!==lot.releasedSkuUnits
   ||actual.heldQty!==lot.heldSkuUnits)fail('lote físico modificado o incompleto');
 }
 const totals={
  receivedSkuUnits:cumulativeReceived,releasedSkuUnits:cumulativeReleased,
  closingHeldSkuUnits:total(orderedLots,l=>l.heldSkuUnits),
  peakHeldSkuUnits:peakHeld,peakHeldDay:peakDay,
  heldSkuDays,receivedLots:orderedLots.length,
  lotsFullyReleased:orderedLots.filter(l=>l.heldSkuUnits===0).length,
  lotsStillHeld:orderedLots.filter(l=>l.heldSkuUnits>0).length,
  rejectedSkuUnits:0
 };
 if(totals.closingHeldSkuUnits!==replay.waitingQuality
  ||totals.receivedSkuUnits!==totals.releasedSkuUnits+totals.closingHeldSkuUnits){
  fail('la conservación del stock retenido es inválida');
 }
 return freeze({scope:'sku-cohort',horizonDays:replay.days,
  releaseRatePercentPerDay:replay.qualityReleasePercent,
  lots:orderedLots,daily,totals,passed:true,
  boundary:'Las unidades ingresadas permanecen bajo control hasta la liberación documentada por lote y día. Espera ≠ rechazo, defecto ni merma. Liberado ≠ entregado al cliente; Inventario aún verifica disponibilidad para Picking.'
 });
}
