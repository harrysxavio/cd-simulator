import test from 'node:test';
import assert from 'node:assert/strict';
import {deliveryTimeline} from '../src/timeline.js';

test('purchases do not change same-day service',()=>{
 for(const policy of ['lean','balanced','service']){
  const t=deliveryTimeline({policy});
  assert.equal(t.snapshots[0].complete,97);
  assert.deepEqual(t.snapshots[0].receipts,{A:0,B:0,C:0});
 }
});
test('arrivals respect per-SKU supplier lead time',()=>{
 const t=deliveryTimeline({policy:'service'});
 assert.equal(t.snapshots[1].receipts.A,160);
 assert.equal(t.snapshots[1].receipts.B,0);
 assert.equal(t.snapshots[1].receipts.C,0);
 assert.equal(t.snapshots[2].receipts.B,17);
 assert.equal(t.snapshots[3].receipts.C,29);
});
test('late high rotation SKU delays fulfillment and preserves purchases',()=>{
 const normal=deliveryTimeline({policy:'service'});
 const delayed=deliveryTimeline({policy:'service',delayDays:{A:8}});
 assert.equal(delayed.purchaseValue,normal.purchaseValue);
 assert.equal(delayed.snapshots[1].receipts.A,0);
 assert.equal(delayed.snapshots[1].complete,97);
 assert.equal(delayed.snapshots[3].complete,200);
});
test('supplier partial fill never invents units',()=>{
 const t=deliveryTimeline({policy:'service',supplierFill:{C:50}});
 const c=t.deliveries.find(x=>x.id==='C');
 assert.equal(c.ordered,29);
 assert.equal(c.received,14);
 assert.equal(c.unreceived,15);
 assert.equal(t.snapshots[3].receipts.C,14);
});
test('invalid supplier assumptions rejected',()=>{
 assert.throws(()=>deliveryTimeline({delayDays:{A:-1}}),/inválidos/);
 assert.throws(()=>deliveryTimeline({supplierFill:{B:101}}),/inválidos/);
 assert.throws(()=>deliveryTimeline({checkpoints:[-1]}),/inválido/);
});
