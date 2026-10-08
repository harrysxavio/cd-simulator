import test from 'node:test';
import assert from 'node:assert/strict';
import {skuOrderLab} from '../src/sku.js';

test('200 orders are apportioned exactly and complete orders consume whole kits',()=>{
 const r=skuOrderLab();
 assert.equal(r.rows.reduce((n,x)=>n+x.requested,0),200);
 assert.equal(r.complete+r.pending,200);
 assert.equal(r.complete,120);
 assert.equal(r.pending,80);
 assert.equal(r.fulfillment,60);
});
test('SKU inventory conserves physical units',()=>{
 const r=skuOrderLab();
 for(const id of Object.keys(r.stockInitial)){
  assert.equal(r.stockInitial[id],r.stockRemaining[id]+r.consumed[id]);
  assert.ok(r.stockRemaining[id]>=0);
 }
});
test('zero stock or capacity cannot fulfill orders',()=>{
 assert.equal(skuOrderLab({stock:{A:0,B:0,C:0,D:0}}).complete,0);
 assert.equal(skuOrderLab({dispatchLimit:0}).complete,0);
});
test('ample stock fulfills all orders and odd demand preserves order count',()=>{
 assert.equal(skuOrderLab({stock:{A:1000,B:1000,C:1000,D:1000}}).complete,200);
 const r=skuOrderLab({orders:101});
 assert.equal(r.rows.reduce((n,x)=>n+x.requested,0),101);
});
test('reject unknown SKU instead of silently generating stock',()=>{
 assert.throws(()=>skuOrderLab({templates:[{id:'invalid',share:100,lines:{UNKNOWN:1}}]}),/inválida/);
});
