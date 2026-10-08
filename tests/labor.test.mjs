import test from 'node:test';
import assert from 'node:assert/strict';
import {START} from '../src/engine.js';
import {flow} from '../src/flow.js';
import {finance,DEFAULT_SCENARIO} from '../src/scenario.js';
import {areaEconomics} from '../src/attention.js';
import {laborAudit} from '../src/labor.js';
test('default eight-hour shift preserves existing standard capacity',()=>{
 const r=flow(START,{},DEFAULT_SCENARIO);
 assert.equal(r.receivingCapacity,650);
 assert.equal(r.inventoryCapacity,1200);
 assert.equal(r.pickingCapacity,2300);
});
test('effective hours scale all three capacities',()=>{
 const r=flow(START,{}, {...DEFAULT_SCENARIO,effectiveHours:4});
 assert.equal(r.receivingCapacity,325);
 assert.equal(r.inventoryCapacity,600);
 assert.equal(r.pickingCapacity,1150);
});
test('labor audit reports productive hours and realistic utilization',()=>{
 const audit=laborAudit(START,{},DEFAULT_SCENARIO);
 assert.equal(audit.result.length,3);
 for(const row of audit.result){
  assert.equal(row.laborHours,row.staff*DEFAULT_SCENARIO.effectiveHours);
  assert.ok(row.utilization>=0&&row.utilization<=1);
  assert.ok(row.staffRequired>=0);
 }
});
test('capacity above selected mode incurs staffing without double charging mode',()=>{
 const standard=finance(flow({...START,receiving:'extra',picking:'reinforce'}, {},DEFAULT_SCENARIO),DEFAULT_SCENARIO);
 assert.equal(standard.capacityStaff.receiving,0);
 assert.equal(standard.capacityStaff.picking,0);
 const d={...START,values:{receiving:1000,picking:3000}};
 const custom=finance(flow(d,{},DEFAULT_SCENARIO),DEFAULT_SCENARIO);
 assert.ok(custom.capacityStaff.receiving>0);
 assert.ok(custom.capacityStaff.picking>0);
});
test('departmental cost allocation remains reconciled',()=>{
 const d={...START,values:{receiving:1000,picking:3000,transport:1500}};
 const e=areaEconomics(d,{},DEFAULT_SCENARIO);
 assert.equal(e.allocatedCurrent+e.finance.fixed,e.finance.operationalExpenses);
});
