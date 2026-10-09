import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {skuProcurementReconciliation} from '../src/sku-procurement.js';
import {skuAudit} from '../src/audit.js';
import {supplyBridge} from '../src/supply-bridge.js';

test('SKU procurement commitments reconcile with warehouse receipts and stock values',()=>{
 for(const option of ['wait','overtime','emergency','combined']){
  const comparison=recoveryComparison({actualOrders:260,option});
  const ledger=skuProcurementReconciliation(comparison);
  assert.equal(ledger.passed,true,option);
  assert.equal(ledger.obligations.originalCommitment,comparison.committedPurchaseValue);
  assert.equal(ledger.obligations.urgentCommitment,comparison.urgentBase);
  assert.equal(ledger.totals.waitingReceiving,comparison.recovered.waitingReceiving);
  assert.equal(ledger.totals.openingValue+ledger.totals.receivedValue,ledger.totals.shippedValue+ledger.totals.heldValue+ledger.totals.availableValue);
 }
});

test('delivered to the supplier dock is not the same as received inside the DC',()=>{
 const r=recoveryComparison({option:'emergency',actualOrders:260,receivingUnitCapacity:0,urgentArrivalDay:1});
 const audit=skuProcurementReconciliation(r);
 assert.equal(audit.passed,true);
 assert.equal(audit.totals.originalReceived,0);
 assert.equal(audit.totals.urgentReceived,0);
 assert.ok(audit.totals.waitingReceiving>0);
 assert.ok(audit.totals.originalWaitingReceiving>0);
 assert.equal(audit.totals.urgentOrdered,audit.totals.urgentWaitingReceiving);
 assert.equal(audit.obligations.warehouseReceivedCost,0);
});

test('supplier shortfill and future receipts are separate liabilities and are not on-hand',()=>{
 const r=recoveryComparison({days:4,option:'wait',delayDays:{A:8},supplierFill:{A:75,B:75,C:75}});
 const ledger=skuProcurementReconciliation(r);
 assert.equal(ledger.passed,true);
 const a=ledger.bySku.find(x=>x.id==='A');
 assert.ok(a.originalSupplierShortfall>0);
 assert.ok(a.originalInTransit>0);
 assert.equal(a.originalReceived,0);
 assert.equal(a.originalOrdered,a.originalSupplierShortfall+a.originalSupplierFulfilled);
 assert.equal(a.originalSupplierFulfilled,a.originalInTransit+a.originalReceived+a.originalWaitingReceiving);
});

test('late urgent commitments are not falsely counted as receipts or COGS',()=>{
 const r=recoveryComparison({actualOrders:260,option:'emergency',urgentArrivalDay:13,days:12});
 const ledger=skuProcurementReconciliation(r);
 assert.ok(ledger.totals.urgentOrdered>0);
 assert.equal(ledger.totals.urgentInTransit,ledger.totals.urgentOrdered);
 assert.equal(ledger.totals.urgentReceived,0);
 assert.equal(ledger.totals.urgentWaitingReceiving,0);
 assert.ok(ledger.obligations.totalCommitment>ledger.obligations.originalCommitment);
 assert.equal(ledger.passed,true);
});

test('quality-held units remain assets but cannot be dispatched or marked available',()=>{
 const ledger=skuProcurementReconciliation(recoveryComparison({option:'emergency',actualOrders:260,qualityReleasePercent:0}));
 assert.equal(ledger.passed,true);
 assert.ok(ledger.totals.heldValue>0);
 assert.equal(ledger.totals.openingValue+ledger.totals.receivedValue,ledger.totals.shippedValue+ledger.totals.heldValue+ledger.totals.availableValue);
});

test('audit and operating bridge expose identical purchase/receipt totals',()=>{
 const args={policy:'service',plannedOrders:200,actualOrders:260,option:'combined',supplierFill:{A:75,B:75,C:75},receivingUnitCapacity:25,qualityReleasePercent:60,plannedForecastPercent:80,planningCoveragePercent:70};
 const audit=skuAudit(args),bridge=supplyBridge(args);
 assert.equal(audit.passed,true);
 assert.equal(audit.checks.procurementBalanced,true);
 assert.deepEqual(audit.procurement.totals,bridge.procurementLedger.totals);
 assert.deepEqual(audit.procurement.obligations,bridge.procurementLedger.obligations);
});
