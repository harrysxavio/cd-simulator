import test from 'node:test';
import assert from 'node:assert/strict';
import {START} from '../src/engine.js';
import {flow} from '../src/flow.js';
import {DEFAULT_SCENARIO,cleanScenario,finance} from '../src/scenario.js';
import {areaEconomics} from '../src/attention.js';
test('signed surprise percent is deterministic and does not change planned purchasing',()=>{
 const low=cleanScenario({...DEFAULT_SCENARIO,demandShockPercent:-30,actualDemand:undefined});
 const high=cleanScenario({...DEFAULT_SCENARIO,demandShockPercent:40,actualDemand:undefined});
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
