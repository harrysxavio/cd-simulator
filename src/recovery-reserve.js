import {SKU_CATALOG} from './sku.js';

/**
 * M5-23 · Read-only audit of a dated internal stock relocation.
 *
 * Uses the exact event replay already consumed by Inventario and Valorización.
 * It never adds stock, creates a supplier PO, prices a warehouse labor activity,
 * or claims that moving SKU automatically ships a customer order.
 */
const fail=reason=>{throw new Error('Reserva interna SKU: '+reason)};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const freeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const child of Object.values(value))freeze(child);
  Object.freeze(value);
 }
 return value;
};
const sum=(rows,key)=>rows.reduce((n,row)=>n+row[key],0);

export function reserveTransferTraceReadModel({
 comparison,reserveTransfers,inventoryLedger,inventoryValuation,purchaseOrders
}={}){
 const baseline=comparison?.baselineSnapshot,replay=comparison?.recovered;
 const horizon=replay?.days,selected=comparison?.option==='reserve'||
 (comparison?.option==='multi'&&comparison.multiActions?.reserveTransfer?.enabled===true);
 if(!['wait','reserve','overtime','emergency','combined','multi'].includes(comparison?.option)
  ||baseline?.scope!=='sku-cohort'
  ||baseline.integrated!==comparison.integrated
  ||baseline.integrated.actual!==comparison.base
  ||!Object.isFrozen(baseline)
  ||!safe(horizon)||horizon>365||replay.ledger?.length!==horizon+1
  ||!safe(comparison.urgentArrivalDay)||comparison.urgentArrivalDay<1||comparison.urgentArrivalDay>365
  ||!Array.isArray(reserveTransfers)||!Array.isArray(purchaseOrders)
  ||inventoryLedger?.passed!==true||inventoryLedger.scope!=='sku-cohort'
  ||inventoryLedger.horizonDays!==horizon||inventoryLedger.daily?.length!==horizon+1
  ||inventoryValuation?.passed!==true||inventoryValuation.scope!=='sku-cohort'
  ||inventoryValuation.campaignHorizonDays!==horizon||inventoryValuation.daily?.length!==horizon+1
  ||comparison.openingState!==baseline.openingState
  ||!comparison.reserveStock||!replay.openingReserve||!replay.endingReserveStock){
  fail('faltan fuentes canónicas compatibles');
 }
 const ids=SKU_CATALOG.map(x=>x.id),known=new Set(ids);
 const expectedDay=selected?(comparison.option==='multi'
  ?comparison.multiActions.reserveTransfer.releaseDay:comparison.urgentArrivalDay):null;
 const eventsBySku=new Map(ids.map(id=>[id,[]]));
 const knownEventIds=new Set(),uniqueDaySku=new Set();
 for(const movement of reserveTransfers){
  const key=movement?.day+'|'+movement?.skuId;
  if(!selected||!movement||!known.has(movement.skuId)
   ||typeof movement.id!=='string'||!movement.id
   ||knownEventIds.has(movement.id)||uniqueDaySku.has(key)
   ||!safe(movement.qty)||movement.qty===0
   ||!safe(movement.day)||movement.day>horizon||movement.day!==expectedDay
   ||movement.type!=='reserve_transfer'||movement.from!=='RESERVA-CD'
   ||movement.to!=='PICK-FACE'||movement.verified!==true
   ||movement.lotId!==undefined){
   fail('traslado interno duplicado, no autorizado o inventado');
  }
  knownEventIds.add(movement.id);uniqueDaySku.add(key);
  eventsBySku.get(movement.skuId).push(movement);
 }
 const balance=Object.fromEntries(SKU_CATALOG.map(p=>{
  const initial=comparison.openingState.openingBySku?.[p.id],
   reserved=comparison.openingState.reserveBySku?.[p.id];
  if(!safe(initial)||!safe(reserved)||reserved>initial
   ||comparison.reserveStock[p.id]!==reserved
   ||replay.initial?.[p.id]!==initial
   ||replay.openingReserve?.[p.id]!==reserved
   ||baseline.openingState.reserveBySku[p.id]!==reserved){
   fail('reserva inicial no coincide con el stock físico');
  }
  return [p.id,reserved];
 }));
 const daily=[],totalsBySku=Object.fromEntries(ids.map(id=>[id,0]));
 for(let day=0;day<=horizon;day++){
  const physical=replay.ledger[day],inv=inventoryLedger.daily[day],value=inventoryValuation.daily[day];
  if(physical?.day!==day||inv?.day!==day||value?.day!==day
   ||!Array.isArray(physical.reserveEvents)
   ||!Array.isArray(inv.bySku)||!Array.isArray(value.bySku)
   ||inv.bySku.length!==ids.length||value.bySku.length!==ids.length){
   fail('faltan días o libros físicos');
  }
  const recorded=reserveTransfers.filter(m=>m.day===day),original=physical.reserveEvents;
  if(recorded.length!==original.length
   ||original.some(m=>!recorded.some(r=>m.day===r.day&&m.skuId===r.skuId
    &&m.qty===r.qty&&m.from===r.from&&m.to===r.to&&m.verified===r.verified))){
   fail('el registro de traslado no coincide con eventos físicos');
  }
  const bySku=[];
  for(const p of SKU_CATALOG){
   const id=p.id,rows=recorded.filter(m=>m.skuId===id);
   const moved=sum(rows,'qty');
   const expected=selected&&day===expectedDay?comparison.openingState.reserveBySku[id]:0;
   const physicalRow=inv.bySku.find(r=>r.skuId===id);
   const moneyRow=value.bySku.find(r=>r.skuId===id);
   if(moved!==expected||!physicalRow||!moneyRow
    ||physical.movedReserve?.[id]!==moved
    ||physicalRow.transferredTodaySkuUnits!==moved
    ||moneyRow.transferredTodayCLP!==moved*p.unitCost
    ||moneyRow.unitCostCLP!==p.unitCost
    ||moneyRow.reserveCLP!==physicalRow.reserveSkuUnits*p.unitCost
    ||balance[id]<moved)fail('cantidad o valorización del traslado alterada');
   balance[id]-=moved;totalsBySku[id]+=moved;
   if(physical.reserveStock?.[id]!==balance[id]
    ||physicalRow.reserveSkuUnits!==balance[id]
    ||physicalRow.pickFaceSkuUnits!==physical.stock?.[id]
    ||physicalRow.physicalSkuUnits!==physicalRow.openingSkuUnits
     +inventoryLedger.daily.slice(0,day+1).reduce((n,d)=>
       n+(d.bySku.find(r=>r.skuId===id)?.receivedTodaySkuUnits||0),0)
     -inventoryLedger.daily.slice(0,day+1).reduce((n,d)=>
       n+(d.bySku.find(r=>r.skuId===id)?.shippedTodaySkuUnits||0),0)){
    fail('saldo físico de reserva incorrecto');
   }
   bySku.push({skuId:id,transferredSkuUnits:moved,
    standardValueReclassifiedCLP:moved*p.unitCost,remainingReserveSkuUnits:balance[id]});
  }
  daily.push({day,bySku,
   transferredSkuUnits:sum(bySku,'transferredSkuUnits'),
   standardValueReclassifiedCLP:sum(bySku,'standardValueReclassifiedCLP'),
   remainingReserveSkuUnits:sum(bySku,'remainingReserveSkuUnits')});
 }
 const bySku=SKU_CATALOG.map(p=>{
  const opening=comparison.openingState.reserveBySku[p.id],moved=totalsBySku[p.id];
  if(opening!==moved+balance[p.id]||balance[p.id]!==replay.endingReserveStock[p.id]){
   fail('saldo final no reconcilia con apertura');
  }
  return {skuId:p.id,sourceLocation:'RESERVA-CD',targetLocation:'PICK-FACE',
   sourceStock:'initial-on-hand',lotId:null,lotTraceAvailable:false,
   openingPhysicalSkuUnits:comparison.openingState.openingBySku[p.id],
   openingReserveSkuUnits:opening,
   scheduledTransferDay:expectedDay,
   effectiveTransferDay:moved?expectedDay:null,
   transferredSkuUnits:moved,remainingReserveSkuUnits:balance[p.id],
   unitStandardCostCLP:p.unitCost,
   standardValueReclassifiedCLP:moved*p.unitCost,
   remainingReserveValueCLP:balance[p.id]*p.unitCost,
   movementIds:eventsBySku.get(p.id).map(x=>x.id)};
 });
 const totalStart=sum(bySku,'openingReserveSkuUnits'),totalMoved=sum(bySku,'transferredSkuUnits');
 const standardMoved=sum(bySku,'standardValueReclassifiedCLP');
 if(totalStart!==totalMoved+sum(bySku,'remainingReserveSkuUnits')
  ||inventoryLedger.totals.internalTransfersSkuUnits!==totalMoved
  ||inventoryValuation.daily.reduce((n,d)=>n+d.totals.transferredTodayCLP,0)!==standardMoved
  ||daily.at(-1).remainingReserveSkuUnits!==inventoryLedger.totals.reserveSkuUnits
  ||!selected&&totalMoved!==0
  ||comparison.option==='reserve'&&(comparison.urgent.length!==0
   ||purchaseOrders.some(po=>po.source==='urgent')
   ||comparison.urgentBase!==0||comparison.urgentSurcharge!==0
   ||comparison.extraLabor!==0||comparison.incrementalExpense!==0)){
  fail('traslado, costo de compra o balance alterado');
 }
 return freeze({
  passed:true,scope:'sku-cohort',currency:'CLP',horizonDays:horizon,
  option:comparison.option,baselineKey:baseline.scenarioKey,
  sourceLocation:'RESERVA-CD',targetLocation:'PICK-FACE',
  bySku,daily,
  totals:{openingReserveSkuUnits:totalStart,transferredSkuUnits:totalMoved,
   remainingReserveSkuUnits:totalStart-totalMoved,
   standardInventoryValueReclassifiedCLP:standardMoved,
   incrementalPurchaseCommittedCLP:0,
   modeledTransferLaborCostCLP:null,
   completedOrdersDeltaAgainstFrozenBaseline:replay.completed-comparison.base.completed},
  checks:{frozenOpening:true,uniqueDatedMovements:true,
   replayAndInventoryAgree:true,warehouseLocationBalance:true,
   inventoryValueIsNotExpense:true,noPurchaseCreated:true},
  movementCostStatus:'not-calibrated-not-zero',
  lotIdentification:'opening-stock-no-lot-id',
  supplierOrderCreated:false,confirmedBankPaymentCLP:null,
  note:'El traslado mueve SKU ya presentes del stock inicial de RESERVA-CD hacia PICK-FACE en el día simulado, sin duplicarlos ni emitir una PO. El valor estándar reclasificado NO es gasto ni pago. No se modela tarifa operativa del traslado: costo desconocido, no CLP 0. Al no existir lotes identificados de apertura, no se inventan IDs de lote. PICK-FACE sigue condicionado por exactitud, preparación de pedidos y capacidad de Transporte. La diferencia de expediciones no atribuye SKU específicos al traslado ni acredita entregas al cliente.'
 });
}
