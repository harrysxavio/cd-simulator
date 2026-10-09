import {SKU_CATALOG,ORDER_TEMPLATES} from './sku.js';
import {recoveryComparison} from './recovery.js';

/** Single-source audit of the SKU event ledger. Does NOT merge the aggregate engine.
 * Every receipt, unit consumed, completed order and cost derives from one replay.
 */
export function skuAudit({policy='service',plannedOrders=200,actualOrders=260,option='wait',delayDays={},dailyCapacity=200,days=12,urgentArrivalDay=1,purchaseCoveragePercent=100,receivingUnitCapacity=null,pickingUnitCapacity=null,transportUnitCapacity=null}={}){
 const comparison=recoveryComparison({policy,plannedOrders,actualOrders,option,delayDays,dailyCapacity,days,urgentArrivalDay,purchaseCoveragePercent,receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity});
 const r=comparison.recovered;
 const receipts=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,r.ledger.reduce((sum,day)=>sum+day.received[p.id],0)]));
 const bySku=SKU_CATALOG.map(p=>{
  const opening=r.initial[p.id],received=receipts[p.id],shipped=r.consumed[p.id],closing=r.endingStock[p.id];
  return {id:p.id,rotation:p.rotation,opening,received,shipped,closing,openingValue:opening*p.unitCost,receivedValue:received*p.unitCost,shippedValue:shipped*p.unitCost,closingValue:closing*p.unitCost,balanced:opening+received===shipped+closing};
 });
 const orderCount=r.types.reduce((sum,t)=>sum+t.requested,0);
 const completedByType=r.types.reduce((sum,t)=>sum+t.fulfilled,0);
 const shippedFromLedger=r.ledger.reduce((sum,day)=>sum+day.shipped,0);
 const orderUnits=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,r.types.reduce((sum,t)=>sum+t.fulfilled*(t.lines[p.id]||0),0)]));
 const inventoryBalanced=bySku.every(p=>p.balanced&&p.shipped===orderUnits[p.id]);
 const ordersBalanced=orderCount===actualOrders&&completedByType===r.completed&&shippedFromLedger===r.completed&&r.completed+r.pending===actualOrders;
 const total=(key)=>bySku.reduce((sum,p)=>sum+p[key],0);
 const stockValue={opening:total('openingValue'),received:total('receivedValue'),shipped:total('shippedValue'),closing:total('closingValue')};
 const stockValueBalanced=stockValue.opening+stockValue.received===stockValue.shipped+stockValue.closing;
 const cashBalanced=Math.abs(comparison.netCashDelta-(comparison.incrementalRevenue-comparison.incrementalExpense))<0.000001;
 const proxyBalanced=Math.abs(comparison.economicProxyDelta-(comparison.netCashDelta+comparison.penaltySaved-comparison.holdingDelta))<0.000001;
 return {bySku,stockValue,orders:{requested:orderCount,completed:r.completed,pending:r.pending,onTime:r.onTime,late:r.late},checks:{inventoryBalanced,ordersBalanced,stockValueBalanced,cashBalanced,proxyBalanced},passed:inventoryBalanced&&ordersBalanced&&stockValueBalanced&&cashBalanced&&proxyBalanced,recovery:comparison,assumptions:'Auditoría física y de valoración de la simulación SKU, basada en un único registro de eventos. No consolida ni sustituye el motor agregado; el valor de unidades despachadas es costo de mercancía ilustrativo, no utilidad ni caja.'};
}
