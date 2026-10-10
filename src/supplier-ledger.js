import {SKU_CATALOG} from './sku.js';

const sum=(rows,key)=>rows.reduce((n,x)=>n+x[key],0);
const nonnegative=n=>Number.isSafeInteger(n)&&n>=0;
const deepFreeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(deepFreeze);
  Object.freeze(value);
 }
 return value;
};

/**
 * M3-07. One procurement-to-warehouse ledger for the canonical SKU campaign.
 *
 * A supplier's fulfilled commitment becomes "arrived at the modeled CD dock"
 * only when its modeled arrival day falls inside the campaign horizon. It is
 * NOT a warehouse receipt. Only dated receipt events linked to that PO prove
 * the warehouse physically received the units.
 *
 * This is an illustrative schedule, NOT proof of a real supplier dispatch,
 * ASN, invoice, actual carrier ETA or cash payment.
 */
export function supplierOrderLedger({purchaseOrders,receipts,horizonDays}={}){
 if(!Number.isSafeInteger(horizonDays)||horizonDays<0||horizonDays>365
  ||!Array.isArray(purchaseOrders)||!Array.isArray(receipts)){
  throw new Error('Registro de proveedor SKU inválido');
 }
 const skuById=new Map(SKU_CATALOG.map(p=>[p.id,p]));
 const seenIds=new Set();
 const normalized=purchaseOrders.map(po=>{
  const sku=skuById.get(po?.skuId);
  if(!po||!sku||typeof po.id!=='string'||seenIds.has(po.id)
   ||!['original','urgent'].includes(po.source)
   ||(po.source==='original'&&po.id!=='PO-'+po.skuId)
   ||(po.source==='urgent'&&!/^URG-\d{3}-[A-Za-z0-9_-]+$/.test(po.id))
   ||!nonnegative(po.orderedQty)||!nonnegative(po.supplierFulfilledQty)
   ||!nonnegative(po.supplierUnfilledQty)
   ||po.orderedQty!==po.supplierFulfilledQty+po.supplierUnfilledQty
   ||!nonnegative(po.expectedArrivalDay)||po.expectedArrivalDay>365
   ||po.unitCost!==sku.unitCost){
   throw new Error('Orden de proveedor SKU inválida');
  }
  seenIds.add(po.id);
  const arrivedByCutoff=po.expectedArrivalDay<=horizonDays?po.supplierFulfilledQty:0;
  const stillInTransit=po.supplierFulfilledQty-arrivedByCutoff;
  return {...po,arrivedByCutoff,stillInTransit};
 });
 if(SKU_CATALOG.some(p=>normalized.filter(po=>po.source==='original'&&po.skuId===p.id).length!==1)){
  throw new Error('Falta orden original única por SKU');
 }
 const receiptsByPo=new Map(normalized.map(po=>[po.id,[]]));
 const seenReceipts=new Set();
 for(const r of receipts){
  const po=normalized.find(x=>x.id===r?.purchaseOrderId);
  if(!po||typeof r.id!=='string'||seenReceipts.has(r.id)
   ||typeof r.lotId!=='string'||!r.lotId
   ||po.skuId!==r.skuId||!nonnegative(r.qty)||r.qty===0
   ||!nonnegative(r.day)||r.day>horizonDays||r.day<po.expectedArrivalDay){
   throw new Error('Recepción SKU sin orden, lote o fecha válida');
  }
  seenReceipts.add(r.id);
  receiptsByPo.get(po.id).push(r);
 }
 const rows=normalized.map(po=>{
  const events=receiptsByPo.get(po.id);
  const receivedAtWarehouse=events.reduce((n,r)=>n+r.qty,0);
  const awaitingWarehouseReceipt=po.arrivedByCutoff-receivedAtWarehouse;
  if(awaitingWarehouseReceipt<0)throw new Error('Recepción supera llegada del proveedor');
  const catalog=skuById.get(po.skuId);
  // Original lead-time baseline is the SKU catalog's standard assumption;
  // urgent purchases use the user's chosen emergency day, not that baseline.
  const standardLeadDays=po.source==='original'?catalog.leadDays:null;
  const extraDelayDays=standardLeadDays===null?null:po.expectedArrivalDay-standardLeadDays;
  if(extraDelayDays!==null&&extraDelayDays<0)throw new Error('Entrega original anterior al plazo base');
  return {
   id:po.id,skuId:po.skuId,source:po.source,
   orderedSkuUnits:po.orderedQty,supplierFulfilledSkuUnits:po.supplierFulfilledQty,
   supplierShortfallSkuUnits:po.supplierUnfilledQty,modeledArrivalDay:po.expectedArrivalDay,
   standardLeadDays,extraDelayDays,
   arrivedByCutoffSkuUnits:po.arrivedByCutoff,
   inTransitSkuUnits:po.stillInTransit,
   receivedAtWarehouseSkuUnits:receivedAtWarehouse,
   awaitingWarehouseReceiptSkuUnits:awaitingWarehouseReceipt,
   firstWarehouseReceiptDay:events.length?Math.min(...events.map(r=>r.day)):null,
   lastWarehouseReceiptDay:events.length?Math.max(...events.map(r=>r.day)):null,
   warehouseReceiptIds:events.map(r=>r.id)
  };
 });
 const original=rows.filter(p=>p.source==='original'),urgent=rows.filter(p=>p.source==='urgent');
 const totals={
  originalOrderedSkuUnits:sum(original,'orderedSkuUnits'),
  originalFulfilledSkuUnits:sum(original,'supplierFulfilledSkuUnits'),
  originalShortfallSkuUnits:sum(original,'supplierShortfallSkuUnits'),
  urgentOrderedSkuUnits:sum(urgent,'orderedSkuUnits'),
  urgentFulfilledSkuUnits:sum(urgent,'supplierFulfilledSkuUnits'),
  arrivedByCutoffSkuUnits:sum(rows,'arrivedByCutoffSkuUnits'),
  inTransitSkuUnits:sum(rows,'inTransitSkuUnits'),
  warehouseReceivedSkuUnits:sum(rows,'receivedAtWarehouseSkuUnits'),
  awaitingWarehouseReceiptSkuUnits:sum(rows,'awaitingWarehouseReceiptSkuUnits'),
  originalExtraDelaySkuUnits:original.filter(p=>p.extraDelayDays>0).reduce((n,p)=>n+p.supplierFulfilledSkuUnits,0)
 };
 const checks={
  supplierFill:totals.originalOrderedSkuUnits===totals.originalFulfilledSkuUnits+totals.originalShortfallSkuUnits,
  urgentFill:totals.urgentOrderedSkuUnits===totals.urgentFulfilledSkuUnits,
  dockVsWarehouse:totals.arrivedByCutoffSkuUnits===totals.warehouseReceivedSkuUnits+totals.awaitingWarehouseReceiptSkuUnits,
  suppliersVsHorizon:totals.originalFulfilledSkuUnits+totals.urgentFulfilledSkuUnits===totals.arrivedByCutoffSkuUnits+totals.inTransitSkuUnits,
  uniquePurchaseOrders:seenIds.size===purchaseOrders.length,
  uniqueReceipts:seenReceipts.size===receipts.length
 };
 if(!Object.values(checks).every(Boolean))throw new Error('Compras y recepciones SKU no concilian');
 return deepFreeze({
  scope:'sku-cohort',horizonDays,rows,checks,passed:true,totals,
  originalSupplierFillPercent:totals.originalOrderedSkuUnits
   ?100*totals.originalFulfilledSkuUnits/totals.originalOrderedSkuUnits:null,
  boundary:'Entrega de proveedor = llegada modelada al muelle en el día previsto; solo un evento de recepción documenta ingreso al CD. Lo no recibido no es stock, y el plazo indicado no es fecha real ni pago.'
 });
}
