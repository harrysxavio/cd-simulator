import test from 'node:test';
import assert from 'node:assert/strict';
import {START} from '../src/engine.js';
import {flow} from '../src/flow.js';
import {areaKpis} from '../src/kpis.js';
import {attentionSignals,areaEconomics} from '../src/attention.js';
import {DEFAULT_SCENARIO,finance} from '../src/scenario.js';
const base=DEFAULT_SCENARIO;
test('real demand changes service without rewriting forecast or purchase plan',()=>{
 const low=flow(START,{}, {...base,actualDemand:700});
 const high=flow(START,{}, {...base,actualDemand:1300});
 assert.equal(low.estimated,high.estimated);
 assert.equal(low.ordered,high.ordered);
 assert.equal(low.demand,700);
 assert.equal(high.demand,1300);
});
test('demand shock is reflected in KPI',()=>{
 const r=flow(START,{}, {...base,actualDemand:1300});
 assert.equal(areaKpis(r,{...base,actualDemand:1300}).commercial[2].value,'30.0 %');
});
test('unnecessary receiving reinforcement is flagged',()=>{
 const x=attentionSignals(START,{receiving:500},{...base,actualDemand:300});
 assert.ok(x.messages.some(m=>m.title.includes('Refuerzo sin expedición')));
});
test('area costs reconcile against allocatable expenses',()=>{
 const e=areaEconomics(START,{},base),f=finance(e.current,base);
 assert.equal(e.allocatedCurrent+f.fixed,f.operationalExpenses);
 assert.equal(e.result.length,8);
});
test('area tolerance is user configurable',()=>{
 const e=areaEconomics(START,{receiving:500},{...base,areaCostTolerance:0});
 assert.equal(e.tolerance,0);
 assert.ok(e.result.some(x=>x.id==='receiving'&&x.over));
});
test('inventory surplus can be shown when demand falls',()=>{
 const r=flow(START,{}, {...base,actualDemand:300});
 assert.ok(areaKpis(r,{...base,actualDemand:300}).inventory.some(x=>x.label.includes('Excedente')));
});

test('reveal locks forecast, purchase and supplier receipt against retroactive recovery',()=>{
 const config={...base,actualDemand:1300,lockUpstream:true};
 const initial=flow(START,{},config);
 const stale=flow(START,{commercial:40,planning:40,purchasing:50},config);
 assert.equal(stale.estimated,initial.estimated);
 assert.equal(stale.ordered,initial.ordered);
 assert.equal(stale.delivered,initial.delivered);
 assert.equal(finance(stale,config).actionCostTotal,0);
});
test('upstream adjustments remain available in unlocked legacy model',()=>{
 const config={...base,actualDemand:1300};
 const initial=flow(START,{},config);
 const changed=flow(START,{planning:40,purchasing:50},config);
 assert.ok(changed.delivered>=initial.delivered);
});
