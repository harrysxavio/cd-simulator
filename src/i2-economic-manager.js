/** I2-33: allow-listed financial evidence from V1's already audited
 * campaignSnapshot. No new pricing, physical replay, payroll or P&L. */
const fail=m=>{throw new Error('I2-33: '+m)};
const ok=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&Number.isSafeInteger(n);
const deepFreeze=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  for(const child of Object.values(x))deepFreeze(child);
  Object.freeze(x);
 }
 return x;
};
export function i2EconomicEvidence({campaign,comparison,baselineKey}={}){
 const a=campaign?.economicAudit,e=campaign?.economicResult;
 const po=campaign?.purchaseCost,v=campaign?.inventoryValuation;
 const op=campaign?.operationalCost;
 if(campaign?.passed!==true||comparison?.recovered?.days!==12
  ||a?.passed!==true||a.scope!=='sku-cohort'||a.currency!=='CLP'
  ||a.horizonDays!==12||!Object.values(a.checks||{}).every(Boolean)
  ||e?.passed!==true||e?.accountingStatus!=='educational-estimate-not-PnL-or-cash'
  ||po?.passed!==true||v?.passed!==true||op?.passed!==true
  ||!Array.isArray(a.byDay)||a.byDay.length!==13
  ||a.type!=='cross-source-physical-financial-audit'
  ||campaign.currency!=='CLP'||campaign.scope!=='sku-cohort'
  ||a.actualInvoicedSalesCLP!==null||a.actualCustomerCashCLP!==null
  ||a.actualSupplierCashCLP!==null||a.actualNetProfitCLP!==null
  ||e.confirmedEBITDACLP!==null||e.confirmedCustomerDeliveries!==null
  ||typeof baselineKey!=='string'||baselineKey!==comparison.baselineKey)
  fail('auditoría económica V1 o escenario no verificados');
 const t=a.totals,q=po.totals,iv=v.totals;
 const nums=[t.completeShipments,t.receivedIntoInventoryCLP,t.potentialDispatchValueCLP,
  t.dispatchedMaterialsCLP,t.deployedReinforcementCLP,t.closingPhysicalStockCLP,
  t.contractuallyCommittedPurchaseValueCLP,q.originalCommitmentCLP,
  q.urgentCommitmentCLP,iv.openingCLP,comparison.urgentBase,
  comparison.urgentSurcharge,comparison.extraLabor,comparison.incrementalExpense];
 if(nums.some(n=>!ok(n))
  ||!Number.isSafeInteger(t.partialContributionCLP)
  ||t.completeShipments!==comparison.recovered.completed
  ||t.potentialDispatchValueCLP!==e.totals.potentialDispatchValueCLP
  ||t.dispatchedMaterialsCLP!==e.totals.dispatchedMaterialCostCLP
  ||t.deployedReinforcementCLP!==op.totals.totalCostCLP
  ||t.deployedReinforcementCLP!==comparison.extraLabor
  ||t.partialContributionCLP!==t.potentialDispatchValueCLP-
    t.dispatchedMaterialsCLP-t.deployedReinforcementCLP
  ||t.receivedIntoInventoryCLP!==q.warehouseReceivedCLP
  ||t.contractuallyCommittedPurchaseValueCLP!==
    q.originalCommitmentCLP+q.urgentCommitmentCLP
  ||t.closingPhysicalStockCLP!==iv.closingPhysicalCLP
  ||iv.openingCLP+t.receivedIntoInventoryCLP!==
    t.dispatchedMaterialsCLP+t.closingPhysicalStockCLP
  ||q.urgentCommitmentCLP!==comparison.urgentBase
  ||q.originalCommitmentCLP!==comparison.committedPurchaseValue
  ||comparison.incrementalExpense!==comparison.urgentBase+
    comparison.urgentSurcharge+comparison.extraLabor)
  fail('no concilia valor, consumo, balance SKU o CLP del motor original');
 const purchaseRows=po.byPurchaseOrder.map(row=>{
  if(!['original','urgent'].includes(row.source)||!['A','B','C'].includes(row.skuId)
   ||![row.committedCLP,row.warehouseReceivedCLP,row.supplierShortfallCLP,
     row.inTransitCLP,row.waitingWarehouseCLP].every(ok)
   ||row.committedCLP!==row.warehouseReceivedCLP+row.supplierShortfallCLP+
     row.inTransitCLP+row.waitingWarehouseCLP)
   fail('PO inconsistente');
  return {skuId:row.skuId,source:row.source,committedCLP:row.committedCLP,
   receivedCLP:row.warehouseReceivedCLP,inTransitCLP:row.inTransitCLP,
   waitingReceiptCLP:row.waitingWarehouseCLP,
   shortfallCLP:row.supplierShortfallCLP};
 });
 const days=a.byDay.map((d,i)=>{
  if(d.day!==i||![d.receivedIntoInventoryCLP,d.completeShipments,
   d.dispatchPotentialCLP,d.dispatchedMaterialsCLP,
   d.activatedReinforcementCLP].every(ok)
   ||!Number.isSafeInteger(d.partialContributionCLP)
   ||d.partialContributionCLP!==d.dispatchPotentialCLP-
     d.dispatchedMaterialsCLP-d.activatedReinforcementCLP)
   fail('registro contable diario no conciliado');
  return {day:i,receivedStockValueCLP:d.receivedIntoInventoryCLP,
   shippedOrders:d.completeShipments,illustrativeDispatchValueCLP:d.dispatchPotentialCLP,
   shippedMaterialStandardCostCLP:d.dispatchedMaterialsCLP,
   activatedExtraShiftsCLP:d.activatedReinforcementCLP,
   partialContributionCLP:d.partialContributionCLP};
 });
 const sum=(key)=>days.reduce((n,x)=>n+x[key],0);
 if(sum('receivedStockValueCLP')!==t.receivedIntoInventoryCLP
  ||sum('shippedOrders')!==t.completeShipments
  ||sum('illustrativeDispatchValueCLP')!==t.potentialDispatchValueCLP
  ||sum('shippedMaterialStandardCostCLP')!==t.dispatchedMaterialsCLP
  ||sum('activatedExtraShiftsCLP')!==t.deployedReinforcementCLP
  ||sum('partialContributionCLP')!==t.partialContributionCLP
  ||purchaseRows.reduce((n,x)=>n+x.committedCLP,0)!==
    t.contractuallyCommittedPurchaseValueCLP)
  fail('sumas diarias o compras no concilian');
 return deepFreeze({
  kind:'i2-v1-economic-audit-evidence',scope:'sku-cohort',
  status:'audited-illustrative-not-PnL',currency:'CLP',horizonDays:12,baselineKey,
  ordersShipped:t.completeShipments,
  illustrativeDispatchValueCLP:t.potentialDispatchValueCLP,
  shippedMaterialStandardCostCLP:t.dispatchedMaterialsCLP,
  activatedExtraShiftsCLP:t.deployedReinforcementCLP,
  partialContributionCLP:t.partialContributionCLP,
  openingStockValueCLP:iv.openingCLP,receivedStockValueCLP:t.receivedIntoInventoryCLP,
  closingStockValueCLP:t.closingPhysicalStockCLP,
  originalPurchaseCommitmentCLP:q.originalCommitmentCLP,
  urgentPurchaseCommitmentCLP:q.urgentCommitmentCLP,
  urgentSurchargeCommitmentCLP:comparison.urgentSurcharge,
  modeledIncrementalExpenseCLP:comparison.incrementalExpense,
  purchaseRows,days,
  excluded:['Compras originales y urgentes comprometidas: no pago ni gasto de nuevo',
   'Recargo urgente comprometido: no factura ni gasto de refuerzo desplegado',
   'Inventario físico restante: activo no consumido ni venta'],
  unknown:{paidSupplierCLP:null,billedSalesCLP:null,customerDeliveries:null,
   netProfitCLP:null,ebitdaCLP:null,totalOperatingCostCLP:null,
   personHours:null,transportFreightCLP:null},
  source:'campaignSnapshot.economicAudit (skuEconomicAuditReadModel V1), economicResult, purchaseCost, inventoryValuation y operationalCost; no motor nuevo'
 });
}
/** Explicit recovery-vs-wait educational financial reading.
 * The material of both replays is audited; never sum an order commitment
 * as an additional expense after consumption. */
export function i2EconomicManagerReading({state,scorecard,selected,original}={}){
 if(state?.phase!=='result'||state.reveal!==true
  ||scorecard?.status!=='revealed-canonical'||scorecard.scope!=='sku-cohort'
  ||selected?.kind!=='i2-v1-economic-audit-evidence'
  ||original?.kind!=='i2-v1-economic-audit-evidence'
  ||selected.baselineKey!==original.baselineKey
  ||selected.currency!=='CLP'||original.currency!=='CLP'
  ||selected.ordersShipped!==scorecard.shippedOrders.value
  ||original.ordersShipped!==scorecard.baselineShipped.value
  ||selected.originalPurchaseCommitmentCLP!==
   scorecard.committedOriginalPurchases.value
  ||original.originalPurchaseCommitmentCLP!==
   scorecard.committedOriginalPurchases.value
  ||selected.modeledIncrementalExpenseCLP!==scorecard.incrementalExpense.value
  ||original.modeledIncrementalExpenseCLP!==0
  ||scorecard.actualOrders.value!==scorecard.shippedOrders.value+
   scorecard.pendingOrders.value)
  fail('plan elegido y balance original no concilian');
 const delta=scorecard.recoveredOrders.value;
 const incremental=scorecard.incrementalExpense.value;
 const costPerRecoveredOrder=delta>0?incremental/delta:null;
 const partialDifferenceCLP=selected.partialContributionCLP-original.partialContributionCLP;
 const noBenefitWithCost=delta<=0&&incremental>0;
 const purchaseExceedsReceipts=selected.originalPurchaseCommitmentCLP+
  selected.urgentPurchaseCommitmentCLP>selected.receivedStockValueCLP;
 const advice=[
  delta>0?'Se recuperaron '+delta+' pedidos completos. Comprueba si el costo extra justifica la mejora.':
   delta===0?'No se recuperaron pedidos adicionales dentro del horizonte.':
    'Se expidieron '+Math.abs(delta)+' pedidos menos que en el plan original.',
  noBenefitWithCost?'Se incurrió en gasto incremental sin recuperar pedidos; alerta gerencial.':
   'Los compromisos originales se mantienen, aunque cambie la recuperación.',
  'La contribución parcial NO equivale a utilidad, EBITDA, caja ni margen contable: faltan gastos base, fletes e impuestos.'
 ];
 return deepFreeze({
  kind:'i2-economic-manager-reading',scope:'sku-cohort',horizonDays:12,
  currency:'CLP',source:selected.source,selected,original,
  change:{
   recoveredOrders:delta,
   incrementalExpenseCLP:incremental,
   costPerRecoveredOrderCLP:costPerRecoveredOrder,
   partialContributionDeltaCLP:partialDifferenceCLP,
   originalPartialContributionCLP:original.partialContributionCLP,
   selectedPartialContributionCLP:selected.partialContributionCLP
  },
  highlights:{
   noBenefitWithCost,purchaseExceedsReceipts,
   countedMaterialOnlyWhenShipped:true,
   purchaseCommitmentExcludedFromContribution:true,
   extraShiftsOnlyWhenActivated:true
  },
  coach:advice,concepts:{
   contribution:'Valor potencial del pedido COMPLETO expedido - material SKU expedido a costo estándar - refuerzo efectivamente activado.',
   purchase:'Compromiso PO ≠ llegada física ≠ costo consumido ≠ caja pagada.',
   difference:'CLP extra / pedidos recuperados, solo cuando recuperación positiva. Es gasto de decisión por pedido adicional, NO costo unitario total.',
   cash:'Los proxies económicos y recargos de compra no se suman a contribución parcial ni se confunden con pagos.'
  },
  unknown:selected.unknown,
  note:'Importes didácticos de una cohorte física SKU de 12 días. No mezclar con finanzas agregadas por jornada de V1.'
 });
}
