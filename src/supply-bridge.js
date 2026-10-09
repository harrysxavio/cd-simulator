import {recoveryComparison} from './recovery.js';

/** Trace a single SKU intervention through purchasing, receiving, inventory and picking.
 * The aggregate eight-area campaign is intentionally not altered by this pilot.
 */
export function supplyBridge({policy='balanced',plannedOrders=200,actualOrders=200,delayDays={},option='wait',urgentArrivalDay=1}={}){
 const result=recoveryComparison({policy,plannedOrders,actualOrders,delayDays,option,urgentArrivalDay});
 const arrival=Object.fromEntries(result.urgent.map(x=>[x.id,x.day]));
 const receipts=result.recovered.ledger.map(day=>({
  day:day.day,received:{...day.received},shipped:day.shipped,
  completed:day.completed,pending:day.backlog,stock:{...day.stock}
 }));
 const urgentInHorizon=result.urgent.filter(x=>x.day<=result.recovered.days);
 const lateUrgent=result.urgent.filter(x=>x.day>result.recovered.days);
 const improvement=result.recovered.completed-result.base.completed;
 return {
  option,label:result.label,plannedOrders,actualOrders,urgentArrivalDay,
  purchasing:{committedValue:result.committedPurchaseValue,extraUnits:result.urgent.reduce((sum,x)=>sum+x.qty,0),extraCost:result.urgentBase+result.urgentSurcharge,orders:result.urgent.map(x=>({...x}))},
  receiving:{arrivals:arrival,receivedExtraUnits:urgentInHorizon.reduce((sum,x)=>sum+x.qty,0),outsideHorizonUnits:lateUrgent.reduce((sum,x)=>sum+x.qty,0)},
  inventory:{initial:{...result.recovered.initial},ending:{...result.recovered.endingStock},consumed:{...result.recovered.consumed}},
  picking:{completed:result.recovered.completed,pending:result.recovered.pending,improvement},
  finance:{incrementalExpense:result.incrementalExpense,incrementalCash:result.netCashDelta,economicProxy:result.economicProxyDelta},
  receipts,assumptions:'Trazabilidad SKU didáctica: compras → recepción en fecha → stock disponible → pedidos completos. Aún no modifica las ocho áreas del motor agregado.'
 };
}
