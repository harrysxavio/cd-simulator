import test from 'node:test';
import assert from 'node:assert/strict';
import {I2_EVIDENCED_ARCHETYPES,i2OperationalArchetypeProbe}
 from '../src/i2-operational-archetype-probes.js';

/**
 * The catalogue only admits observed physical facts; it must not claim
 * all three archetypes are independent playable managerial missions.
 */
test('I2-35.2: explicit contract does not expose incomplete probes as missions',()=>{
 assert.deepEqual(I2_EVIDENCED_ARCHETYPES.map(c=>c.id),
  ['ARC-06','ARC-05','ARC-08']);
 for(const c of I2_EVIDENCED_ARCHETYPES){
  assert.equal(c.playable,false);
  assert.ok(c.learning.length>20);
  assert.ok(c.limits.length>30);
 }
 assert.throws(()=>i2OperationalArchetypeProbe('invented'),/sin evidencia/);
});

test('I2-35.2: verified physical Picking restriction has a real throughput delta',()=>{
 const p=i2OperationalArchetypeProbe('ARC-06');
 assert.equal(p.left.actualOrders,p.right.actualOrders);
 assert.equal(p.left.shipped,59);
 assert.equal(p.right.shipped,98);
 assert.equal(p.shippedDelta,39);
 assert.equal(p.comparisonType,'two-exogenous-physical-contexts');
 assert.deepEqual(i2OperationalArchetypeProbe('ARC-06'),p);
});

test('I2-35.2: physical Quality retention reduction does not imply more shipments',()=>{
 const p=i2OperationalArchetypeProbe('ARC-05');
 assert.equal(p.left.heldQualitySku,12);
 assert.equal(p.right.heldQualitySku,0);
 assert.equal(p.left.shipped,103);
 assert.equal(p.right.shipped,103);
 assert.equal(p.shippedDelta,0);
 assert.equal(p.comparisonType,'two-pre-reveal-management-policies');
});

test('I2-35.2: known incremental overtime cost can buy zero throughput',()=>{
 const p=i2OperationalArchetypeProbe('ARC-08');
 assert.equal(p.left.shipped,98);
 assert.equal(p.right.shipped,98);
 assert.equal(p.shippedDelta,0);
 assert.equal(p.left.incrementalExpenseCLP,0);
 assert.equal(p.right.incrementalExpenseCLP,300000);
 assert.equal(p.comparisonType,'same-physical-baseline-recovery');
 assert.equal(p.playable,false);
});
