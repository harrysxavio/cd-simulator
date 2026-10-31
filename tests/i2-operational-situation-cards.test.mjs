import test from 'node:test';
import assert from 'node:assert/strict';
import {i2MvpPhysicalResult,i2DefaultChoices} from '../src/i2-mvp-adapter.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';
import {i2OperationalSituationCards} from '../src/i2-operational-situation-cards.js';

/** Read-only alerts must originate from physical results, not random UI data. */
test('I2-36: operational signals come directly from the canonical original plan',()=>{
 const choices={...i2DefaultChoices(),planning:'buffer',
  purchasing:'express',receiving:'low',quality:'slow',inventory:'count',
  picking:'reinforce',transport:'low'};
 const baseline=i2MvpPhysicalResult({choices,seed:'alpha-case-01',
  advanced:{...I2_DEFAULT_ADVANCED,stockProfile:'low'},option:'wait'});
 const info=i2OperationalSituationCards(baseline);
 assert.equal(info.horizonDays,12);
 assert.ok(info.incidents.length>=1);
 assert.ok(info.incidents.length<=2);
 assert.equal(info.incidents[0].quantity,12);
 assert.equal(info.incidents[0].id,'quality');
 assert.match(info.note,/No son nuevos eventos aleatorios/);
 assert.deepEqual(i2OperationalSituationCards(baseline),info);
 assert.ok(info.incidents.every(item=>item.quantity>0&&item.question.includes('¿')));
});

test('I2-36: rejects fabricated, negative or noncanonical evidence',()=>{
 assert.throws(()=>i2OperationalSituationCards(null),/physical baseline/);
 const baseline=i2MvpPhysicalResult({seed:'alpha-case-04',option:'wait'});
 assert.throws(()=>i2OperationalSituationCards({
  ...baseline,receiving:{totals:{peakDockQueueSkuUnits:-1}}
 }),/invalid operational signal/);
});
