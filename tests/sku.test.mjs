import test from 'node:test';
import assert from 'node:assert/strict';
import {skuOrderLab} from '../src/sku.js';

test('200 orders are apportioned exactly and complete orders consume whole kits',()=>{
 const r=skuOrderLab();
 assert.equal(r.rows.reduce((n,x)=>n+x.requested,0),200);
 assert.equal(r.complete+r.pending,200);
 assert.equal(r.complete,97);
 assert.equal(r.pending,103);
 assert.equal(r.fulfillment,48.5);
});
test('SKU inventory conserves physical units',()=>{
 const r=skuOrderLab();
 for(const id of Object.keys(r.stockInitial)){
  assert.equal(r.stockInitial[id],r.stockRemaining[id]+r.consumed[id]);
  assert.ok(r.stockRemaining[id]>=0);
 }
});
test('zero stock or capacity cannot fulfill orders',()=>{
 assert.equal(skuOrderLab({stock:{A:0,B:0,C:0}}).complete,0);
 assert.equal(skuOrderLab({dispatchLimit:0}).complete,0);
});
test('ample stock fulfills all orders and odd demand preserves order count',()=>{
 assert.equal(skuOrderLab({stock:{A:1000,B:1000,C:1000}}).complete,200);
 const r=skuOrderLab({orders:101});
 assert.equal(r.rows.reduce((n,x)=>n+x.requested,0),101);
});
test('reject unknown SKU instead of silently generating stock',()=>{
 assert.throws(()=>skuOrderLab({templates:[{id:'invalid',share:100,lines:{UNKNOWN:1}}]}),/inválida/);
});

test('high, medium and low rotation have descending unit demand',()=>{
 const r=skuOrderLab();
 assert.deepEqual(r.skuMetrics.map(x=>x.rotation),['alta','media','baja']);
 assert.ok(r.skuMetrics[0].demand>r.skuMetrics[1].demand);
 assert.ok(r.skuMetrics[1].demand>r.skuMetrics[2].demand);
});
test('rotation and ABC by economic value are distinct measures',()=>{
 const r=skuOrderLab();
 assert.ok(r.skuMetrics.every(x=>['A','B','C'].includes(x.abc)));
 assert.ok(Math.abs(r.skuMetrics.reduce((n,x)=>n+x.valueShare,0)-100)<1e-8);
 assert.equal(r.skuMetrics[0].reorderSuggested,true);
});
test('mixed orders consume stock from all SKUs under proportional allocation',()=>{
 const r=skuOrderLab();
 assert.ok(r.skuMetrics.every(x=>x.consumed>0));
 assert.equal(r.rows.reduce((n,x)=>n+x.complete,0),r.complete);
 assert.equal(r.rows.reduce((n,x)=>n+x.unfulfilled,0),r.pending);
});
