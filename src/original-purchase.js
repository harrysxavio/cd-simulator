import {SKU_CATALOG} from './sku.js';

/**
 * M2-03. Immutable purchase orders committed by Planning BEFORE demand reveal.
 *
 * Source of truth is the already simulated PLANNED supplier schedule. We do
 * not derive a second purchase policy or add a physical delivery here.
 * An order is a supplier commitment in this educational model, NOT payment.
 */
export function freezeOriginalPurchaseOrders({planned,purchase,committedValueCLP,plannedOrders,forecastOrders}={}){
 if(!Array.isArray(planned?.deliveries)||!purchase||typeof purchase!=='object'||Array.isArray(purchase)){
  throw new Error('Falta plan original de compras SKU');
 }
 if(!Number.isSafeInteger(plannedOrders)||plannedOrders<1
  ||!Number.isSafeInteger(forecastOrders)||forecastOrders<1){
  throw new Error('Demanda planificada SKU inválida');
 }
 if(planned.orders!==plannedOrders)throw new Error('La compra original no pertenece al plan');
 const expectedIds=SKU_CATALOG.map(p=>p.id);
 if(planned.deliveries.length!==expectedIds.length
  ||Object.keys(purchase).length!==expectedIds.length
  ||Object.keys(purchase).some(id=>!expectedIds.includes(id))){
  throw new Error('El manifiesto de compra original no contiene todos los SKU');
 }
 const byId=new Map(planned.deliveries.map(d=>[d.id,d]));
 if(byId.size!==expectedIds.length||expectedIds.some(id=>!byId.has(id))){
  throw new Error('Órdenes originales duplicadas o desconocidas');
 }
 const orders=SKU_CATALOG.map(p=>{
  const d=byId.get(p.id),qty=purchase[p.id];
  if(!Number.isSafeInteger(qty)||qty<0||qty!==d.ordered
   ||!Number.isSafeInteger(d.received)||d.received<0
   ||!Number.isSafeInteger(d.unreceived)||d.unreceived<0
   ||d.received+d.unreceived!==qty
   ||!Number.isSafeInteger(d.arrivalDay)||d.arrivalDay<0
   ||!Number.isSafeInteger(d.unitCost)||d.unitCost<0
   ||d.unitCost!==p.unitCost){
   throw new Error('Compromiso de compra original SKU inválido');
  }
  return Object.freeze({
   id:'PO-'+p.id,source:'original',skuId:p.id,
   orderedQty:qty,supplierFulfilledQty:d.received,
   supplierUnfilledQty:d.unreceived,expectedArrivalDay:d.arrivalDay,
   unitCost:d.unitCost
  });
 });
 const total=orders.reduce((n,o)=>n+o.orderedQty*o.unitCost,0);
 if(!Number.isSafeInteger(total)||total!==committedValueCLP){
  throw new Error('Valorización de compra original no concilia');
 }
 return Object.freeze({
  scope:'sku-cohort',
  commitmentStage:'before-demand-reveal',
  plannedOrders,forecastOrders,
  rows:Object.freeze(orders),
  bySku:Object.freeze(Object.fromEntries(orders.map(o=>[o.skuId,o.orderedQty]))),
  committedValueCLP:total,
  disclaimer:'Órdenes comprometidas en el simulador; día de llegada supuesto, no fecha de recepción ni pago efectivo.'
 });
}

/**
 * Validate that a planned/actual/recovered event replay uses the SAME supplier
 * commitment. Do not compare warehouse receipts here: Receiving and Quality
 * may legitimately delay them without changing the original supplier order.
 */
export function assertFrozenOriginalPurchases(frozen,replay){
 if(frozen?.scope!=='sku-cohort'||!Array.isArray(frozen.rows)||!Array.isArray(replay?.deliveries)){
  throw new Error('Falta plan original congelado');
 }
 if(frozen.rows.length!==replay.deliveries.length)throw new Error('La compra original cambió entre escenarios');
 const byId=new Map(replay.deliveries.map(d=>[d.id,d]));
 if(byId.size!==replay.deliveries.length)throw new Error('Órdenes originales duplicadas');
 for(const p of frozen.rows){
  const d=byId.get(p.skuId);
  if(!d||p.id!=='PO-'+p.skuId||p.source!=='original'
   ||d.ordered!==p.orderedQty||d.received!==p.supplierFulfilledQty
   ||d.unreceived!==p.supplierUnfilledQty
   ||d.arrivalDay!==p.expectedArrivalDay||d.unitCost!==p.unitCost){
   throw new Error('La compra original cambió entre escenarios');
  }
 }
 return true;
}
