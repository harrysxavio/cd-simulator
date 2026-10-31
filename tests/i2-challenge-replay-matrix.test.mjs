import test from 'node:test';
import assert from 'node:assert/strict';
import {i2ChallengeReplayMatrix} from '../src/i2-challenge-replay-matrix.js';
import {i2DefaultChoices,i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';

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

test('I2-35: replay respects full session physical settings, not demo defaults',()=>{
 const advanced={...I2_DEFAULT_ADVANCED,plannedOrders:240,
  stockProfile:'low',pickingLimitSkuPerDay:'10',
  extraCapacityDailyCostCLP:100000,reservePercent:25};
 const choices={...i2DefaultChoices(),purchasing:'express'};
 const [m]=i2ChallengeReplayMatrix({seed:'alpha-case-04',choices,advanced});
 const direct=i2MvpPhysicalResult({seed:'alpha-case-04',choices,advanced,option:'wait'});
 assert.equal(m.plannedOrders,240);
 assert.equal(m.actualOrders,direct.actualOrders);
 assert.equal(m.recoveries[0].shippedOrders,direct.shippedOrders);
 assert.equal(m.recoveries[0].pendingOrders,direct.pendingOrders);
 assert.deepEqual(m.recoveries.map(x=>x.option),
  ['wait','overtime','reserve','emergency','combined']);
 // A second configuration may share the demand but must preserve its own physics.
 const defaultVersion=i2ChallengeReplayMatrix({seed:'alpha-case-04'})[0];
 assert.equal(m.shockPercent,defaultVersion.shockPercent);
 assert.throws(()=>i2ChallengeReplayMatrix({advanced:{...advanced,stockProfile:'unsupported'}}),
  /inválida/);
});
