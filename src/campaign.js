import {SKU_CATALOG} from './sku.js';

/**
 * Immutable, canonical read model for ONE SKU event-simulation campaign.
 *
 * Every order, purchase, warehouse receipt, Quality release and shipment is
 * derived from the same replay (comparison.recovered). This module does not
 * execute a second campaign and does not combine the aggregate-day engine.
 *
 * Units: stock movements = SKU units; service = whole customer orders;
 * dates = integer campaign days; purchasing valuation = illustrative CLP.
 */
export function campaignSnapshot({comparison,campaignId='DEMO-SKU',plannedOrders=200}={}){
 if(typeof campaignId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(campaignId))throw new Error('Identificador de campaña inválido');
 if(!Number.isSafeInteger(plannedOrders)||plannedOrders<1||plannedOrders>100000)throw new Error('Pedidos planificados inválidos');
 const replay=comparison?.recovered;
 if(!replay||!Array.isArray(replay.ledger)||!Array.isArray(replay.ordersDetail)||!Array.isArray(replay.deliveries)||!Array.isArray(comparison.urgent))throw new Error('Falta registro de eventos por pedido');
 const catalog=SKU_CATALOG.map(p=>({id:p.id,name:p.name,unitCost:p.unitCost}));
 const ids=catalog.map(p=>p.id),opening={...replay.initial};
 const purchaseOrders=[
  ...replay.deliveries.map(d=>({id:'PO-'+d.id,source:'original',skuId:d.id,orderedQty:d.ordered,supplierFulfilledQty:d.received,supplierUnfilledQty:d.unreceived,expectedArrivalDay:d.arrivalDay,unitCost:d.unitCost})),
  ...comparison.urgent.map((d,i)=>({id:'URG-'+String(i+1).padStart(3,'0')+'-'+d.id,source:'urgent',skuId:d.id,orderedQty:d.qty,supplierFulfilledQty:d.qty,supplierUnfilledQty:0,expectedArrivalDay:d.day,unitCost:d.unitCost}))
 ];
 const purchaseById=new Map(purchaseOrders.map(p=>[p.id,p]));
 const originalPurchase=Object.fromEntries(replay.deliveries.map(d=>[d.id,d.ordered]));
 const receipts=[],qualityReleases=[],shipments=[],dailyEvents=[],inventoryMovements=[];
 let sequence=0;
 const newId=()=>campaignId+'-EVT-'+String(++sequence).padStart(7,'0');
 // Stock on day -1 is the baseline, not a supplier receipt.
 for(const id of ids)inventoryMovements.push({id:campaignId+'-OPEN-'+id,day:-1,type:'opening',skuId:id,qty:opening[id]});
 for(const day of replay.ledger){
  for(const item of day.receiptEvents??[]){
   const po=purchaseById.get(item.purchaseOrderId);
   const row={id:newId(),day:day.day,type:'warehouse_receipt',lotId:item.lotId,purchaseOrderId:item.purchaseOrderId,skuId:item.skuId,qty:item.qty};
   if(!po||po.skuId!==row.skuId||day.day<po.expectedArrivalDay)throw new Error('Recepción sin compra válida o anterior a llegada');
   receipts.push(row);dailyEvents.push(row);
   inventoryMovements.push({id:row.id,day:row.day,type:'receipt_into_quality',skuId:row.skuId,qty:row.qty,lotId:row.lotId});
  }
  for(const item of day.releaseEvents??[]){
   const row={id:newId(),day:day.day,type:'quality_release',lotId:item.lotId,skuId:item.skuId,qty:item.qty};
   qualityReleases.push(row);dailyEvents.push(row);
   inventoryMovements.push({id:row.id,day:row.day,type:'quality_to_available',skuId:row.skuId,qty:row.qty,lotId:row.lotId});
  }
  for(const item of day.shipmentEvents??[]){
   const row={id:newId(),day:day.day,type:'shipment',orderId:item.orderId,templateId:item.templateId,units:item.units,lines:{...item.lines}};
   shipments.push(row);dailyEvents.push(row);
   for(const [skuId,qty] of Object.entries(row.lines))inventoryMovements.push({id:row.id+'-'+skuId,day:row.day,type:'dispatched',skuId,qty,orderId:row.orderId});
  }
 }
 const shippedById=new Map(shipments.map(s=>[s.orderId,s]));
 const orders=replay.ordersDetail.map(o=>({
  id:o.id,templateId:o.templateId,lines:{...o.lines},status:o.fulfilledDay===null?'pending':'shipped',shippedDay:o.fulfilledDay
 }));
 const qualityLots=receipts.map(r=>{
  const released=qualityReleases.filter(x=>x.lotId===r.lotId).reduce((sum,x)=>sum+x.qty,0);
  return {id:r.lotId,skuId:r.skuId,receivedDay:r.day,receivedQty:r.qty,releasedQty:released,heldQty:r.qty-released,receiptId:r.id};
 });
 const counters=Object.fromEntries(ids.map(id=>[id,{opening:opening[id],received:0,released:0,dispatched:0,held:0,available:opening[id]}]));
 let physicalDailyValid=true;
 for(const day of replay.ledger){
  for(const item of day.receiptEvents??[]){const c=counters[item.skuId];c.received+=item.qty;c.held+=item.qty;}
  for(const item of day.releaseEvents??[]){const c=counters[item.skuId];c.released+=item.qty;c.held-=item.qty;c.available+=item.qty;}
  for(const item of day.shipmentEvents??[])for(const [id,qty] of Object.entries(item.lines)){const c=counters[id];c.dispatched+=qty;c.available-=qty;}
  for(const id of ids){
   const c=counters[id];
   if(c.held<0||c.available<0||day.stock[id]!==c.available||(day.heldQuality?.[id]??0)!==c.held)physicalDailyValid=false;
  }
 }
 const bySku=ids.map(id=>({skuId:id,...counters[id],closingQuality:replay.heldQuality[id],closingAvailable:replay.endingStock[id]}));
 const receivedByPO=new Map(purchaseOrders.map(x=>[x.id,0]));
 for(const item of receipts)receivedByPO.set(item.purchaseOrderId,receivedByPO.get(item.purchaseOrderId)+item.qty);
 const orderIds=new Set(orders.map(o=>o.id)),shipmentIds=new Set(shipments.map(s=>s.orderId));
 const eventIds=new Set(dailyEvents.map(e=>e.id));
 const checks={
  uniqueOrders:orderIds.size===orders.length,
  uniqueShipments:shipmentIds.size===shipments.length&&shipments.every(s=>orderIds.has(s.orderId)),
  uniqueEvents:eventIds.size===dailyEvents.length,
  purchasedQty:purchaseOrders.every(p=>p.orderedQty===p.supplierFulfilledQty+p.supplierUnfilledQty
   &&receivedByPO.get(p.id)<=p.supplierFulfilledQty),
  frozenManifest:ids.every(id=>originalPurchase[id]===comparison.originalPurchase[id]),
  orderBalance:orders.length===replay.orders&&shipments.length===replay.completed
   &&orders.filter(o=>o.status==='pending').length===replay.pending
   &&orders.every(o=>o.status==='pending'?!shippedById.has(o.id):
      shippedById.get(o.id)?.day===o.shippedDay),
  qualityLots:qualityLots.every(l=>l.heldQty>=0)&&qualityLots.reduce((n,l)=>n+l.heldQty,0)===replay.waitingQuality,
  physicalDaily:physicalDailyValid,
  skuBalance:bySku.every(x=>x.opening+x.received===x.dispatched+x.held+x.available
   &&x.dispatched===replay.consumed[x.skuId]&&x.held===x.closingQuality&&x.available===x.closingAvailable),
  eventRollups:replay.ledger.every(day=>
   day.receiptEvents.reduce((n,r)=>n+r.qty,0)===Object.values(day.received).reduce((n,v)=>n+v,0)
   &&day.releaseEvents.reduce((n,r)=>n+r.qty,0)===Object.values(day.released).reduce((n,v)=>n+v,0)
   &&day.shipmentEvents.length===day.shipped
   &&day.shipmentEvents.reduce((n,r)=>n+r.units,0)===day.shippedUnits)
 };
 const result={
  campaignId,version:1,scope:'sku-cohort',currency:'CLP',horizonDays:replay.days,
  catalog,plan:{plannedOrders,forecastOrders:comparison.forecastOrders,plannedForecastPercent:comparison.plannedForecastPercent,
   planningCoveragePercent:comparison.planningCoveragePercent,originalPurchase},
  demand:{actualOrders:replay.orders,revealed:true},
  purchaseOrders,orders,receipts,qualityLots,qualityReleases,shipments,inventoryMovements,dailyEvents,
  inventory:{bySku,initial:{...opening},closingAvailable:{...replay.endingStock},closingQuality:{...replay.heldQuality}},
  checks,passed:Object.values(checks).every(Boolean),
  assumptions:'Lectura canónica y determinista de la cohorte SKU. No consolida ni sustituye aún el motor agregado de ocho áreas; no modela pagos reales, facturas, devoluciones ni cancelaciones.'
 };
 // Avoid accidentally rewriting the original plan or event records in callers.
 const freezeDeep=value=>{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
   Object.values(value).forEach(freezeDeep);
   Object.freeze(value);
  }
  return value;
 };
 return freezeDeep(result);
}
