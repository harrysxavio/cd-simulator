import test from 'node:test';
import assert from 'node:assert/strict';
import {skuAudit} from '../src/audit.js';

test('SKU reconciliation holds across all policies and recovery choices',()=>{
 for(const policy of ['lean','balanced','service'])for(const option of ['wait','overtime','emergency','combined']){
  const r=skuAudit({policy,option});
  assert.equal(r.passed,true,policy+' / '+option);
  assert.equal(r.stockValue.opening+r.stockValue.received,r.stockValue.shipped+r.stockValue.closing);
  assert.equal(r.orders.requested,r.orders.completed+r.orders.pending);
 }
});
test('surprise and supplier delays preserve one physical ledger',()=>{
 for(const actualOrders of [140,200,260])for(const delayDays of [{},{A:8}]){
  const r=skuAudit({actualOrders,delayDays,option:'emergency'});
  assert.equal(r.passed,true);
 }
});
test('capacity bottleneck and emergency purchases still reconcile',()=>{
 for(const option of ['wait','emergency','combined']){
  const r=skuAudit({dailyCapacity:20,option});
  assert.equal(r.passed,true);
  assert.ok(r.bySku.every(p=>p.opening+p.received===p.shipped+p.closing));
 }
});
