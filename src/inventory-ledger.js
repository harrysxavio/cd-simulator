import {SKU_CATALOG} from './sku.js';

const add=(xs,fn)=>xs.reduce((n,x)=>n+fn(x),0);
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
const fail=s=>{throw new Error('Inventario SKU: '+s)};
/** M3-10. Read-only reconciliation of the ONE physical replay, not new stock. */
export function physicalInventoryReadModel({replay,openingState,receipts,qualityReleases,reserveTransfers,shipments,inventoryMovements,receivingLedger,qualityLedger,campaignId}={}){
 if(!Array.isArray(replay?.ledger)||!openingState||![receipts,qualityReleases,reserveTransfers,shipments,inventoryMovements].every(Array.isArray)
 ||!receivingLedger?.passed||!qualityLedger?.passed||!valid(replay.days)||replay.ledger.length!==replay.days+1
 ||!Number.isFinite(replay.inventoryAccuracyPercent)||replay.inventoryAccuracyPercent<0||replay.inventoryAccuracyPercent>100
 ||typeof campaignId!=='string'||!campaignId)fail('faltan registros físicos válidos');
 const ids=SKU_CATALOG.map(x=>x.id),accuracy=replay.inventoryAccuracyPercent;
 const bySku={};
 for(const id of ids){
  const open=openingState.openingBySku?.[id],reserve=openingState.reserveBySku?.[id];
  if(!valid(open)||!valid(reserve)||reserve>open||replay.initial?.[id]!==open||replay.openingReserve?.[id]!==reserve)fail('apertura o reserva inválida');
  bySku[id]={openingSkuUnits:open,receivedSkuUnits:0,releasedSkuUnits:0,transferredSkuUnits:0,shippedSkuUnits:0,pickFaceSkuUnits:open-reserve,reserveSkuUnits:reserve,qualityHeldSkuUnits:0};
 }
 const expected=[
  ...ids.map(skuId=>({id:campaignId+'-OPEN-'+skuId,day:-1,type:'opening',skuId,qty:bySku[skuId].openingSkuUnits})),
  ...reserveTransfers.map(x=>({id:x.id,day:x.day,type:'reserve_to_pickface',skuId:x.skuId,qty:x.qty,from:x.from,to:x.to})),
  ...receipts.map(x=>({id:x.id,day:x.day,type:'receipt_into_quality',skuId:x.skuId,qty:x.qty,lotId:x.lotId})),
  ...qualityReleases.map(x=>({id:x.id,day:x.day,type:'quality_to_available',skuId:x.skuId,qty:x.qty,lotId:x.lotId})),
  ...shipments.flatMap(x=>Object.entries(x.lines||{}).map(([skuId,qty])=>({id:x.id+'-'+skuId,day:x.day,type:'dispatched',skuId,qty,orderId:x.orderId})))
 ];
 const signature=x=>JSON.stringify([x.id,x.type,x.day,x.skuId,x.qty,x.lotId??null,x.orderId??null,x.from??null,x.to??null]);
 const observed=new Map();
 for(const x of inventoryMovements){
  if(!x||!ids.includes(x.skuId)||!valid(x.qty)||!Number.isInteger(x.day)||x.day< -1||x.day>replay.days
   ||typeof x.id!=='string'||observed.has(x.id)||(x.type!=='opening'&&x.qty===0))fail('movimiento falso o duplicado');
  observed.set(x.id,signature(x));
 }
 if(expected.length!==observed.size||expected.some(x=>observed.get(x.id)!==signature(x)))fail('movimientos no concilian con eventos');
 const daily=[];
 for(let day=0;day<=replay.days;day++){
  const journal=replay.ledger[day];if(journal?.day!==day)fail('día ausente');
  const rows=[];
  for(const id of ids){
   const s=bySku[id];
   const moved=add(reserveTransfers.filter(x=>x.day===day&&x.skuId===id),x=>x.qty);
   const received=add(receipts.filter(x=>x.day===day&&x.skuId===id),x=>x.qty);
   const released=add(qualityReleases.filter(x=>x.day===day&&x.skuId===id),x=>x.qty);
   const shipped=add(shipments.filter(x=>x.day===day),x=>x.lines[id]||0);
   if(![moved,received,released,shipped].every(valid)||moved>s.reserveSkuUnits||released>s.qualityHeldSkuUnits+received)fail('traslado o liberación sin saldo');
   s.reserveSkuUnits-=moved;s.pickFaceSkuUnits+=moved+released;
   s.qualityHeldSkuUnits+=received-released;
   const verifiedBefore=Math.floor(s.pickFaceSkuUnits*accuracy/100);
   if(shipped>verifiedBefore)fail('Picking usó stock no disponible');
   s.pickFaceSkuUnits-=shipped;
   s.receivedSkuUnits+=received;s.releasedSkuUnits+=released;s.transferredSkuUnits+=moved;s.shippedSkuUnits+=shipped;
   const verified=verifiedBefore-shipped,unverified=s.pickFaceSkuUnits-verified;
   const physical=s.pickFaceSkuUnits+s.reserveSkuUnits+s.qualityHeldSkuUnits;
   if(![s.pickFaceSkuUnits,s.reserveSkuUnits,s.qualityHeldSkuUnits,verified,unverified].every(valid)
    ||physical!==s.openingSkuUnits+s.receivedSkuUnits-s.shippedSkuUnits
    ||journal.stock?.[id]!==s.pickFaceSkuUnits||journal.reserveStock?.[id]!==s.reserveSkuUnits
    ||journal.heldQuality?.[id]!==s.qualityHeldSkuUnits||journal.pickableStock?.[id]!==verified
    ||journal.unverifiedStock?.[id]!==unverified||journal.received?.[id]!==received
    ||journal.released?.[id]!==released||journal.movedReserve?.[id]!==moved)fail('saldo diario por SKU/ubicación');
   rows.push({skuId:id,openingSkuUnits:s.openingSkuUnits,receivedTodaySkuUnits:received,releasedTodaySkuUnits:released,transferredTodaySkuUnits:moved,shippedTodaySkuUnits:shipped,pickFaceSkuUnits:s.pickFaceSkuUnits,reserveSkuUnits:s.reserveSkuUnits,qualityHeldSkuUnits:s.qualityHeldSkuUnits,verifiedSkuUnits:verified,unverifiedSkuUnits:unverified,physicalSkuUnits:physical});
  }
  const n=k=>add(rows,x=>x[k]);
  if(n('receivedTodaySkuUnits')!==receivingLedger.daily[day]?.receivedSkuUnits
   ||n('releasedTodaySkuUnits')!==qualityLedger.daily[day]?.releasedSkuUnits
   ||n('qualityHeldSkuUnits')!==qualityLedger.daily[day]?.heldSkuUnits
   ||n('shippedTodaySkuUnits')!==journal.shippedUnits)fail('balance de áreas físicas');
  daily.push({day,bySku:rows,receivedSkuUnits:n('receivedTodaySkuUnits'),releasedSkuUnits:n('releasedTodaySkuUnits'),transferredSkuUnits:n('transferredTodaySkuUnits'),shippedSkuUnits:n('shippedTodaySkuUnits'),pickFaceSkuUnits:n('pickFaceSkuUnits'),reserveSkuUnits:n('reserveSkuUnits'),qualityHeldSkuUnits:n('qualityHeldSkuUnits'),verifiedSkuUnits:n('verifiedSkuUnits'),unverifiedSkuUnits:n('unverifiedSkuUnits'),physicalSkuUnits:n('physicalSkuUnits')});
 }
 const end=daily.at(-1);
 const totals={openingSkuUnits:add(ids,id=>bySku[id].openingSkuUnits),receivedSkuUnits:add(ids,id=>bySku[id].receivedSkuUnits),releasedSkuUnits:add(ids,id=>bySku[id].releasedSkuUnits),internalTransfersSkuUnits:add(ids,id=>bySku[id].transferredSkuUnits),shippedSkuUnits:add(ids,id=>bySku[id].shippedSkuUnits),pickFaceSkuUnits:end.pickFaceSkuUnits,reserveSkuUnits:end.reserveSkuUnits,qualityHeldSkuUnits:end.qualityHeldSkuUnits,verifiedSkuUnits:end.verifiedSkuUnits,unverifiedSkuUnits:end.unverifiedSkuUnits,physicalSkuUnits:end.physicalSkuUnits};
 if(totals.openingSkuUnits+totals.receivedSkuUnits!==totals.shippedSkuUnits+totals.physicalSkuUnits||totals.pickFaceSkuUnits!==totals.verifiedSkuUnits+totals.unverifiedSkuUnits)fail('conservación física global');
 return freeze({scope:'sku-cohort',horizonDays:replay.days,accuracyPercent:accuracy,daily,totals,passed:true,boundary:'Stock físico = PICK-FACE + RESERVA-CD + Calidad retenida. La fracción no verificable también existe: no representa merma. Traslados internos no generan nuevas unidades y despacho del CD no prueba entrega al cliente.'});
}
