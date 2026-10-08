import test from 'node:test';
import assert from 'node:assert/strict';
import {START} from '../src/engine.js';
import {flow} from '../src/flow.js';
import {DEFAULT_SCENARIO,cleanScenario,finance} from '../src/scenario.js';
import {areaEconomics} from '../src/attention.js';
test('configurable magnitude supports positive or negative revealed demand',()=>{
 const low=cleanScenario({...DEFAULT_SCENARIO,demandShockPercent:30,actualDemand:700});
 const high=cleanScenario({...DEFAULT_SCENARIO,demandShockPercent:40,actualDemand:1400});
 assert.equal(low.actualDemand,700);assert.equal(high.actualDemand,1400);
 const a=flow(START,{},low),b=flow(START,{},high);
 assert.equal(a.ordered,b.ordered);assert.equal(a.estimated,b.estimated);
});
test('explicit observed demand can be hidden until reveal',()=>{
 const s={...DEFAULT_SCENARIO,demandShockPercent:30};
 assert.equal(flow(START,{}, {...s,actualDemand:s.demand}).demand,1000);
 assert.equal(flow(START,{}, {...s,actualDemand:1300}).demand,1300);
});
test('custom capacity incurs incremental resources or premium',()=>{
 const base=finance(flow(START,{},DEFAULT_SCENARIO),DEFAULT_SCENARIO);
 const d={...START,values:{receiving:1000,picking:3000,transport:1500}};
 const premium=finance(flow(d,{},DEFAULT_SCENARIO),DEFAULT_SCENARIO);
 assert.ok(premium.operationalExpenses>base.operationalExpenses);
 assert.ok(premium.capacityLabor.receiving>0);
 assert.ok(premium.capacityLabor.picking>0);
 assert.ok(premium.extraCapacityCosts.transport>0);
});
test('area allocation reconciles including incremental custom capacity',()=>{
 const d={...START,values:{receiving:1000,picking:3000,transport:1500}};
 const e=areaEconomics(d,{},DEFAULT_SCENARIO);
 assert.equal(e.allocatedCurrent+e.finance.fixed,e.finance.operationalExpenses);
});
test('idle recovery costs money even with low demand',()=>{
 const s={...DEFAULT_SCENARIO,actualDemand:300};
 const before=finance(flow(START,{},s),s),after=finance(flow(START,{receiving:500},s),s);
 assert.equal(before.revenue,after.revenue);
 assert.ok(after.operationalExpenses>before.operationalExpenses);
});

test('premium operating modes do not also trigger custom capacity staffing',()=>{
 const d={...START,receiving:'extra',picking:'reinforce'};
 const f=finance(flow(d,{},DEFAULT_SCENARIO),DEFAULT_SCENARIO);
 assert.equal(f.capacityStaff.receiving,0);
 assert.equal(f.capacityStaff.picking,0);
 assert.ok(f.modeCosts.receiving>0);
 assert.ok(f.modeCosts.picking>0);
});
test('flexible area budget separates volume and spend',()=>{
 const s={...DEFAULT_SCENARIO,actualDemand:300};
 const e=areaEconomics(START,{},s);
 const t=e.result.find(x=>x.id==='transport');
 assert.equal(t.reference,e.current.dispatched*s.unitTransportCost);
 assert.equal(t.efficiencyVariance,t.cost-t.reference);
 assert.equal(t.volumeVariance,t.reference-t.staticReference);
});

test('unrevealed scenario does not silently assume a positive shock',()=>{
 const c=cleanScenario({demand:1000,demandShockPercent:30});
 assert.equal(c.actualDemand,1000);
 assert.equal(flow(START,{},c).demand,1000);
});
test('original planning result remains comparable to post-shock result',()=>{
 const original=flow(START,{}, {...DEFAULT_SCENARIO,actualDemand:1000});
 for(const actualDemand of [700,1300]){
  const actual=flow(START,{}, {...DEFAULT_SCENARIO,actualDemand,lockUpstream:true});
  assert.equal(actual.ordered,original.ordered);
  assert.equal(actual.delivered,original.delivered);
  assert.equal(actual.plannedDemand,original.plannedDemand);
  assert.equal(actual.demand,actualDemand);
 }
});
