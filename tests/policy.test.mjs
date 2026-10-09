import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryPolicy,POLICY_PRESETS} from '../src/policy.js';

test('three policies order more stock as target coverage increases',()=>{
 const lean=inventoryPolicy({policy:'lean'}),balanced=inventoryPolicy({policy:'balanced'}),service=inventoryPolicy({policy:'service'});
 assert.ok(lean.orderValue<=balanced.orderValue);
 assert.ok(balanced.orderValue<=service.orderValue);
 assert.ok(lean.eventual.complete<=balanced.eventual.complete);
 assert.ok(balanced.eventual.complete<=service.eventual.complete);
 assert.equal(service.eventual.complete,200);
});
test('purchase cash reconciles with SKU unit costs',()=>{
 for(const policy of Object.keys(POLICY_PRESETS)){
  const r=inventoryPolicy({policy});
  assert.equal(r.orderValue,r.perSku.reduce((n,p)=>n+p.ordered*p.unitCost,0));
  assert.equal(r.procurementCash,r.orderValue);
  assert.ok(r.perSku.every(p=>p.ordered>=0&&Number.isInteger(p.ordered)));
 }
});
test('policies cannot claim immediate availability',()=>{
 const r=inventoryPolicy({policy:'service'});
 assert.equal(r.baseline.complete,97);
 assert.equal(r.delta.complete,r.eventual.complete-r.baseline.complete);
 assert.match(r.assumptions,/NO representa disponibilidad inmediata/);
});
test('reject invalid policy and target coverage',()=>{
 assert.throws(()=>inventoryPolicy({policy:'unknown'}),/desconocida/);
 assert.throws(()=>inventoryPolicy({targetDays:{A:-1,B:5,C:10}}),/inválida/);
});
