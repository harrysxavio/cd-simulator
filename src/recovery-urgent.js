import {SKU_CATALOG} from './sku.js';

/**
 * M5-22 · Independent, read-only audit of URGENT SKU purchase decisions.
 * PO modeled arrival at the dock is NOT warehouse receipt, quality release,
 * verified available stock, payment, nor proof the marginal order was shipped.
 *
 * Reads the canonical physical events (the only source of actual quantities).
 * Never creates a second delivery, receipt, inventory or order simulation.
 */
const fail=reason=>{throw new Error('Compra urgente SKU: '+reason)};
const qty=n=>Number.isSafeInteger(n)&&n>=0;
const cost=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER;
const close=(a,b)=>cost(a)&&cost(b)&&Math.abs(a-b)<=Math.max(0.000001,8*Number.EPSILON*Math.max(a,b));
const freeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const x of Object.values(value))freeze(x);
  Object.freeze(value);
 }
 return value;
};
const sum=(items,key)=>items.reduce((n,row)=>n+row[key],0);
export function urgentPurchaseTraceReadModel({
 comparison,purchaseOrders,supplierLedger,receivingLedger,
 qualityLedger,receipts,purchaseCost
}={}){
 const baseline=comparison?.baselineSnapshot,physical=comparison?.recovered;
 const horizon=physical?.days;
 if(!['wait','reserve','overtime','emergency','combined','multi'].includes(comparison?.option)
  ||baseline?.scope!=='sku-cohort'||baseline?.integrated!==comparison.integrated
  ||baseline.integrated.actual!==comparison.base
  ||!Object.isFrozen(baseline)||!Object.isFrozen(baseline.integrated.originalPurchaseOrders)
  ||!qty(horizon)||horizon>365||physical.ledger?.length!==horizon+1
  ||!qty(comparison.urgentArrivalDay)||comparison.urgentArrivalDay<1||comparison.urgentArrivalDay>365
  ||!qty(comparison.purchaseCoveragePercent)||comparison.purchaseCoveragePercent>100
  ||!Array.isArray(comparison.urgent)||!Array.isArray(purchaseOrders)
  ||!Array.isArray(receipts)||!Array.isArray(supplierLedger?.rows)
  ||supplierLedger.passed!==true||supplierLedger.horizonDays!==horizon
  ||receivingLedger?.passed!==true||receivingLedger.horizonDays!==horizon
  ||qualityLedger?.passed!==true||qualityLedger.horizonDays!==horizon
  ||!Array.isArray(qualityLedger.lots)
  ||purchaseCost?.passed!==true||purchaseCost.horizonDays!==horizon
  ||purchaseCost.scope!=='sku-cohort'
  ||!Array.isArray(purchaseCost.byPurchaseOrder)
  ||!cost(comparison.urgentBase)||!cost(comparison.urgentSurcharge)){
  fail('faltan fuentes de campaña o plazos compatibles');
 }
 const selected=comparison.option==='emergency'||comparison.option==='combined'||
 (comparison.option==='multi'&&comparison.multiActions?.urgentPurchase?.enabled===true);
 const originalBySku=new Map(baseline.integrated.originalPurchaseOrders.rows.map(p=>[p.skuId,p]));
 const demandBySku=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,0]));
 for(const order of baseline.integrated.actual.ordersDetail){
  if(!order?.lines||typeof order.lines!=='object')fail('pedido base sin lista SKU');
  for(const [id,n] of Object.entries(order.lines)){
   if(!Object.hasOwn(demandBySku,id)||!qty(n))fail('demanda SKU inválida');
   demandBySku[id]+=n;
  }
 }
 const urgentBySku=new Map();
 for(const urgent of comparison.urgent){
  if(!selected||!urgent||urgentBySku.has(urgent.id)
   ||!SKU_CATALOG.some(p=>p.id===urgent.id)
   ||!qty(urgent.qty)||urgent.qty===0
   ||urgent.day!==comparison.urgentArrivalDay
   ||urgent.unitCost!==SKU_CATALOG.find(x=>x.id===urgent.id).unitCost){
   fail('pedido urgente no concilia con la decisión');
  }
  urgentBySku.set(urgent.id,urgent);
 }
 const poById=new Map(purchaseOrders.map(po=>[po.id,po]));
 const supplierById=new Map(supplierLedger.rows.map(row=>[row.id,row]));
 const moneyById=new Map(purchaseCost.byPurchaseOrder.map(row=>[row.purchaseOrderId,row]));
 const urPo=purchaseOrders.filter(po=>po.source==='urgent');
 if(poById.size!==purchaseOrders.length||supplierById.size!==purchaseOrders.length
  ||moneyById.size!==purchaseOrders.length||urPo.length!==urgentBySku.size){
  fail('PO duplicadas o sin trazabilidad');
 }
 const lotsByPo=new Map();
 for(const lot of qualityLedger.lots){
  if(!lotsByPo.has(lot.purchaseOrderId))lotsByPo.set(lot.purchaseOrderId,[]);
  lotsByPo.get(lot.purchaseOrderId).push(lot);
 }
 const receiptsByPo=new Map();
 for(const receipt of receipts){
  if(!poById.has(receipt.purchaseOrderId))fail('recepción sin PO');
  if(!receiptsByPo.has(receipt.purchaseOrderId))receiptsByPo.set(receipt.purchaseOrderId,[]);
  receiptsByPo.get(receipt.purchaseOrderId).push(receipt);
 }
 let principal=0,ordered=0,arrived=0,received=0,qualityReleased=0,qualityHeld=0,inTransit=0,waitingDock=0;
 const bySku=SKU_CATALOG.map(p=>{
  const original=originalBySku.get(p.id),
   baseDelivery=baseline.integrated.actual.deliveries.find(x=>x.id===p.id);
  if(!original||!baseDelivery||baseDelivery.received!==original.supplierFulfilledQty){
   fail('compromiso original del proveedor alterado');
  }
  const demand=demandBySku[p.id];
  const consideredSupply=baseline.openingState.openingBySku[p.id]+baseDelivery.received;
  const shortage=Math.max(0,demand-consideredSupply);
  const expected=selected?Math.ceil(shortage*comparison.purchaseCoveragePercent/100):0;
  const urgent=urgentBySku.get(p.id);
  if(expected!==(urgent?.qty||0))fail('cantidad urgente distinta del faltante y cobertura');
  const purchase=urPo.find(po=>po.skuId===p.id);
  if(Boolean(purchase)!==Boolean(expected))fail('falta PO extraordinaria o sobran unidades');
  const id=purchase?.id||null;
  const supplier=id?supplierById.get(id):null,amount=id?moneyById.get(id):null;
  if(id&&(!supplier||!amount||purchase.expectedArrivalDay!==comparison.urgentArrivalDay
   ||purchase.orderedQty!==expected||purchase.supplierFulfilledQty!==expected
   ||purchase.supplierUnfilledQty!==0||purchase.unitCost!==p.unitCost
   ||supplier.orderedSkuUnits!==expected||supplier.supplierFulfilledSkuUnits!==expected
   ||supplier.modeledArrivalDay!==purchase.expectedArrivalDay
   ||amount.committedSkuUnits!==expected||amount.unitCostCLP!==p.unitCost)){
   fail('PO/plazo/compromiso no concilian con proveedor');
  }
  const lotReceipts=id?(receiptsByPo.get(id)||[]):[];
  const qualityLots=id?(lotsByPo.get(id)||[]):[];
  const physicalReceived=lotReceipts.reduce((n,r)=>n+r.qty,0);
  const released=qualityLots.reduce((n,l)=>n+l.releasedSkuUnits,0);
  const held=qualityLots.reduce((n,l)=>n+l.heldSkuUnits,0);
  const modeledDockArrival=expected&&comparison.urgentArrivalDay<=horizon?expected:0;
  const transitUnits=expected-modeledDockArrival;
  const dockQueue=modeledDockArrival-physicalReceived;
  if(dockQueue<0||physicalReceived!==released+held
   ||qualityLots.reduce((n,l)=>n+l.receivedSkuUnits,0)!==physicalReceived
   ||lotReceipts.some(r=>r.skuId!==p.id||r.day<comparison.urgentArrivalDay
    ||r.day>horizon||r.qty<=0)
   ||qualityLots.some(l=>l.skuId!==p.id||l.receivedDay<comparison.urgentArrivalDay)
   ||(id&&(supplier.receivedAtWarehouseSkuUnits!==physicalReceived
    ||supplier.awaitingWarehouseReceiptSkuUnits!==dockQueue
    ||supplier.inTransitSkuUnits!==transitUnits
    ||amount.warehouseReceivedSkuUnits!==physicalReceived
    ||amount.waitingWarehouseSkuUnits!==dockQueue
    ||amount.inTransitSkuUnits!==transitUnits))
   ||(id&&!close(amount.committedCLP,expected*p.unitCost))){
   fail('llegada, muelle, ingreso y Calidad no concilian');
  }
  principal+=expected*p.unitCost;ordered+=expected;
  arrived+=modeledDockArrival;received+=physicalReceived;
  qualityReleased+=released;qualityHeld+=held;
  inTransit+=transitUnits;waitingDock+=dockQueue;
  return {
   skuId:p.id,purchaseOrderId:id,
   theoreticalDemandSkuUnits:demand,
   originalOpeningSkuUnits:baseline.openingState.openingBySku[p.id],
   originalSupplierCommittedFulfilledSkuUnits:baseDelivery.received,
   originalSupplierModeledArrivalDay:baseDelivery.arrivalDay,
   shortageAfterModeledOriginalSupplySkuUnits:shortage,
   coveragePercent:comparison.purchaseCoveragePercent,
   committedSkuUnits:expected,
   unitStandardCostCLP:p.unitCost,principalCommittedCLP:expected*p.unitCost,
   modeledDockArrivalDay:id?comparison.urgentArrivalDay:null,
   modeledArrivedAtDockSkuUnits:modeledDockArrival,
   inTransitAtCutoffSkuUnits:transitUnits,
   waitingWarehouseAtCutoffSkuUnits:dockQueue,
   warehouseReceivedSkuUnits:physicalReceived,
   releasedFromQualitySkuUnits:released,
   heldAtQualitySkuUnits:held,
   firstWarehouseReceiptDay:lotReceipts.length?Math.min(...lotReceipts.map(r=>r.day)):null,
   firstQualityReleaseDay:qualityLots.some(l=>l.firstReleaseDay!==null)
    ?Math.min(...qualityLots.filter(l=>l.firstReleaseDay!==null).map(l=>l.firstReleaseDay)):null,
   receiptIds:lotReceipts.map(r=>r.id),
   supplierPromiseVerified:false,bankPaymentVerified:false
  };
 });
 const dayRows=[];
 let runningReceived=0;
 for(let day=0;day<=horizon;day++){
  const event=physical.ledger[day];
  if(event?.day!==day||!Array.isArray(event.dockArrivals)
   ||!Array.isArray(event.receiptEvents)
   ||!Array.isArray(event.releaseEvents)){
   fail('falta cronología de eventos');
  }
  const dock=event.dockArrivals.filter(x=>x.urgent);
  const warehouse=event.receiptEvents.filter(x=>x.urgent);
  const ids=new Set(urPo.map(x=>x.id));
  if(dock.some(x=>!ids.has(x.purchaseOrderId)||x.day!==day
   ||x.qty!==poById.get(x.purchaseOrderId).orderedQty)
   ||warehouse.some(x=>!ids.has(x.purchaseOrderId)||x.day!==day)
   ||dock.reduce((n,x)=>n+x.qty,0)!==(day===comparison.urgentArrivalDay?ordered:0)){
   fail('cronología anticipada o con proveedor incorrecto');
  }
  const todayReceived=warehouse.reduce((n,x)=>n+x.qty,0);
  const sourceReceipts=receipts.filter(r=>r.day===day&&ids.has(r.purchaseOrderId));
  if(sourceReceipts.length!==warehouse.length||sourceReceipts.some(r=>!warehouse.some(e=>
    e.lotId===r.lotId&&e.purchaseOrderId===r.purchaseOrderId
    &&e.skuId===r.skuId&&e.qty===r.qty)))fail('recepción urgente no corresponde a lote');
  runningReceived+=todayReceived;
  dayRows.push({day,arrivedAtDockSkuUnits:dock.reduce((n,x)=>n+x.qty,0),
   warehouseReceivedSkuUnits:todayReceived,receivedToDateSkuUnits:runningReceived});
 }
 if(runningReceived!==received
  ||!close(principal,comparison.urgentBase)
  ||!close(principal,purchaseCost.totals.urgentCommitmentCLP)
  ||!close(comparison.urgentSurcharge,purchaseCost.proxy.urgentSurchargeCLP)
  ||!close(principal+comparison.urgentSurcharge,
   purchaseCost.proxy.incrementalPurchaseOutflowAssumptionCLP)
  ||ordered!==arrived+inTransit
  ||arrived!==received+waitingDock
  ||received!==qualityReleased+qualityHeld
  ||!selected&&(ordered!==0||comparison.urgentSurcharge!==0)
  ||comparison.originalPurchaseOrders!==baseline.integrated.originalPurchaseOrders){
  fail('saldo de compra, recargo o existencia alterado');
 }
 return freeze({
  passed:true,scope:'sku-cohort',currency:'CLP',horizonDays:horizon,
  option:comparison.option,baselineKey:baseline.scenarioKey,
  supplierReliability:'modeled-full-fulfillment-not-confirmed',
  bySku,daily:dayRows,
  totals:{
   committedSkuUnits:ordered,modeledDockArrivalsSkuUnits:arrived,
   inTransitAtCutoffSkuUnits:inTransit,
   waitingWarehouseAtCutoffSkuUnits:waitingDock,
   warehouseReceivedSkuUnits:received,
   releasedFromQualitySkuUnits:qualityReleased,
   heldAtQualitySkuUnits:qualityHeld,
   principalCommitmentCLP:principal,
   surchargeAssumptionCLP:comparison.urgentSurcharge,
   principalPlusSurchargeCLP:principal+comparison.urgentSurcharge,
   completedOrdersDeltaAgainstFrozenBaseline:comparison.recovered.completed-comparison.base.completed
  },
  checks:{
   sameFrozenBaseline:true,shortageCoverageBySku:true,
   independentUrgentPOs:true,originalManifestUnchanged:true,
   dockDateNotWarehouseReceipt:true,warehouseCapacityQueue:true,
   qualityLotConservation:true,financialCommitmentNotCash:true
  },
  confirmedSupplierShipment:null,confirmedSupplierInvoiceCLP:null,
  confirmedPaymentCLP:null,actualSupplierETA:null,
  note:'La compra urgente se calcula desde faltante teórico por SKU después del stock inicial y entregas originales del proveedor (incluso si su llegada es posterior al corte): no optimiza la cobertura por fecha. Llegada supuesta al muelle NO significa recepción del CD, liberación de Calidad ni disponibilidad para Picking. El recargo es un supuesto, no factura ni pago. La mejora en pedidos completos se compara con la misma base; no implica que todos los SKU expedidos procedan de esta compra, especialmente si hay refuerzo de capacidad.'
 });
}
