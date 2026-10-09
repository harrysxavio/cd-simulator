import {SKU_CATALOG,ORDER_TEMPLATES} from './sku.js';
import {recoveryComparison} from './recovery.js';
import {skuProcurementReconciliation} from './sku-procurement.js';

/** Single-source audit of the SKU event ledger. Does NOT merge the aggregate engine.
 * Every receipt, unit consumed, completed order and cost derives from one replay.
 */
export function skuAudit({policy='service',plannedOrders=200,actualOrders=260,option='wait',delayDays={},supplierFill={},dailyCapacity=200,days=12,urgentArrivalDay=1,purchaseCoveragePercent=100,receivingUnitCapacity=null,pickingUnitCapacity=null,transportUnitCapacity=null,qualityReleasePercent=100,plannedForecastPercent=100,planningCoveragePercent=100}={}){
 const comparison=recoveryComparison({policy,plannedOrders,actualOrders,option,delayDays,supplierFill,dailyCapacity,days,urgentArrivalDay,purchaseCoveragePercent,qualityReleasePercent,receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity,plannedForecastPercent,planningCoveragePercent});
 // Reconcile commitments and receipts from this same completed event simulation.
 const procurement=skuProcurementReconciliation(comparison);
 const r=comparison.recovered;
 const receipts=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,r.ledger.reduce((sum,day)=>sum+day.received[p.id],0)]));
 const bySku=SKU_CATALOG.map(p=>{
  const opening=r.initial[p.id],received=receipts[p.id],shipped=r.consumed[p.id],closing=r.endingStock[p.id],held=r.heldQuality[p.id];
  return {id:p.id,rotation:p.rotation,opening,received,shipped,closing,held,openingValue:opening*p.unitCost,receivedValue:received*p.unitCost,shippedValue:shipped*p.unitCost,closingValue:closing*p.unitCost,heldValue:held*p.unitCost,balanced:opening+received===shipped+closing+held};
 });
 const orderCount=r.types.reduce((sum,t)=>sum+t.requested,0);
 const completedByType=r.types.reduce((sum,t)=>sum+t.fulfilled,0);
 const shippedFromLedger=r.ledger.reduce((sum,day)=>sum+day.shipped,0);
 const orderUnits=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,r.types.reduce((sum,t)=>sum+t.fulfilled*(t.lines[p.id]||0),0)]));
 const inventoryBalanced=bySku.every(p=>p.balanced&&p.shipped===orderUnits[p.id]);
 const ordersBalanced=orderCount===actualOrders&&completedByType===r.completed&&shippedFromLedger===r.completed&&r.completed+r.pending===actualOrders;
 const total=(key)=>bySku.reduce((sum,p)=>sum+p[key],0);
 const stockValue={opening:total('openingValue'),received:total('receivedValue'),shipped:total('shippedValue'),closing:total('closingValue'),held:total('heldValue')};
 const stockValueBalanced=stockValue.opening+stockValue.received===stockValue.shipped+stockValue.closing+stockValue.held;
 const cashBalanced=Math.abs(comparison.netCashDelta-(comparison.incrementalRevenue-comparison.incrementalExpense))<0.000001;
 const proxyBalanced=Math.abs(comparison.economicProxyDelta-(comparison.netCashDelta+comparison.penaltySaved-comparison.holdingDelta))<0.000001;
 return {bySku,stockValue,procurement,orders:{requested:orderCount,completed:r.completed,pending:r.pending,onTime:r.onTime,late:r.late},checks:{inventoryBalanced,ordersBalanced,stockValueBalanced,cashBalanced,proxyBalanced,procurementBalanced:procurement.passed},passed:inventoryBalanced&&ordersBalanced&&stockValueBalanced&&cashBalanced&&proxyBalanced&&procurement.passed,recovery:comparison,assumptions:'Auditoría física de inventario por SKU (disponible y retenido en Calidad) y valor de stock, basada en un único registro de eventos. No consolida ni sustituye el motor agregado; el valor de unidades despachadas es costo de mercancía ilustrativo, no utilidad ni caja.'};
}
