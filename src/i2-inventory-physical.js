import {NODES} from './engine.js';
import {SKU_CATALOG} from './sku.js';
import {normalizeI2GameState} from './i2-game-state.js';

const INVENTORY=NODES.find(area=>area.id==='inventory');
const IDS=SKU_CATALOG.map(s=>s.id);
const PREFIX='commercial,planning,purchasing,receiving,quality';
const fail=why=>{throw new Error('I2-23: '+why)};
const int=n=>Number.isSafeInteger(n)&&n>=0;
const sum=(rows,key)=>rows.reduce((n,r)=>n+r[key],0);
const freezeDeep=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  Object.values(x).forEach(freezeDeep);
  Object.freeze(x);
 }
 return x;
};
const quantities=(obj,desc)=>{
 if(!obj||typeof obj!=='object'||Array.isArray(obj)||IDS.some(id=>!int(obj[id])))
  fail(desc+' inválidas por SKU');
 return obj;
};
const sumSku=obj=>IDS.reduce((n,id)=>n+obj[id],0);
const keys=(a,b,fn)=>Object.fromEntries(IDS.map(id=>[id,fn(a[id],b[id],id)]));

/** Pure option preview. Does not consult actual demand, result ledger or future receipts. */
export function i2InventoryAccuracyPreview(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='area'||state.index!==5||state.reveal
  ||state.confirmedAreas.slice(0,5).join(',')!==PREFIX)
  fail('Inventario requiere las cinco áreas previas confirmadas');
 const choice=INVENTORY.choices.find(c=>c.id===state.choices.inventory);
 const normal=INVENTORY.choices.find(c=>c.id==='normal');
 if(!choice||!normal||!int(choice.accuracy)||choice.accuracy>100)
  fail('opción de Inventario inválida');
 return freezeDeep({
  phase:'pre-reveal',status:'accuracy-assumption-only',scope:'sku-cohort',
  choice:choice.id,accuracyPercent:choice.accuracy,
  referenceAccuracyPercent:normal.accuracy,
  differencePoints:choice.accuracy-normal.accuracy,
  interpretation:'Es el porcentaje supuesto de unidades localizables y confiables para Picking, no el porcentaje físico que existe.',
  example:'Si tienes 100 unidades físicas y puedes verificar 85, las otras 15 siguen en bodega: hay que ubicarlas o conciliarlas, no comprarlas otra vez.',
  boundary:'Un supuesto antes de la sorpresa. No muestra existencias físicas futuras, demanda observada, inventario perdido, costo ni expedición.',
  source:'NODES.inventory.choices.accuracy / evento pickableStock de eventSimulation.'
 });
}

/**
 * Strict original-physical-ledger read model. End of day:
 * opening + cumulative warehouse receipts - cumulative physical dispatch =
 * pick-face physical + reserved + staged + quality-held.
 * In default mode picking and dispatch coincide; separate-staging mode
 * remains auditable without treating a prepared kit as shipped.
 */
export function i2InventoryPhysicalReading(comparison){
 const r=comparison?.base;
 if(!r||r.days!==12||!Array.isArray(r.ledger)||r.ledger.length!==13)
  fail('escenario físico original no disponible');
 const initial=quantities(r.initial,'Apertura');
 const accuracy=r.inventoryAccuracyPercent;
 if(!Number.isFinite(accuracy)||accuracy<0||accuracy>100)
  fail('tasa verificable inválida');
 const openReserve=quantities(r.openingReserve,'Reserva de apertura');
 let prevReserve={...openReserve},received=Object.fromEntries(IDS.map(id=>[id,0])),
  shipped=Object.fromEntries(IDS.map(id=>[id,0]));
 const rows=r.ledger.map((d,i)=>{
  if(d.day!==i||!Array.isArray(d.reserveEvents)||!Array.isArray(d.receiptEvents)
   ||!Array.isArray(d.releaseEvents)||!Array.isArray(d.shipmentEvents)
   ||!Array.isArray(d.pickEvents))
   fail('faltan movimientos físicos del día '+i);
  const stock=quantities(d.stock,'PICK-FACE'),verified=quantities(d.pickableStock,'Stock verificable'),
   unverified=quantities(d.unverifiedStock,'Stock pendiente de conciliar'),
   reserve=quantities(d.reserveStock,'RESERVA-CD'),
   held=quantities(d.heldQuality,'Control de Calidad'),
   staged=quantities(d.stagingStock,'STAGING-CD');
  const moved=Object.fromEntries(IDS.map(id=>[id,0]));
  for(const e of d.reserveEvents){
   if(e.day!==i||!IDS.includes(e.skuId)||!int(e.qty)||e.qty===0
    ||e.from!=='RESERVA-CD'||e.to!=='PICK-FACE'||e.verified!==true)
    fail('traslado de reserva inválido');
   moved[e.skuId]+=e.qty;
  }
  for(const id of IDS){
   if(reserve[id]!==prevReserve[id]-moved[id])
    fail('reserva trasladada sin conservación física');
   prevReserve[id]=reserve[id];
   if(verified[id]+unverified[id]!==stock[id])
    fail('verificable y sin verificar no suman el stock disponible físico');
  }
  for(const e of d.receiptEvents){
   if(!IDS.includes(e.skuId)||!int(e.qty)||e.qty===0||e.day!==i)
    fail('recibo físico inválido');
   received[e.skuId]+=e.qty;
  }
  for(const e of d.shipmentEvents){
   if(e.day!==i||!int(e.units)||e.units===0||!e.lines)
    fail('expedición física inválida');
   quantities(e.lines,'Líneas expedidas');
   if(sumSku(e.lines)!==e.units)fail('expedición inconsistente por SKU');
   for(const id of IDS)shipped[id]+=e.lines[id];
  }
  const bySku=IDS.map(id=>{
   const physical=stock[id]+reserve[id]+held[id]+staged[id];
   const source=initial[id]+received[id];
   if(source!==physical+shipped[id])
    fail('stock físico creado o perdido para '+id+' en día '+i);
   return {
    skuId:id,openingSkuUnits:initial[id],
    cumulativeReceivedSkuUnits:received[id],
    cumulativeShippedSkuUnits:shipped[id],
    pickFaceSkuUnits:stock[id],verifiableSkuUnits:verified[id],
    notVerifiableSkuUnits:unverified[id],
    reserveSkuUnits:reserve[id],heldQualitySkuUnits:held[id],
    stagingSkuUnits:staged[id],
    movedFromReserveSkuUnits:moved[id],
    physicallyOnSiteSkuUnits:physical
   };
  });
  return {
   day:i,bySku,
   pickFaceSkuUnits:sumSku(stock),
   verifiableSkuUnits:sumSku(verified),
   notVerifiableSkuUnits:sumSku(unverified),
   reserveSkuUnits:sumSku(reserve),
   heldQualitySkuUnits:sumSku(held),
   stagingSkuUnits:sumSku(staged),
   physicallyOnSiteSkuUnits:sum(bySku,'physicallyOnSiteSkuUnits'),
   movedFromReserveSkuUnits:sumSku(moved)
  };
 });
 const last=rows.at(-1);
 const originalPhysical=last.physicallyOnSiteSkuUnits;
 const verify=last.verifiableSkuUnits;
 if(verify>originalPhysical||rows.some(day=>
  day.verifiableSkuUnits+day.notVerifiableSkuUnits!==day.pickFaceSkuUnits))
  fail('verificación excede inventario físico');
 return freezeDeep({
  phase:'post-reveal',scope:'sku-cohort',horizonDays:12,
  modeledAccuracyPercent:accuracy,
  rows,
  totals:{
   physicallyOnSiteSkuUnits:originalPhysical,
   pickFaceSkuUnits:last.pickFaceSkuUnits,
   verifiableSkuUnits:verify,
   notVerifiableSkuUnits:last.notVerifiableSkuUnits,
   reserveSkuUnits:last.reserveSkuUnits,
   heldQualitySkuUnits:last.heldQualitySkuUnits,
   stagingSkuUnits:last.stagingSkuUnits,
   movedFromReserveSkuUnits:sum(rows,'movedFromReserveSkuUnits'),
   openingSkuUnits:sumSku(initial),
   receivedSkuUnits:sumSku(received),
   dispatchedSkuUnits:sumSku(shipped)
  },
  bySku:last.bySku,
  source:'comparison.base.ledger: stock, pickableStock, unverifiedStock, reserveStock, heldQuality, stagingStock, receiptEvents, shipmentEvents, reserveEvents',
  boundary:'Verificable es parte de PICK-FACE, no unidades adicionales. Reserva, staging y Calidad son estados físicos distintos. Lo no verificable sigue físicamente en bodega: no es pérdida ni merma. Un traslado no genera compras, arribos ni expediciones.'
 });
}
