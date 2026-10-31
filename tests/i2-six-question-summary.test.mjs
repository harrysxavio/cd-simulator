import test from 'node:test';
import assert from 'node:assert/strict';
import {i2MvpPhysicalResult,i2DefaultChoices} from '../src/i2-mvp-adapter.js';
import {i2SafeScorecard} from '../src/i2-result-boundary.js';
import {i2EvaluateObjectives,I2_DEFAULT_OBJECTIVES} from '../src/i2-management-objectives.js';
import {i2SixQuestionSummary} from '../src/i2-six-question-summary.js';

/** Test the same original cohort against different confirmed decisions. */
for(const option of ['wait','overtime']){
 test('I2-37.1: six audited managerial questions, '+option,()=>{
  const physical=i2MvpPhysicalResult({
   choices:i2DefaultChoices(),seed:'alpha-case-04',option
  });
  const score=i2SafeScorecard(physical);
  const evaluation=i2EvaluateObjectives(score,I2_DEFAULT_OBJECTIVES);
  const summary=i2SixQuestionSummary(score,evaluation);
  assert.equal(summary.rows.length,6);
  assert.deepEqual(summary.rows.map(row=>row.id),
   ['objective','outcome','delta','cost','customer','retry']);
  assert.match(summary.rows[1].answer,new RegExp(String(score.shippedOrders.value)));
  assert.match(summary.rows[4].answer,/no se mide entrega efectiva/);
  assert.match(summary.rows[3].answer,/No es costo total ni utilidad/);
  assert.deepEqual(i2SixQuestionSummary(score,evaluation),summary);
  assert.equal(Object.isFrozen(summary.rows),true);
 });
}

test('I2-37.1: invalid or unrevealed evidence is refused',()=>{
 assert.throws(()=>i2SixQuestionSummary({},{}),/posterior a revelación/);
 const score=i2SafeScorecard(i2MvpPhysicalResult({option:'wait'}));
 const evaluation=i2EvaluateObjectives(score);
 assert.throws(()=>i2SixQuestionSummary({...score,customerDeliveredOrders:5},evaluation),
  /posterior a revelación/);
 assert.throws(()=>i2SixQuestionSummary({...score,pendingOrders:{value:0}},evaluation),
  /no concilian/);
 assert.throws(()=>i2SixQuestionSummary(score,{...evaluation,expense:{
  ...evaluation.expense,valueCLP:evaluation.expense.valueCLP+1
 }}),/no concilian/);
});
