import test from 'node:test';
import assert from 'node:assert/strict';
import {START} from '../src/engine.js';
import {DEFAULT_SCENARIO} from '../src/scenario.js';
import {demandJourney} from '../src/journey.js';

test('three stages retain original forecast while demand increases',()=>{
 const s={...DEFAULT_SCENARIO,actualDemand:1300};
 const j=demandJourney(START,{},s);
 assert.equal(j.plan.demand,1000);
 assert.equal(j.surprise.demand,1300);
 assert.equal(j.recovery.demand,1300);
 assert.equal(j.recoveryImpact.dispatched,0);
 assert.equal(j.recoveryImpact.marginChange,0);
});
test('demand decrease is shown as an independent post-shock baseline',()=>{
 const j=demandJourney(START,{}, {...DEFAULT_SCENARIO,actualDemand:700});
 assert.equal(j.plan.demand,1000);
 assert.equal(j.surprise.demand,700);
 assert.equal(j.impact.demandChange,-300);
});
test('upstream recovery cannot change purchases or economic baseline',()=>{
 const s={...DEFAULT_SCENARIO,actualDemand:1300};
 const base=demandJourney(START,{},s);
 const stale=demandJourney(START,{commercial:40,planning:40,purchasing:50},s);
 assert.deepEqual(stale.recovery,base.recovery);
 assert.equal(stale.recoveryImpact.expenseChange,0);
});
test('recovery deltas reconcile with actual and recovered snapshots',()=>{
 const j=demandJourney(START,{receiving:500,picking:600,transport:600}, {...DEFAULT_SCENARIO,actualDemand:1300});
 assert.equal(j.recoveryImpact.dispatched,j.recovery.dispatched-j.surprise.dispatched);
 assert.equal(j.recoveryImpact.marginChange,j.recovery.margin-j.surprise.margin);
 assert.equal(j.recoveryImpact.expenseChange,j.recovery.expenses-j.surprise.expenses);
});
