import {SKU_CATALOG} from './sku.js';
import {skuCostCatalogReadModel} from './sku-cost-catalog.js';

const fail=reason=>{throw new Error('Compras valorizadas SKU: '+reason)};
const qty=n=>Number.isSafeInteger(n)&&n>=0;
const clp=n=>Number.isFinite(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER;
const money=(units,unitCost)=>{
 const n=units*unitCost;
 if(!clp(n))fail('importe CLP inválido');
 return n;
};
const sum=(rows,field)=>{
 const n=rows.reduce((total,row)=>total+row[field],0);
 if(!clp(n))fail('total CLP inválido: '+field);
 return n;
};
const equal=(a,b)=>clp(a)&&clp(b)&&Math.abs(a-b)<0.00001;
const freeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const part of Object.values(value))freeze(part);
  Object.freeze(value);
 }
 return value;
};

/**
 * M4-16: a purchase commitment is not a receipt, consumption or payment.
 *
 * One READ-ONLY projection of the canonical purchase-order manifest, supplier
 * fulfillment book and dated warehouse receipts. The inventory-value book
 * (M4-15) is an independent reconciliation of the SAME events, not another
 * inventory simulation.
 *
 * This does not book trade payables, supplier invoices or cash transactions:
 * payment evidence is absent from this educational model.
 */
export function skuPurchaseCostReadModel({
 purchaseOrders,supplierLedger,receipts,inventoryValuation,comparison,
 catalog=SKU_CATALOG
}={}){
 if(!Array.isArray(purchaseOrders)||!Array.isArray(receipts)
  ||supplierLedger?.scope!=='sku-cohort'||supplierLedger.passed!==true
  ||!qty(supplierLedger.horizonDays)||!Array.isArray(supplierLedger.rows)
  ||inventoryValuation?.scope!=='sku-cohort'||inventoryValuation?.currency!=='CLP'
  ||inventoryValuation?.passed!==true
  ||inventoryValuation.campaignHorizonDays!==supplierLedger.horizonDays
  ||!Array.isArray(inventoryValuation.daily)
  ||inventoryValuation.daily.length!==supplierLedger.horizonDays+1
  ||!comparison?.recovered||comparison.recovered.days!==supplierLedger.horizonDays){
  fail('faltan fuentes de compras, inventario o período compatibles');
 }
 const rates=skuCostCatalogReadModel({catalog});
 if(rates.scope!=='sku-cohort'||rates.currency!=='CLP')fail('catálogo incompatible');
 const costs=new Map(rates.productCosts.map(p=>[p.id,p.rateCLPPerPhysicalUnit]));
 const supplierRows=new Map(supplierLedger.rows.map(row=>[row.id,row]));
 if(supplierRows.size!==purchaseOrders.length||supplierLedger.rows.length!==purchaseOrders.length
  ||new Set(purchaseOrders.map(po=>po?.id)).size!==purchaseOrders.length){
  fail('órdenes de compra repetidas o fuera del libro de proveedor');
 }
 const eventsByPO=new Map(purchaseOrders.map(po=>[po.id,[]]));
 const receiptIds=new Set();
 for(const r of receipts){
  if(!r||typeof r.id!=='string'||receiptIds.has(r.id)
   ||!eventsByPO.has(r.purchaseOrderId)
   ||!qty(r.qty)||r.qty===0||!qty(r.day)||r.day>supplierLedger.horizonDays
   ||!costs.has(r.skuId)||typeof r.lotId!=='string'||!r.lotId){
   fail('recepción sin fecha, lote, orden o SKU trazable');
  }
  receiptIds.add(r.id);
  eventsByPO.get(r.purchaseOrderId).push(r);
 }
 const byPurchaseOrder=purchaseOrders.map(po=>{
  const source=supplierRows.get(po?.id),unitCost=costs.get(po?.skuId);
  if(!source||unitCost===undefined||!['original','urgent'].includes(po.source)
   ||source.skuId!==po.skuId||source.source!==po.source
   ||po.unitCost!==unitCost||!qty(po.orderedQty)
   ||!qty(po.supplierFulfilledQty)||!qty(po.supplierUnfilledQty)
   ||!qty(po.expectedArrivalDay)||po.expectedArrivalDay>365
   ||!qty(source.arrivedByCutoffSkuUnits)||!qty(source.inTransitSkuUnits)
   ||!qty(source.awaitingWarehouseReceiptSkuUnits)
   ||!qty(source.receivedAtWarehouseSkuUnits)
   ||source.modeledArrivalDay!==po.expectedArrivalDay
   ||source.orderedSkuUnits!==po.orderedQty
   ||source.supplierFulfilledSkuUnits!==po.supplierFulfilledQty
   ||source.supplierShortfallSkuUnits!==po.supplierUnfilledQty
   ||po.orderedQty!==po.supplierFulfilledQty+po.supplierUnfilledQty){
   fail('orden o tarifa no concilia con compromiso del proveedor');
  }
  const purchaseReceipts=eventsByPO.get(po.id);
  const received=purchaseReceipts.reduce((total,r)=>total+r.qty,0);
  if(!qty(received)||received!==source.receivedAtWarehouseSkuUnits
   ||purchaseReceipts.some(r=>r.skuId!==po.skuId||r.day<po.expectedArrivalDay)
   ||po.supplierFulfilledQty!==source.inTransitSkuUnits+
    source.awaitingWarehouseReceiptSkuUnits+received
   ||source.arrivedByCutoffSkuUnits!==source.awaitingWarehouseReceiptSkuUnits+received){
   fail('recepción no concilia con fecha, tránsito o muelle');
  }
  const row={
   purchaseOrderId:po.id,skuId:po.skuId,source:po.source,unitCostCLP:unitCost,
   modeledArrivalDay:po.expectedArrivalDay,receiptIds:purchaseReceipts.map(r=>r.id),
   committedSkuUnits:po.orderedQty,fulfilledBySupplierSkuUnits:po.supplierFulfilledQty,
   supplierShortfallSkuUnits:po.supplierUnfilledQty,
   inTransitSkuUnits:source.inTransitSkuUnits,
   waitingWarehouseSkuUnits:source.awaitingWarehouseReceiptSkuUnits,
   warehouseReceivedSkuUnits:received,
   committedCLP:money(po.orderedQty,unitCost),
   supplierFulfilledCLP:money(po.supplierFulfilledQty,unitCost),
   supplierShortfallCLP:money(po.supplierUnfilledQty,unitCost),
   inTransitCLP:money(source.inTransitSkuUnits,unitCost),
   waitingWarehouseCLP:money(source.awaitingWarehouseReceiptSkuUnits,unitCost),
   warehouseReceivedCLP:money(received,unitCost)
  };
  if(row.committedCLP!==row.supplierShortfallCLP+row.inTransitCLP+
   row.waitingWarehouseCLP+row.warehouseReceivedCLP){
   fail('compromiso CLP no reconcilia contra estados de suministro');
  }
  return row;
 });
 const originals=byPurchaseOrder.filter(row=>row.source==='original');
 const urgents=byPurchaseOrder.filter(row=>row.source==='urgent');
 if(originals.length!==catalog.length
  ||new Set(originals.map(row=>row.skuId)).size!==catalog.length){
  fail('cada SKU requiere una orden original única');
 }
 const totals={
  originalCommitmentCLP:sum(originals,'committedCLP'),
  urgentCommitmentCLP:sum(urgents,'committedCLP'),
  totalPurchaseCommitmentCLP:sum(byPurchaseOrder,'committedCLP'),
  supplierFulfilledCLP:sum(byPurchaseOrder,'supplierFulfilledCLP'),
  supplierShortfallCLP:sum(byPurchaseOrder,'supplierShortfallCLP'),
  inTransitCLP:sum(byPurchaseOrder,'inTransitCLP'),
  waitingWarehouseCLP:sum(byPurchaseOrder,'waitingWarehouseCLP'),
  warehouseReceivedCLP:sum(byPurchaseOrder,'warehouseReceivedCLP'),
  shippedMaterialAtStandardCostCLP:inventoryValuation.totals.shippedToDateCLP,
  openingStockAtStandardCostCLP:inventoryValuation.totals.openingCLP,
  closingStockAtStandardCostCLP:inventoryValuation.totals.closingPhysicalCLP
 };
 if(!clp(comparison.urgentBase)||!clp(comparison.urgentSurcharge)
  ||!equal(totals.originalCommitmentCLP,comparison.committedPurchaseValue)
  ||!equal(totals.urgentCommitmentCLP,comparison.urgentBase)
  ||!equal(totals.warehouseReceivedCLP,inventoryValuation.totals.receivedToDateCLP)
  ||!equal(totals.totalPurchaseCommitmentCLP,
   totals.supplierShortfallCLP+totals.inTransitCLP+
   totals.waitingWarehouseCLP+totals.warehouseReceivedCLP)
  ||!equal(totals.openingStockAtStandardCostCLP+totals.warehouseReceivedCLP,
   totals.shippedMaterialAtStandardCostCLP+totals.closingStockAtStandardCostCLP)){
  fail('saldo económico de compras no coincide con inventario y compromisos');
 }
 // Daily receipts are evidence for inventory capitalization; NOT evidence
 // of a supplier payment. The original commitment has no known payment date.
 const daily=[],running=new Map(byPurchaseOrder.map(p=>[p.purchaseOrderId,0]));
 for(let day=0;day<=supplierLedger.horizonDays;day++){
  const today=receipts.filter(r=>r.day===day);
  const bySource={original:0,urgent:0};
  const events=today.map(r=>{
   const po=byPurchaseOrder.find(p=>p.purchaseOrderId===r.purchaseOrderId);
   const value=money(r.qty,po.unitCostCLP);
   bySource[po.source]+=value;
   running.set(po.purchaseOrderId,running.get(po.purchaseOrderId)+value);
   return {receiptId:r.id,purchaseOrderId:po.purchaseOrderId,skuId:r.skuId,
    lotId:r.lotId,day,units:r.qty,receivedCLP:value};
  });
  const receivedTodayCLP=sum(events,'receivedCLP');
  const receivedToDateCLP=[...running.values()].reduce((n,x)=>n+x,0);
  if(!clp(receivedToDateCLP)||!equal(receivedTodayCLP,
   inventoryValuation.daily[day]?.totals.receivedTodayCLP)
   ||!equal(receivedToDateCLP,
    inventoryValuation.daily[day]?.totals.receivedToDateCLP)){
   fail('día de recepción CLP no coincide con libro físico');
  }
  daily.push({day,receivedTodayCLP,receivedToDateCLP,
   receivedOriginalCLP:bySource.original,receivedUrgentCLP:bySource.urgent,
   confirmedSupplierPaymentCLP:null,events});
 }
 if(!equal(daily.at(-1).receivedToDateCLP,totals.warehouseReceivedCLP)){
  fail('ingreso acumulado diferente de órdenes recibidas');
 }
 const proxy={
  urgentPrincipalCLP:totals.urgentCommitmentCLP,
  urgentSurchargeCLP:comparison.urgentSurcharge,
  incrementalPurchaseOutflowAssumptionCLP:totals.urgentCommitmentCLP+comparison.urgentSurcharge,
  actualSupplierPaymentsCLP:null,
  actualSupplierInvoicesCLP:null,
  actualOriginalPurchasePaymentCLP:null,
  actualCustomerReceiptsCLP:null,
  category:'illustrative-commitment-not-verified-cash',
  note:'El desembolso incremental usado como proxy para compra urgente NO prueba factura, vencimiento ni pago real; el compromiso original tampoco tiene fecha ni comprobante de pago.'
 };
 if(!clp(proxy.incrementalPurchaseOutflowAssumptionCLP)
  ||!clp(comparison.incrementalExpense)
  ||proxy.incrementalPurchaseOutflowAssumptionCLP>comparison.incrementalExpense+0.00001){
  fail('proxy de desembolso incompatible');
 }
 return freeze({
  passed:true,scope:'sku-cohort',currency:'CLP',
  horizonDays:supplierLedger.horizonDays,accountingStatus:'purchasing-commitment-not-cash',
  byPurchaseOrder,daily,totals,proxy,
  checks:{purchaseStatesBalanced:true,receivedMatchesInventory:true,
   frozenOriginalManifest:true,dayByDayReceiptsBalanced:true},
  exclusions:['aggregate-shift-finance','assumed-original-payment',
   'capitalizing-unreceived-PO','cash-receipt-without-evidence',
   'double-count-stock-consumption'],
  note:'Compra comprometida = solicitud valorizada, NO factura ni salida bancaria. No recibidas: faltante proveedor, tránsito y cola. Solo las recepciones físicas aumentan existencias; el consumo expedido incluye también stock inicial y no puede atribuirse íntegramente a las compras recientes. El recargo urgente y los desembolsos permanecen supuestos, no pagos confirmados.'
 });
}
