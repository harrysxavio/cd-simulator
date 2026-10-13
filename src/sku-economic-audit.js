import {skuCostCatalogReadModel} from './sku-cost-catalog.js';
import {SKU_CATALOG} from './sku.js';

/**
 * M4-19 · Read-only second-line financial audit over the ONE physical SKU cohort.
 *
 * Primary evidence: dated warehouse receipts and complete outbound orders,
 * priced with the shared SKU catalog, plus M4-17 activated-shift events.
 * The audit re-derives these values; it does NOT create another replay,
 * ledger of inventory, sale, invoice, payroll or bank transaction.
 *
 * In particular, do not subtract a purchase commitment again after stock
 * is expensed at dispatch, or add mutually exclusive locations to inventory.
 */
const fail=reason=>{throw new Error('Auditoría económica SKU: '+reason)};
const units=n=>Number.isSafeInteger(n)&&n>=0;
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=Number.MAX_SAFE_INTEGER;
const money=(n,why)=>{if(!finite(n))fail('importe inválido: '+why);return n};
const same=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<=Math.max(0.000001,8*Number.EPSILON*Math.max(Math.abs(a),Math.abs(b)));
const requireSame=(a,b,label)=>{if(!same(a,b))fail('no concilia '+label)};
const sum=(items,key)=>money(items.reduce((n,item)=>n+item[key],0),key);
const deepFreeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const part of Object.values(value))deepFreeze(part);
  Object.freeze(value);
 }
 return value;
};
const countUnique=(rows,key)=>{
 const values=rows.map(r=>r?.[key]);
 return values.every(v=>typeof v==='string'&&v.length>0)&&new Set(values).size===values.length;
};
const quantityCost=(quantity,price,label)=>{
 if(!units(quantity)||!units(price))fail('unidad o costo estándar inválido: '+label);
 return money(quantity*price,label);
};

export function skuEconomicAuditReadModel({
 campaignId,horizonDays,comparison,catalog=SKU_CATALOG,
 purchaseOrders,receipts,shipments,orders,inventoryLedger,
 inventoryValuation,purchaseCost,operationalCost,economicResult
}={}){
 const replay=comparison?.recovered,horizon=replay?.days;
 if(typeof campaignId!=='string'||!campaignId
  ||!units(horizonDays)||horizonDays!==horizon||horizon>365
  ||!Array.isArray(replay?.ledger)||replay.ledger.length!==horizon+1
  ||![purchaseOrders,receipts,shipments,orders].every(Array.isArray)
  ||inventoryLedger?.passed!==true||inventoryLedger.scope!=='sku-cohort'
  ||inventoryLedger.horizonDays!==horizon||!Array.isArray(inventoryLedger.daily)
  ||inventoryLedger.daily.length!==horizon+1
  ||inventoryValuation?.passed!==true||inventoryValuation.scope!=='sku-cohort'
  ||inventoryValuation.currency!=='CLP'||inventoryValuation.campaignHorizonDays!==horizon
  ||!Array.isArray(inventoryValuation.daily)||inventoryValuation.daily.length!==horizon+1
  ||purchaseCost?.passed!==true||purchaseCost.scope!=='sku-cohort'
  ||purchaseCost.currency!=='CLP'||purchaseCost.horizonDays!==horizon
  ||!Array.isArray(purchaseCost.daily)||purchaseCost.daily.length!==horizon+1
  ||!Array.isArray(purchaseCost.byPurchaseOrder)
  ||operationalCost?.passed!==true||operationalCost.scope!=='sku-cohort'
  ||operationalCost.currency!=='CLP'||operationalCost.horizonDays!==horizon
  ||!Array.isArray(operationalCost.daily)||operationalCost.daily.length!==horizon+1
  ||economicResult?.passed!==true||economicResult.scope!=='sku-cohort'
  ||economicResult.currency!=='CLP'||economicResult.horizonDays!==horizon
  ||!Array.isArray(economicResult.daily)||economicResult.daily.length!==horizon+1
  ||!finite(comparison?.unitRevenue)||comparison.unitRevenue<0){
  fail('libros, moneda o períodos incompatibles');
 }
 const rates=skuCostCatalogReadModel({catalog});
 if(rates.passed!==true||rates.scope!=='sku-cohort'||rates.currency!=='CLP')fail('tarifas no auditables');
 const price=new Map(rates.productCosts.map(x=>[x.id,x.rateCLPPerPhysicalUnit]));
 if(!countUnique(purchaseOrders,'id')||!countUnique(receipts,'id')
  ||!countUnique(shipments,'id')||!countUnique(shipments,'orderId')
  ||!countUnique(orders,'id')||!countUnique(purchaseCost.byPurchaseOrder,'purchaseOrderId')){
  fail('documento o expedición duplicados');
 }
 const poById=new Map(purchaseOrders.map(po=>[po.id,po]));
 const statusById=new Map(purchaseCost.byPurchaseOrder.map(po=>[po.purchaseOrderId,po]));
 if(poById.size!==statusById.size)fail('manifestaciones de compra distintas');
 for(const po of purchaseOrders){
  const status=statusById.get(po.id),unitCost=price.get(po.skuId);
  if(!status||unitCost===undefined||po.unitCost!==unitCost
   ||status.skuId!==po.skuId||status.source!==po.source
   ||status.unitCostCLP!==unitCost
   ||status.committedSkuUnits!==po.orderedQty
   ||status.fulfilledBySupplierSkuUnits!==po.supplierFulfilledQty
   ||status.supplierShortfallSkuUnits!==po.supplierUnfilledQty
   ||!units(po.orderedQty)||!units(po.supplierFulfilledQty)
   ||!units(po.supplierUnfilledQty)
   ||!units(po.expectedArrivalDay)||po.expectedArrivalDay>365
   ||po.orderedQty!==po.supplierFulfilledQty+po.supplierUnfilledQty
   ||!['original','urgent'].includes(po.source)){
   fail('orden/tarifa no corresponden a su libro de compras');
  }
  requireSame(status.committedCLP,quantityCost(po.orderedQty,unitCost,'PO '+po.id),'compromiso PO '+po.id);
  requireSame(status.supplierShortfallCLP,
   quantityCost(po.supplierUnfilledQty,unitCost,'faltante '+po.id),'faltante PO '+po.id);
  requireSame(status.committedCLP,status.supplierShortfallCLP+
   status.inTransitCLP+status.waitingWarehouseCLP+status.warehouseReceivedCLP,'estado PO '+po.id);
 }
 const orderById=new Map(orders.map(o=>[o.id,o]));
 const postedReceipts=Object.fromEntries(purchaseOrders.map(x=>[x.id,0]));
 const todayReceipts=new Map(),todayShipments=new Map();
 for(const receipt of receipts){
  const po=poById.get(receipt.purchaseOrderId),rate=price.get(receipt.skuId);
  if(!po||rate===undefined||po.skuId!==receipt.skuId
   ||!units(receipt.day)||receipt.day>horizon||receipt.day<po.expectedArrivalDay
   ||!units(receipt.qty)||!receipt.qty||typeof receipt.lotId!=='string'||!receipt.lotId){
   fail('recepción sin evidencia válida de PO/fecha');
  }
  postedReceipts[po.id]+=receipt.qty;
  const amount=quantityCost(receipt.qty,rate,'ingreso '+receipt.id);
  const list=todayReceipts.get(receipt.day)||[];
  list.push({receiptId:receipt.id,purchaseOrderId:po.id,skuId:receipt.skuId,
   physicalSkuUnits:receipt.qty,amountCLP:amount});
  todayReceipts.set(receipt.day,list);
 }
 for(const po of purchaseOrders){
  requireSame(statusById.get(po.id).warehouseReceivedCLP,
   quantityCost(postedReceipts[po.id],price.get(po.skuId),'recibido '+po.id),
   'ingresos de PO '+po.id);
  if(postedReceipts[po.id]>po.supplierFulfilledQty)fail('recepción supera proveedor');
 }
 for(const ship of shipments){
  const order=orderById.get(ship.orderId);
  if(!order||order.status!=='shipped'||order.shippedDay!==ship.day
   ||!units(ship.day)||ship.day>horizon||!units(ship.units)||ship.units===0
   ||!ship.lines||typeof ship.lines!=='object'
   ||Array.isArray(ship.lines)||Object.keys(ship.lines).length===0
   ||Object.entries(ship.lines).some(([id,n])=>!price.has(id)||!units(n)||!n)
   ||Object.values(ship.lines).reduce((n,x)=>n+x,0)!==ship.units
   ||JSON.stringify(ship.lines)!==JSON.stringify(order.lines)){
   fail('expedición no corresponde al pedido completo');
  }
  const itemCLP=money(Object.entries(ship.lines).reduce(
   (total,[id,n])=>total+quantityCost(n,price.get(id),'SKU expedido '+id),0),
   'SKU expedidos');
  const list=todayShipments.get(ship.day)||[];
  list.push({shipmentId:ship.id,orderId:ship.orderId,units:ship.units,materialCLP:itemCLP});
  todayShipments.set(ship.day,list);
 }
 if(orders.filter(o=>o.status==='shipped').length!==shipments.length
  ||shipments.length!==replay.completed)fail('pedidos no conciliados con expediciones');
 const byDay=[];
 let cumulativeReceipts=0,cumulativeMaterial=0,cumulativeValue=0,cumulativeResources=0,cumulativeOrders=0;
 for(let day=0;day<=horizon;day++){
  const r=replay.ledger[day],physical=inventoryLedger.daily[day],
   iv=inventoryValuation.daily[day],po=purchaseCost.daily[day],
   op=operationalCost.daily[day],eco=economicResult.daily[day];
  const arrivals=todayReceipts.get(day)||[],departures=todayShipments.get(day)||[];
  if([r,physical,iv,po,op,eco].some(x=>x?.day!==day)
   ||!Array.isArray(iv.bySku)||iv.bySku.length!==price.size
   ||!Array.isArray(physical.bySku)||physical.bySku.length!==price.size
   ||new Set(iv.bySku.map(x=>x.skuId)).size!==price.size
   ||new Set(physical.bySku.map(x=>x.skuId)).size!==price.size
   ||!units(r.shipped)||!units(r.shippedUnits)
   ||r.shipped!==departures.length
   ||r.shippedUnits!==departures.reduce((n,x)=>n+x.units,0)){
   fail('desfase de día/SKU en libro físico y finanzas');
  }
  const receiptsCLP=sum(arrivals,'amountCLP');
  const materialsCLP=sum(departures,'materialCLP');
  const valueCLP=money(departures.length*comparison.unitRevenue,'valor de expedición');
  const resourceCLP=money(op.costCLP,'refuerzo');
  const shiftActive=operationalCost.extraCapacityOrdersPerDay>0&&(op.pickedOrders>0||op.shippedOrders>0);
  if(op.activated!==shiftActive
   ||!units(op.chargeableShiftCount)
   ||op.chargeableShiftCount!==(shiftActive?1:0)
   ||!units(op.assignedExtraSlots)||!units(op.utilizedExtraSlots)||!units(op.idleExtraSlots)
   ||op.assignedExtraSlots!==op.utilizedExtraSlots+op.idleExtraSlots
   ||op.assignedExtraSlots!==(shiftActive?operationalCost.extraCapacityOrdersPerDay:0)
   ||!same(resourceCLP,op.chargeableShiftCount*operationalCost.rateCLPPerActivatedShift)){
   fail('recurso operacional cargado sin jornada aplicable');
  }
  for(const id of price.keys()){
   const rate=price.get(id),
    physicalRow=physical.bySku.find(x=>x.skuId===id),
    valueRow=iv.bySku.find(x=>x.skuId===id);
   if(!physicalRow||!valueRow||valueRow.unitCostCLP!==rate
    ||!units(physicalRow.receivedTodaySkuUnits)
    ||!units(physicalRow.shippedTodaySkuUnits)){
    fail('cantidades por SKU sin trazabilidad');
   }
   const receiptUnits=arrivals.filter(x=>x.skuId===id).reduce((n,x)=>n+x.physicalSkuUnits,0);
   const shippedUnits=departures.reduce((n,s)=>n+(shipments.find(x=>x.id===s.shipmentId).lines[id]||0),0);
   if(receiptUnits!==physicalRow.receivedTodaySkuUnits
    ||shippedUnits!==physicalRow.shippedTodaySkuUnits){
    fail('recepción/expedición SKU no coincide con inventario');
   }
   requireSame(valueRow.receivedTodayCLP,quantityCost(receiptUnits,rate,'recepción SKU'),'valor de recepción SKU '+id);
   requireSame(valueRow.shippedTodayCLP,quantityCost(shippedUnits,rate,'expedición SKU'),'material expedido SKU '+id);
   requireSame(valueRow.closingPhysicalCLP,
    valueRow.pickFaceCLP+valueRow.qualityHeldCLP+valueRow.reserveCLP+valueRow.stagingCLP,
    'ubicaciones exclusivas SKU '+id);
   requireSame(valueRow.pickFaceCLP,valueRow.verifiedCLP+valueRow.unverifiedCLP,
    'existencias verificables SKU '+id);
  }
  const contributionCLP=money(valueCLP-materialsCLP-resourceCLP,'contribución');
  requireSame(receiptsCLP,iv.totals.receivedTodayCLP,'recepción física día '+day);
  requireSame(receiptsCLP,po.receivedTodayCLP,'recepción compras día '+day);
  requireSame(materialsCLP,iv.totals.shippedTodayCLP,'expedición física día '+day);
  requireSame(valueCLP,eco.potentialDispatchValueCLP,'valor de pedidos día '+day);
  requireSame(materialsCLP,eco.dispatchedMaterialCostCLP,'material día '+day);
  requireSame(resourceCLP,eco.incrementalOperatingCostCLP,'refuerzo día '+day);
  requireSame(contributionCLP,eco.partialContributionCLP,'contribución día '+day);
  cumulativeReceipts=money(cumulativeReceipts+receiptsCLP,'recibido acumulado');
  cumulativeMaterial=money(cumulativeMaterial+materialsCLP,'material acumulado');
  cumulativeValue=money(cumulativeValue+valueCLP,'valor acumulado');
  cumulativeResources=money(cumulativeResources+resourceCLP,'recursos acumulados');
  cumulativeOrders+=departures.length;
  requireSame(cumulativeReceipts,po.receivedToDateCLP,'compras acumuladas día '+day);
  requireSame(cumulativeMaterial,iv.totals.shippedToDateCLP,'consumo acumulado día '+day);
  requireSame(cumulativeValue,eco.cumulativePotentialDispatchValueCLP,'valor acumulado día '+day);
  requireSame(cumulativeResources,eco.cumulativeIncrementalOperatingCostCLP,'refuerzo acumulado día '+day);
  byDay.push({
   day,receivedIntoInventoryCLP:receiptsCLP,completeShipments:departures.length,
   dispatchPotentialCLP:valueCLP,dispatchedMaterialsCLP:materialsCLP,
   activatedReinforcementCLP:resourceCLP,partialContributionCLP:contributionCLP,
   confirmation:'physical-SKU-simulation-not-real-cash'
  });
 }
 const purchase=purchaseCost.totals,inventory=inventoryValuation.totals,
  labour=operationalCost.totals,result=economicResult.totals;
 const contributed=money(cumulativeValue-cumulativeMaterial-cumulativeResources,'contribución cierre');
 requireSame(cumulativeReceipts,purchase.warehouseReceivedCLP,'compras ingresadas');
 requireSame(cumulativeReceipts,inventory.receivedToDateCLP,'inventario recibido');
 requireSame(cumulativeMaterial,purchase.shippedMaterialAtStandardCostCLP,'material en compras');
 requireSame(cumulativeMaterial,inventory.shippedToDateCLP,'material en stock');
 requireSame(cumulativeResources,labour.totalCostCLP,'jornadas aplicadas');
 requireSame(cumulativeValue,result.potentialDispatchValueCLP,'valor potencial cierre');
 requireSame(cumulativeMaterial,result.dispatchedMaterialCostCLP,'costo material cierre');
 requireSame(cumulativeResources,result.incrementalOperatingCostCLP,'costo de refuerzo cierre');
 requireSame(contributed,result.partialContributionCLP,'contribución cierre');
 requireSame(inventory.openingCLP+cumulativeReceipts,cumulativeMaterial+inventory.closingPhysicalCLP,'balance de stock');
 requireSame(purchase.totalPurchaseCommitmentCLP,
  purchase.supplierShortfallCLP+purchase.inTransitCLP+
  purchase.waitingWarehouseCLP+purchase.warehouseReceivedCLP,'saldo de órdenes');
 requireSame(purchaseCost.proxy.urgentPrincipalCLP,purchase.urgentCommitmentCLP,'compromiso extraordinario');
 requireSame(purchaseCost.proxy.urgentSurchargeCLP,comparison.urgentSurcharge,'recargo de compra');
 requireSame(comparison.incrementalExpense,
  comparison.urgentBase+comparison.urgentSurcharge+comparison.extraLabor,'proxy de desembolso');
 requireSame(comparison.netCashDelta,comparison.incrementalRevenue-comparison.incrementalExpense,'proxy de caja');
 requireSame(comparison.economicProxyDelta,comparison.netCashDelta+
  comparison.penaltySaved-comparison.holdingDelta,'proxy económico');
 requireSame(economicResult.excludedCommitments.originalPurchaseCommitmentCLP,
  purchase.originalCommitmentCLP,'compromiso original excluido');
 requireSame(economicResult.excludedCommitments.urgentPurchaseCommitmentCLP,
  purchase.urgentCommitmentCLP,'compromiso urgente excluido');
 requireSame(economicResult.excludedCommitments.urgentSurchargeCommitmentCLP,
  purchaseCost.proxy.urgentSurchargeCLP,'recargo excluido');
 requireSame(economicResult.excludedCommitments.stockStillOnHandCLP,
  inventory.closingPhysicalCLP,'inventario final excluido');
 requireSame(economicResult.decisionProxies.backlogPenaltyAssumptionCLP,
  comparison.penaltyRecovered,'penalidad hipotética');
 requireSame(economicResult.decisionProxies.inventoryHoldingAssumptionCLP,
  comparison.holdingRecovered,'tenencia hipotética');
 if(economicResult.confirmedSalesInvoicesCLP!==null
  ||economicResult.confirmedCashReceivedCLP!==null
  ||economicResult.confirmedSupplierPaymentsCLP!==null
  ||economicResult.confirmedNetProfitCLP!==null
  ||economicResult.confirmedEBITDACLP!==null
  ||economicResult.confirmedCustomerDeliveries!==null
  ||purchaseCost.proxy.actualSupplierPaymentsCLP!==null
  ||purchaseCost.proxy.actualCustomerReceiptsCLP!==null
  ||operationalCost.actualPayrollPaidCLP!==null){
  fail('no hay pruebas de facturas, pagos, utilidad ni entrega al cliente');
 }
 const recognised=[
  {id:'potential-dispatch',role:'illustrative-inflow',signedFactor:1,amountCLP:cumulativeValue,
   source:'campaign.shipments x comparison.unitRevenue',meaning:'Pedidos completos expedidos, no facturados'},
  {id:'shipped-material',role:'standard-cost-expense',signedFactor:-1,amountCLP:cumulativeMaterial,
   source:'campaign.shipments.lines x SKU catalog',meaning:'Costo estándar del material expedido; incluye stock inicial'},
  {id:'deployed-reinforcement',role:'illustrative-operating-expense',signedFactor:-1,amountCLP:cumulativeResources,
   source:'comparison.operationalCost.daily activated shifts',meaning:'Jornadas extra activadas, no nómina pagada'}
 ];
 const excluded=[
  {id:'original-purchase',amountCLP:purchase.originalCommitmentCLP,reason:'compromiso, no consumo nuevo'},
  {id:'urgent-purchase',amountCLP:purchase.urgentCommitmentCLP,reason:'compromiso, no consumo nuevo'},
  {id:'urgent-surcharge',amountCLP:purchaseCost.proxy.urgentSurchargeCLP,reason:'recargo supuesto sin factura'},
  {id:'closing-inventory',amountCLP:inventory.closingPhysicalCLP,reason:'activo físico no despachado'},
  {id:'backlog-proxy',amountCLP:comparison.penaltyRecovered,reason:'penalidad no acreditada'},
  {id:'holding-proxy',amountCLP:comparison.holdingRecovered,reason:'tenencia no acreditada'}
 ];
 if(new Set([...recognised,...excluded].map(x=>x.id)).size!==recognised.length+excluded.length
  ||!recognised.every(x=>finite(x.amountCLP)&&x.amountCLP>=0)
  ||!excluded.every(x=>finite(x.amountCLP)&&x.amountCLP>=0)
  ||!same(sum(recognised.map(x=>({signedCLP:x.amountCLP*x.signedFactor})),'signedCLP'),contributed)){
  fail('cuentas mezcladas o importe duplicado');
 }
 return deepFreeze({
  passed:true,scope:'sku-cohort',currency:'CLP',campaignId,horizonDays:horizon,
  type:'cross-source-physical-financial-audit',status:'illustrative-not-PnL',
  byDay,recognised,excluded,
  totals:{
   completeShipments:cumulativeOrders,
   receivedIntoInventoryCLP:cumulativeReceipts,
   potentialDispatchValueCLP:cumulativeValue,
   dispatchedMaterialsCLP:cumulativeMaterial,
   deployedReinforcementCLP:cumulativeResources,
   partialContributionCLP:contributed,
   closingPhysicalStockCLP:inventory.closingPhysicalCLP,
   contractuallyCommittedPurchaseValueCLP:purchase.totalPurchaseCommitmentCLP
  },
  checks:{
   orderAndShipmentIdentity:true,uniqueReceiptsAndPOs:true,
   datedReceiptsAndDispatch:true,physicalSKUValuation:true,
   stockContinuityAndExclusiveZones:true,
   onlyDeployedReinforcement:true,partialContributionRecomputed:true,
   commitmentsOutsideContribution:true,proxiesOutsideContribution:true,
   noInventedPaymentsOrProfit:true
  },
  confidence:'only-physical-simulation-and-priced-assumptions',
  actualInvoicedSalesCLP:null,actualCustomerCashCLP:null,
  actualSupplierCashCLP:null,actualNetProfitCLP:null,
  note:'Cada importe de la contribución se recalcula desde su evento SKU y se concilia por día. Solo entran tres fuentes distintas: pedidos expedidos, SKU expedidos y jornadas de refuerzo activadas. Las compras comprometidas, recargos, stock que sigue en CD y proxies de penalidad/tenencia se muestran aparte; NO se suman ni se restan otra vez. Sin factura ni prueba de cobro/pago, entrega al cliente, fletes o costos completos, NO es utilidad, EBITDA ni caja.'
 });
}
