import {SKU_CATALOG} from './sku.js';

/**
 * Reconcile one SKU campaign without combining it with the aggregate-day engine.
 * A purchase commitment is NOT a cash payment, and supplier fulfillment is NOT
 * warehouse receipt. Each state is derived from the same event ledger.
 */
export function skuProcurementReconciliation(comparison){
 if(!comparison?.recovered?.ledger?.length)throw new Error('Se requiere una ejecución SKU con registro diario');
 const operation=comparison.recovered, horizon=operation.days;
 const bySku=SKU_CATALOG.map(sku=>{
  const original=operation.deliveries.find(d=>d.id===sku.id);
  if(!original)throw new Error('Falta entrega original para SKU '+sku.id);
  const urgentOrders=comparison.urgent.filter(d=>d.id===sku.id);
  const urgentOrdered=urgentOrders.reduce((sum,d)=>sum+d.qty,0);
  const urgentDue=urgentOrders.filter(d=>d.day<=horizon).reduce((sum,d)=>sum+d.qty,0);
  // The total received includes urgent deliveries. Subtract urgent receipts
  // instead of treating every warehouse receipt as an original supplier order.
  const received=operation.ledger.reduce((sum,day)=>sum+day.received[sku.id],0);
  const urgentReceived=operation.ledger.reduce((sum,day)=>sum+day.receivedUrgent[sku.id],0);
  const originalReceived=received-urgentReceived;
  const originalDue=original.arrivalDay<=horizon?original.received:0;
  const originalWaitingReceiving=originalDue-originalReceived;
  const urgentWaitingReceiving=urgentDue-urgentReceived;
  const originalInTransit=original.received-originalDue;
  const urgentInTransit=urgentOrdered-urgentDue;
  const inventory={opening:operation.initial[sku.id],received,shipped:operation.consumed[sku.id],held:operation.heldQuality[sku.id],available:operation.endingStock[sku.id]};
  const balanced=original.ordered===original.received+original.unreceived
   && original.received===originalReceived+originalWaitingReceiving+originalInTransit
   && urgentOrdered===urgentReceived+urgentWaitingReceiving+urgentInTransit
   && inventory.opening+inventory.received===inventory.shipped+inventory.held+inventory.available;
  return {id:sku.id,unitCost:sku.unitCost,originalOrdered:original.ordered,originalSupplierFulfilled:original.received,originalSupplierShortfall:original.unreceived,
   originalReceived,originalWaitingReceiving,originalInTransit,urgentOrdered,urgentReceived,urgentWaitingReceiving,urgentInTransit,
   waitingReceiving:originalWaitingReceiving+urgentWaitingReceiving,inventory,openingValue:inventory.opening*sku.unitCost,
   receivedValue:received*sku.unitCost,shippedValue:inventory.shipped*sku.unitCost,heldValue:inventory.held*sku.unitCost,
   availableValue:inventory.available*sku.unitCost,balanced};
 });
 const sum=key=>bySku.reduce((acc,row)=>acc+row[key],0);
 const totals={
  originalOrdered:sum('originalOrdered'),originalSupplierFulfilled:sum('originalSupplierFulfilled'),
  originalSupplierShortfall:sum('originalSupplierShortfall'),originalReceived:sum('originalReceived'),
  originalWaitingReceiving:sum('originalWaitingReceiving'),originalInTransit:sum('originalInTransit'),
  urgentOrdered:sum('urgentOrdered'),urgentReceived:sum('urgentReceived'),
  urgentWaitingReceiving:sum('urgentWaitingReceiving'),urgentInTransit:sum('urgentInTransit'),
  waitingReceiving:sum('waitingReceiving'),
  openingValue:sum('openingValue'),receivedValue:sum('receivedValue'),
  shippedValue:sum('shippedValue'),heldValue:sum('heldValue'),availableValue:sum('availableValue')
 };
 const originalCommitment=operation.deliveries.reduce((sum,d)=>sum+d.ordered*d.unitCost,0);
 const urgentCommitment=comparison.urgentBase;
 const obligations={originalCommitment,urgentCommitment,urgentSurcharge:comparison.urgentSurcharge,
  totalCommitment:originalCommitment+urgentCommitment+comparison.urgentSurcharge,
  warehouseReceivedCost:totals.receivedValue,goodsDispatchedCost:totals.shippedValue};
 const checks={
  originalCommitment:Math.abs(originalCommitment-comparison.committedPurchaseValue)<1e-7,
  urgentCommitment:Math.abs(urgentCommitment-comparison.urgent.reduce((sum,d)=>sum+d.qty*d.unitCost,0))<1e-7,
  receivingQueue:totals.waitingReceiving===operation.waitingReceiving,
  stockValuation:totals.openingValue+totals.receivedValue===totals.shippedValue+totals.heldValue+totals.availableValue,
  perSku:bySku.every(row=>row.balanced)
 };
 return {horizon,bySku,totals,obligations,checks,passed:Object.values(checks).every(Boolean),
  assumptions:'Órdenes comprometidas no equivalen a pagos realizados. Unidades pendientes de proveedor, en tránsito y en cola de Recepción no están disponibles. Valor a costo estándar ficticio; el recargo urgente no se capitaliza y el costo de unidades despachadas no es margen ni flujo de caja. Solo cohorte SKU; no sumar al motor agregado.'};
}
