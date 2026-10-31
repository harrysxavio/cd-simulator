import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState,normalizeI2GameState} from '../src/i2-game-state.js';
import {I2_AREAS} from '../src/i2-product-contract.js';
import {i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';
import {I2_PICKING_PILOT,i2IsPickingPilot,i2StartPickingPilot,
 i2LeavePickingPilot,i2PickingPilotReflection}
 from '../src/i2-guided-picking-pilot.js';

/** Input contract and old game save schema are unchanged. */
test('I2-35.2: guided mission is selectable before confirming, persistent and reversible',()=>{
 const normal=newI2GameState();
 const activated=i2StartPickingPilot(normal);
 assert.equal(activated.seed,'alpha-case-04');
 assert.equal(activated.advanced.pickingLimitSkuPerDay,'10');
 assert.equal(activated.schema,normal.schema);
 assert.equal(activated.campaignId,normal.campaignId);
 assert.equal(activated.phase,'intro');
 assert.equal(i2IsPickingPilot(activated),true);
 assert.deepEqual(normalizeI2GameState(JSON.parse(JSON.stringify(activated))),activated);
 assert.equal(i2IsPickingPilot(i2LeavePickingPilot(activated)),false);
 assert.equal(i2LeavePickingPilot(activated).seed,'alpha-case-01');
 assert.deepEqual(normal,newI2GameState(),'Activating a preset must not mutate prior save');
 assert.throws(()=>i2PickingPilotReflection(activated),/después del resultado/);
 assert.equal(I2_PICKING_PILOT.fixedKnownCapSkuPerDay,10);
});

test('I2-35.2: changing an already-committed plan cannot reset the mission',()=>{
 const active=i2StartPickingPilot(newI2GameState());
 const committed={...active,phase:'area',index:1,
  confirmedAreas:[I2_AREAS[0].id]};
 assert.throws(()=>i2StartPickingPilot(committed),/solo antes/);
 assert.throws(()=>i2LeavePickingPilot(committed),/confirmada/);
});

test('I2-35.2: post-result contrast uses exact demand and original purchases',()=>{
 const active=i2StartPickingPilot(newI2GameState());
 const finished={...active,phase:'result',index:7,
  confirmedAreas:I2_AREAS.map(a=>a.id),reveal:true};
 const lesson=i2PickingPilotReflection(finished);
 const actual=i2MvpPhysicalResult({
  seed:active.seed,advanced:active.advanced,choices:active.choices,option:'wait'
 });
 assert.equal(lesson.actualOrders,actual.actualOrders);
 assert.equal(lesson.restrictedDispatched,actual.shippedOrders);
 assert.equal(lesson.restrictedDispatched,59);
 assert.equal(lesson.unrestrictedDispatched,98);
 assert.equal(lesson.potentialDifferenceOrders,39);
 assert.match(lesson.boundary,/retrospectiva/);
 assert.deepEqual(i2PickingPilotReflection(finished),lesson);
 assert.throws(()=>i2PickingPilotReflection({...finished,reveal:false}),
  /después del resultado/);
});
