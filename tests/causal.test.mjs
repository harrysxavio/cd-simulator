import test from 'node:test';
import assert from 'node:assert/strict';
import {flow} from '../src/flow.js';
import {causalAudit} from '../src/causal.js';
import {areaKpis} from '../src/kpis.js';
import {DEFAULT_SCENARIO,finance} from '../src/scenario.js';
import {START,NODES} from '../src/engine.js';

test('all eight departments expose at least two valid and distinct metrics',()=>{
 const r=flow(START,{},DEFAULT_SCENARIO),kpis=areaKpis(r,DEFAULT_SCENARIO);
 assert.equal(Object.keys(kpis).length,8);
 for(const n of NODES){
  assert.ok(kpis[n.id].length>=2,n.id+' needs at least two metrics');
  assert.equal(new Set(kpis[n.id].map(k=>k.label)).size,kpis[n.id].length,n.id+' has duplicated metric labels');
  for(const k of kpis[n.id]){
   assert.ok(k.label&&k.formula&&k.meaning,n.id);
   assert.ok(!String(k.value).includes('NaN'),n.id);
  }
 }
});
test('causal counterfactual is reproducible and reconciles financial delta',()=>{
 const a=causalAudit(START,{},DEFAULT_SCENARIO);
 const baseline=flow(START,{},DEFAULT_SCENARIO);
 assert.equal(a.evidence.length,8);
 for(const e of a.evidence){
  assert.ok(Number.isFinite(e.delta)&&Number.isFinite(e.net));
  assert.ok(e.delta>=0);
 }
 assert.equal(a.current.dispatched,baseline.dispatched);
});
test('no intervention is not falsely described as an improvement',()=>{
 const a=causalAudit(START,{},DEFAULT_SCENARIO);
 assert.ok(a.evidence.filter(e=>e.delta===0).every(e=>e.warning.includes('no incrementa')));
});
test('zero staffing does not fabricate productivity',()=>{
 const s={...DEFAULT_SCENARIO,receivingOperators:0,pickingOperators:0};
 const r=flow(START,{},s),k=areaKpis(r,s);
 assert.equal(k.receiving[0].value,'N/D');
 assert.equal(k.picking[0].value,'N/D');
});
test('cash and economic costs remain distinct',()=>{
 const r=flow(START,{},DEFAULT_SCENARIO),f=finance(r,DEFAULT_SCENARIO);
 assert.equal(f.total,f.costOfGoods+f.operationalExpenses);
 assert.equal(f.cashOutflow,f.purchase+f.operationalExpenses);
});
