/**
 * M3-13a: read-only operational handoff audit for the canonical SKU cohort.
 * Eight management views are NOT eight pools of stock. There is one daily
 * physical timeline, one order cohort and one SKU opening/closing balance.
 *
 * No simulation, no new shipment, no combined aggregate-shift metrics.
 */
const sum=(list,fn)=>list.reduce((total,item)=>total+fn(item),0);
const nonnegative=n=>Number.isSafeInteger(n)&&n>=0;
const freeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(freeze);Object.freeze(value);
 }
 return value;
};
function fail(reason){throw new Error('Cadena física SKU: '+reason)}
const IDS=['commercial','planning','purchasing','receiving','quality','inventory','picking','transport'];

/**
 * Accepts the already-audited campaign + one eight-area projection.
 * The resulting daily proof is a relationship check, NOT new inventory.
 */
export function operationalChainAudit({comparison,campaign,stages,days,metrics}={}){
 const replay=comparison?.recovered;
 if(!replay?.ledger||campaign?.scope!=='sku-cohort'||campaign.passed!==true
  ||!Array.isArray(stages)||!Array.isArray(days)||!Array.isArray(campaign.orders)
  ||!Array.isArray(campaign.picks)||!Array.isArray(campaign.shipments)
  ||!campaign.supplierLedger?.passed||!campaign.receivingLedger?.passed
  ||!campaign.qualityLedger?.passed||!campaign.inventoryLedger?.passed
  ||!campaign.pickingLedger?.passed
  ||!nonnegative(replay.days)||replay.days>365
  ||campaign.horizonDays!==replay.days||days.length!==replay.days+1
  ||stages.length!==IDS.length||stages.some((s,i)=>s.id!==IDS[i])
  ||metrics?.customerDeliveries!==null){
  fail('no existe un alcance físico y un único horizonte válidos');
 }
 const stage=Object.fromEntries(stages.map(s=>[s.id,s]));
 const m=metrics,qty=campaign.inventoryLedger.totals;
 const orders=campaign.orders;
 const supplier=campaign.supplierLedger.totals;
 if(m.actualOrders!==orders.length
  ||m.originalPurchaseSkuUnits!==campaign.plan.commercialPlanning.totalCommittedSkuUnits
  ||m.originalPurchaseSkuUnits!==supplier.originalOrderedSkuUnits
  ||stage.planning.output!==m.originalPurchaseSkuUnits
  ||stage.purchasing.output!==supplier.arrivedByCutoffSkuUnits
  ||stage.receiving.input!==supplier.arrivedByCutoffSkuUnits
  ||stage.receiving.output!==m.receivedSkuUnits
  ||stage.quality.input!==stage.receiving.output
  ||stage.quality.output!==m.releasedSkuUnits
  ||stage.inventory.input!==qty.openingSkuUnits+qty.receivedSkuUnits
  ||stage.inventory.output!==qty.shippedSkuUnits+qty.physicalSkuUnits
  ||stage.picking.input!==orders.length||stage.picking.output!==m.pickedOrders
  ||stage.transport.input!==m.pickedOrders||stage.transport.output!==m.shippedOrders
  ||qty.receivedSkuUnits!==supplier.warehouseReceivedSkuUnits
  ||qty.receivedSkuUnits!==campaign.qualityLedger.totals.receivedSkuUnits
  ||qty.releasedSkuUnits!==campaign.qualityLedger.totals.releasedSkuUnits
  ||qty.receivedSkuUnits!==campaign.receivingLedger.totals.receivedSkuUnits
  ||qty.stagingSkuUnits!==m.closingStagingSkuUnits
  ||qty.shippedSkuUnits!==m.shippedSkuUnits
  ||qty.pickedSkuUnits!==m.pickedSkuUnits
  ||m.actualOrders!==m.unpickedOrders+m.stagedOrders+m.shippedOrders
  ||m.pendingOrders!==m.unpickedOrders+m.stagedOrders
  ||m.pickedOrders!==m.stagedOrders+m.shippedOrders
  ||qty.pickedSkuUnits!==qty.stagingSkuUnits+qty.shippedSkuUnits
  ||qty.openingSkuUnits+qty.receivedSkuUnits!==qty.physicalSkuUnits+qty.shippedSkuUnits
  ||qty.physicalSkuUnits!==qty.pickFaceSkuUnits+qty.stagingSkuUnits+qty.reserveSkuUnits+qty.qualityHeldSkuUnits){
  fail('unidades o pedidos no enlazan entre las ocho áreas');
 }
 const skuIds=campaign.catalog.map(s=>s.id);
 if(new Set(skuIds).size!==skuIds.length)fail('SKU duplicado en catálogo');
 const allOrders=new Map(orders.map(o=>[o.id,o]));
 if(allOrders.size!==orders.length)fail('pedidos repetidos');
 if(orders.some(o=>o.status!==(o.shippedDay!==null?'shipped':o.pickedDay!==null?'staged':'pending')
  ||(o.shippedDay!==null&&(o.pickedDay===null||o.pickedDay>o.shippedDay)))){
  fail('estados de pedido incompatibles con la secuencia de preparación y despacho');
 }
 const sameDay=replay.separateTransport!==true;
 const physicalDays=campaign.inventoryLedger.daily;
 const receivingDays=campaign.receivingLedger.daily;
 const qualityDays=campaign.qualityLedger.daily;
 const pickingDays=campaign.pickingLedger.daily;
 const auditDays=[];
 let cumulativeReceived=0,cumulativeShipped=0,cumulativePicked=0;
 for(let i=0;i<days.length;i++){
  const d=days[i],real=replay.ledger[i],physical=physicalDays[i],receiving=receivingDays[i],quality=qualityDays[i],picking=pickingDays[i];
  if(d?.day!==i||real?.day!==i||physical?.day!==i||receiving?.day!==i||quality?.day!==i||picking?.day!==i)fail('días de ocho áreas desalineados');
  const before=orders.filter(o=>o.pickedDay===null||o.pickedDay>i).length;
  const inStage=orders.filter(o=>o.pickedDay!==null&&o.pickedDay<=i
   &&(o.shippedDay===null||o.shippedDay>i)).length;
  const departed=orders.length-before-inStage;
  const dailyPicked=sum(campaign.picks.filter(p=>p.day===i),p=>p.units);
  const dailyShipped=sum(campaign.shipments.filter(s=>s.day===i),s=>s.units);
  const orderPicks=campaign.picks.filter(p=>p.day===i).length;
  const orderDepartures=campaign.shipments.filter(s=>s.day===i).length;
  const receipts=sum(campaign.receipts.filter(r=>r.day===i),r=>r.qty);
  const qualityReleased=sum(campaign.qualityReleases.filter(r=>r.day===i),r=>r.qty);
  const reserves=sum(campaign.reserveTransfers.filter(r=>r.day===i),r=>r.qty);
  cumulativeReceived+=receipts;cumulativeShipped+=dailyShipped;cumulativePicked+=dailyPicked;
  if(![before,inStage,departed,receipts,qualityReleased,reserves,dailyPicked,dailyShipped].every(nonnegative)
   ||orderPicks!==d.pickedOrders||orderDepartures!==d.shippedOrders
   ||dailyPicked!==d.pickedSkuUnits||dailyShipped!==d.shippedSkuUnits
   ||orderPicks!==picking.pickedOrders||orderDepartures!==picking.shippedOrders
   ||inStage!==d.awaitingTransportOrders
   ||inStage!==picking.awaitingTransportOrders
   ||departed!==d.cumulativeOrders||orders.length-departed!==d.remainingOrders
   ||real.stagingOrders!==inStage||real.shipped!==orderDepartures
   ||receiving.receivedSkuUnits!==receipts||quality.releasedSkuUnits!==qualityReleased
   ||d.receivedSkuUnits!==receipts||d.releasedSkuUnits!==qualityReleased
   ||d.movedReserveSkuUnits!==reserves
   ||d.closingStagingSkuUnits!==physical.stagingSkuUnits
   ||d.closingPhysicalSkuUnits!==physical.physicalSkuUnits
   ||d.closingVerifiedSkuUnits!==physical.verifiedSkuUnits
   ||d.closingUnverifiedSkuUnits!==physical.unverifiedSkuUnits
   ||physical.receivedSkuUnits!==receipts
   ||physical.releasedSkuUnits!==qualityReleased
   ||physical.transferredSkuUnits!==reserves
   ||physical.pickedSkuUnits!==dailyPicked
   ||physical.shippedSkuUnits!==dailyShipped
   ||physical.stagingSkuUnits!==real.stagingUnits
   ||physical.qualityHeldSkuUnits!==quality.heldSkuUnits
   ||physical.physicalSkuUnits!==qty.openingSkuUnits+cumulativeReceived-cumulativeShipped
   ||physical.pickFaceSkuUnits+physical.reserveSkuUnits+physical.stagingSkuUnits
     +physical.qualityHeldSkuUnits!==physical.physicalSkuUnits
   ||physical.verifiedSkuUnits+physical.unverifiedSkuUnits!==physical.pickFaceSkuUnits
   ||cumulativePicked!==cumulativeShipped+physical.stagingSkuUnits
   ||(sameDay&&(inStage!==0||dailyPicked!==dailyShipped||orderPicks!==orderDepartures))){
   fail('desfase diario entre pedido, SKU, áreas y salida del CD (día '+i+')');
  }
  // A day-by-day SKU mass balance is stronger than matching aggregate sums.
  for(const x of physical.bySku){
   if(!skuIds.includes(x.skuId)
    ||x.openingSkuUnits+sum(physicalDays.slice(0,i+1),p=>p.bySku.find(r=>r.skuId===x.skuId)?.receivedTodaySkuUnits??0)
      -sum(physicalDays.slice(0,i+1),p=>p.bySku.find(r=>r.skuId===x.skuId)?.shippedTodaySkuUnits??0)
      !==x.physicalSkuUnits
    ||x.physicalSkuUnits!==x.pickFaceSkuUnits+x.stagingSkuUnits+x.reserveSkuUnits+x.qualityHeldSkuUnits){
    fail('balance diario distinto para SKU '+x.skuId);
   }
  }
  auditDays.push({day:i,unpickedOrders:before,stagedOrders:inStage,shippedOrders:departed,
   pickedTodayOrders:orderPicks,shippedTodayOrders:orderDepartures,
   arrivedAtDockSkuUnits:d.dockArrivedSkuUnits,
   receivedIntoQualitySkuUnits:receipts,releasedFromQualitySkuUnits:qualityReleased,
   movedReserveSkuUnits:reserves,pickedSkuUnits:dailyPicked,
   shippedSkuUnits:dailyShipped,
   onHandSkuUnits:physical.physicalSkuUnits,
   pickFaceSkuUnits:physical.pickFaceSkuUnits,stagingSkuUnits:physical.stagingSkuUnits,
   reserveSkuUnits:physical.reserveSkuUnits,qualityHeldSkuUnits:physical.qualityHeldSkuUnits});
 }
 const last=auditDays.at(-1);
 if(last.unpickedOrders!==m.unpickedOrders||last.stagedOrders!==m.stagedOrders
  ||last.shippedOrders!==m.shippedOrders||last.stagingSkuUnits!==m.closingStagingSkuUnits
  ||last.qualityHeldSkuUnits!==m.closingQualitySkuUnits
  ||last.reserveSkuUnits!==m.closingReserveSkuUnits
  ||last.pickFaceSkuUnits!==m.closingPickFaceSkuUnits
  ||cumulativeShipped!==m.shippedSkuUnits
  ||cumulativePicked!==m.pickedSkuUnits)fail('resumen final desalineado');
 return freeze({scope:'sku-cohort',horizonDays:replay.days,mode:sameDay?'same-day':'independent-staging',
  passed:true,areaIds:[...IDS],days:auditDays,
  totals:{orders:orders.length,unpickedOrders:m.unpickedOrders,stagedOrders:m.stagedOrders,
   shippedOrders:m.shippedOrders,openingSkuUnits:qty.openingSkuUnits,
   receivedSkuUnits:cumulativeReceived,heldQualitySkuUnits:last.qualityHeldSkuUnits,
   stagedSkuUnits:last.stagingSkuUnits,shippedSkuUnits:cumulativeShipped},
  evidence:{commercialPlanning:'campaign.plan.commercialPlanning',
   purchasing:'campaign.supplierLedger',receiving:'campaign.receivingLedger',
   quality:'campaign.qualityLedger',inventory:'campaign.inventoryLedger',
   picking:'campaign.pickingLedger',transport:'campaign.shipments'},
  boundary:'Las ocho áreas observan una sola cohorte y no se suman entre sí: pedidos son pedidos, cantidades SKU son unidades de producto. PICK-FACE, STAGING-CD, RESERVA-CD y Calidad son ubicaciones del mismo stock físico. Salida del CD no equivale a entrega al cliente; el resultado económico agregado pertenece a otro modelo.'});
}
