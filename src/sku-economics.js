/**
 * M4-18 · Economic reading of one physical SKU campaign.
 *
 * This is NOT a P&L, EBITDA, realized revenue, net income or bank cash flow.
 * The partial contribution only uses hypothetical value of physically
 * DISPATCHED complete orders, standard cost of their consumed SKU units,
 * and the incremental operating shifts actually deployed (M4-17).
 *
 * Purchasing commitments, received but unsold stock, urgent surcharge
 * commitments, holding and backlog decision proxies are NOT booked again.
 * Every daily quantity comes from the same canonical campaign records.
 */
import {SKU_COST_DEFAULTS} from './sku-cost-catalog.js';

const invalid=message=>{throw new Error('Resultado económico SKU: '+message)};
const qty=n=>Number.isSafeInteger(n)&&n>=0;
const nonnegative=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER;
const signed=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=Number.MAX_SAFE_INTEGER;
const money=(n,reason)=>{
 if(!signed(n))invalid('importe CLP fuera de rango: '+reason);
 return n;
};
const close=(a,b)=>{
 if(!signed(a)||!signed(b))return false;
 return Math.abs(a-b)<=Math.max(0.000001,8*Number.EPSILON*Math.max(Math.abs(a),Math.abs(b)));
};
const freezeDeep=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const child of Object.values(value))freezeDeep(child);
  Object.freeze(value);
 }
 return value;
};
const sum=(rows,key)=>money(rows.reduce((n,row)=>n+row[key],0),key);

/** Reads events and audited SKU financial models; never calls eventSimulation. */
export function skuPartialContributionReadModel({
 shipments,inventoryValuation,purchaseCost,operationalCost,comparison
}={}){
 const replay=comparison?.recovered;
 const horizon=replay?.days;
 if(!Array.isArray(shipments)
  ||!qty(horizon)||horizon>365||!Array.isArray(replay.ledger)
  ||replay.ledger.length!==horizon+1
  ||inventoryValuation?.passed!==true||inventoryValuation.scope!=='sku-cohort'
  ||inventoryValuation.currency!=='CLP'||inventoryValuation.campaignHorizonDays!==horizon
  ||!Array.isArray(inventoryValuation.daily)||inventoryValuation.daily.length!==horizon+1
  ||purchaseCost?.passed!==true||purchaseCost.scope!=='sku-cohort'
  ||purchaseCost.currency!=='CLP'||purchaseCost.horizonDays!==horizon
  ||operationalCost?.passed!==true||operationalCost.scope!=='sku-cohort'
  ||operationalCost.currency!=='CLP'||operationalCost.horizonDays!==horizon
  ||!Array.isArray(operationalCost.daily)||operationalCost.daily.length!==horizon+1
  ||!nonnegative(comparison.unitRevenue)
  ||!nonnegative(comparison.urgentBase)||!nonnegative(comparison.urgentSurcharge)
  ||!nonnegative(comparison.extraLabor)||!nonnegative(comparison.incrementalExpense)
  ||!nonnegative(comparison.penaltyRecovered)||!nonnegative(comparison.holdingRecovered)
  ||!qty(comparison.base?.completed)||!qty(replay.completed)
  // Comparisons can LOSE dispatches (e.g. independent staging with limited transport).
  // Their incremental revenue may be legitimately negative; gross dispatch value cannot.
  ||!signed(comparison.incrementalRevenue)){
  invalid('fuentes, tarifa, período o alcance incompatibles');
 }
 const unitRevenue=comparison.unitRevenue,shipmentsByDay=new Map(),ids=new Set();
 for(const shipment of shipments){
  if(!shipment||typeof shipment.id!=='string'||!shipment.id
   ||typeof shipment.orderId!=='string'||!shipment.orderId
   ||ids.has(shipment.orderId)||!qty(shipment.day)||shipment.day>horizon
   ||!qty(shipment.units)||shipment.units===0
   ||!shipment.lines||typeof shipment.lines!=='object'
   ||Object.values(shipment.lines).some(n=>!qty(n)||n===0)
   ||Object.values(shipment.lines).reduce((n,x)=>n+x,0)!==shipment.units){
   invalid('expedición duplicada o sin líneas físicas válidas');
  }
  ids.add(shipment.orderId);
  shipmentsByDay.set(shipment.day,(shipmentsByDay.get(shipment.day)||[]).concat(shipment));
 }
 const daily=[];let cumulativeOrders=0,cumulativeRevenue=0,cumulativeConsumedCost=0,cumulativeExtraCost=0;
 for(let day=0;day<=horizon;day++){
  const record=replay.ledger[day],inv=inventoryValuation.daily[day],ops=operationalCost.daily[day];
  const physicalShipments=shipmentsByDay.get(day)||[];
  const shippedOrders=physicalShipments.length;
  const shippedSkuUnits=physicalShipments.reduce((n,shipment)=>n+shipment.units,0);
  if(record?.day!==day||inv?.day!==day||ops?.day!==day
   ||!qty(record.shipped)||!qty(record.shippedUnits)
   ||!qty(ops.shippedOrders)||!qty(ops.pickedOrders)
   ||record.shipped!==shippedOrders||ops.shippedOrders!==shippedOrders
   ||record.shippedUnits!==shippedSkuUnits
   ||!nonnegative(inv.totals?.shippedTodayCLP)
   ||!nonnegative(ops.costCLP)
   ||(ops.activated===false&&ops.costCLP!==0)){
   invalid('expediciones o recursos no concilian con el día físico');
  }
  const potentialDispatchValueCLP=money(shippedOrders*unitRevenue,'expediciones');
  const dispatchedMaterialCostCLP=inv.totals.shippedTodayCLP;
  const incrementalOperatingCostCLP=ops.costCLP;
  const partialContributionCLP=money(
   potentialDispatchValueCLP-dispatchedMaterialCostCLP-incrementalOperatingCostCLP,
   'contribución del día'
  );
  cumulativeOrders+=shippedOrders;
  cumulativeRevenue=money(cumulativeRevenue+potentialDispatchValueCLP,'valor acumulado');
  cumulativeConsumedCost=money(cumulativeConsumedCost+dispatchedMaterialCostCLP,'consumo acumulado');
  cumulativeExtraCost=money(cumulativeExtraCost+incrementalOperatingCostCLP,'refuerzo acumulado');
  const cumulativePartialContributionCLP=money(
   cumulativeRevenue-cumulativeConsumedCost-cumulativeExtraCost,'contribución acumulada');
  if(!close(cumulativeConsumedCost,inv.totals.shippedToDateCLP)){
   invalid('consumo diario difiere del inventario valorizado');
  }
  daily.push({
   day,shippedOrders,shippedSkuUnits,
   potentialDispatchValueCLP,dispatchedMaterialCostCLP,
   incrementalOperatingCostCLP,partialContributionCLP,
   cumulativeShippedOrders:cumulativeOrders,cumulativePotentialDispatchValueCLP:cumulativeRevenue,
   cumulativeDispatchedMaterialCostCLP:cumulativeConsumedCost,
   cumulativeIncrementalOperatingCostCLP:cumulativeExtraCost,
   cumulativePartialContributionCLP
  });
 }
 const potentialDispatchValueCLP=sum(daily,'potentialDispatchValueCLP');
 const dispatchedMaterialCostCLP=sum(daily,'dispatchedMaterialCostCLP');
 const incrementalOperatingCostCLP=sum(daily,'incrementalOperatingCostCLP');
 const partialContributionCLP=money(
  potentialDispatchValueCLP-dispatchedMaterialCostCLP-incrementalOperatingCostCLP,
  'contribución total'
 );
 const last=daily.at(-1),po=purchaseCost.totals,inv=inventoryValuation.totals,ops=operationalCost.totals;
 if(shipments.length!==replay.completed||cumulativeOrders!==replay.completed
  ||!close(potentialDispatchValueCLP,last.cumulativePotentialDispatchValueCLP)
  ||!close(dispatchedMaterialCostCLP,last.cumulativeDispatchedMaterialCostCLP)
  ||!close(incrementalOperatingCostCLP,last.cumulativeIncrementalOperatingCostCLP)
  ||!close(partialContributionCLP,last.cumulativePartialContributionCLP)
  ||!close(dispatchedMaterialCostCLP,inv.shippedToDateCLP)
  ||!close(dispatchedMaterialCostCLP,po.shippedMaterialAtStandardCostCLP)
  ||!close(incrementalOperatingCostCLP,ops.totalCostCLP)
  ||!close(incrementalOperatingCostCLP,comparison.extraLabor)
  ||!close(po.warehouseReceivedCLP,inv.receivedToDateCLP)
  ||!close(inv.openingCLP+inv.receivedToDateCLP,
   inv.shippedToDateCLP+inv.closingPhysicalCLP)
  ||!close(po.urgentCommitmentCLP,comparison.urgentBase)
  ||!close(purchaseCost.proxy.urgentSurchargeCLP,comparison.urgentSurcharge)
  ||!close(comparison.incrementalExpense,
   comparison.urgentBase+comparison.urgentSurcharge+comparison.extraLabor)
  ||!close(comparison.incrementalRevenue,
   (replay.completed-comparison.base.completed)*unitRevenue)){
  invalid('identidades entre pedidos, existencias y resultados inconsistentes');
 }
 // Deliberately not subtracting PO commitments from the same shipped goods:
 // purchased items become inventory and are counted once when dispatched.
 const excludedCommitments={
  originalPurchaseCommitmentCLP:po.originalCommitmentCLP,
  urgentPurchaseCommitmentCLP:po.urgentCommitmentCLP,
  urgentSurchargeCommitmentCLP:purchaseCost.proxy.urgentSurchargeCLP,
  stockStillOnHandCLP:inv.closingPhysicalCLP,
  note:'Son compromisos y activos, no todos gastos del período; el recargo urgente sin factura queda fuera de la contribución parcial.'
 };
 const decisionProxies={
  backlogPenaltyAssumptionCLP:comparison.penaltyRecovered,
  inventoryHoldingAssumptionCLP:comparison.holdingRecovered,
  category:'sensitivity-not-incurred-operating-expense',
  note:'Penalidad y tenencia son supuestos para comparar decisiones, no cargos contables comprobados y no se descuentan de esta contribución.'
 };
 const totals={
  shippedOrders:shipments.length,
  potentialDispatchValueCLP,dispatchedMaterialCostCLP,
  incrementalOperatingCostCLP,partialContributionCLP,
  partialContributionPerDispatchedOrderCLP:shipments.length
   ?partialContributionCLP/shipments.length:null,
  partialContributionRatePercent:potentialDispatchValueCLP
   ?100*partialContributionCLP/potentialDispatchValueCLP:null
 };
 return freezeDeep({
  passed:true,scope:'sku-cohort',currency:'CLP',horizonDays:horizon,
  revenueRateCLPPerCompleteShippedOrder:unitRevenue,
  revenueRateSource:unitRevenue===SKU_COST_DEFAULTS.recovery.revenueCLPPerShippedOrder
   ?'SKU_COST_DEFAULTS.recovery.revenueCLPPerShippedOrder'
   :'recoveryComparison.unitRevenue (custom scenario assumption)',
  concept:'estimated-partial-contribution-from-cd-dispatch',
  accountingStatus:'educational-estimate-not-PnL-or-cash',
  daily,totals,excludedCommitments,decisionProxies,
  confirmedCustomerDeliveries:null,confirmedSalesInvoicesCLP:null,
  confirmedCashReceivedCLP:null,confirmedSupplierPaymentsCLP:null,
  confirmedNetProfitCLP:null,confirmedEBITDACLP:null,
  checks:{completeShipmentsOnly:true,standardMaterialConsumedOnce:true,
   deployedResourceOnly:true,purchasesNotDoubleCounted:true,
   chronologicalReconciliation:true},
  missingCosts:['baseline-warehouse-labor','receiving','quality-inspections',
   'picking-base','transport-freight','taxes','depreciation','returns'],
  note:'Contribución parcial didáctica = valor estimado de pedidos completos EXPEDIDOS desde el CD − costo estándar de SKU expedidos − refuerzo aplicado. No se afirma entrega, venta facturada o cobrada. Compra original/urgente y stock aún existente NO se restan otra vez. Recargos comprometidos, penalidades y tenencia son supuestos separados. Faltan costos base, fletes, impuestos y otras cuentas; NO es utilidad, EBITDA, margen contable ni caja.'
 });
}
