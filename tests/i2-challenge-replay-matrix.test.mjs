import test from 'node:test';
import assert from 'node:assert/strict';
import {i2ChallengeReplayMatrix} from '../src/i2-challenge-replay-matrix.js';
import {i2DefaultChoices} from '../src/i2-mvp-adapter.js';

test('I2-35: five seeded challenges replay identically with five recoveries',()=>{
 const a=i2ChallengeReplayMatrix();
 const b=i2ChallengeReplayMatrix();
 assert.deepEqual(a,b);
 assert.equal(a.length,5);
 assert.deepEqual(a.map(c=>c.shockPercent),[40,10,-15,50,-35]);
 for(const challenge of a){
  assert.equal(challenge.recoveries.length,5);
  assert.equal(challenge.recoveries[0].option,'wait');
  for(const recovery of challenge.recoveries){
   assert.equal(recovery.shippedOrders+recovery.pendingOrders,challenge.actualOrders);
   assert.ok(recovery.servicePercent>=0&&recovery.servicePercent<=100);
   assert.ok(recovery.incrementalExpenseCLP>=0);
   assert.equal(recovery.clpPerRecoveredOrder===null,recovery.recoveredOrders<=0);
  }
 }
});

test('I2-35: seed and cohort remain external to managerial decisions',()=>{
 const baseline=i2ChallengeReplayMatrix({seed:'alpha-case-04'});
 const changed=i2ChallengeReplayMatrix({
  seed:'alpha-case-04',choices:{...i2DefaultChoices(),commercial:'under',
   planning:'partial',purchasing:'reliable'}});
 assert.equal(baseline[0].actualOrders,changed[0].actualOrders);
 assert.equal(baseline[0].shockPercent,changed[0].shockPercent);
 assert.deepEqual(i2ChallengeReplayMatrix({seed:'alpha-case-04'}),baseline);
 assert.throws(()=>i2ChallengeReplayMatrix({seed:'invented'}),/semilla/);
 assert.throws(()=>i2ChallengeReplayMatrix({plannedOrders:0}),/muestra/);
});
