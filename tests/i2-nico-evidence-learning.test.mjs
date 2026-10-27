import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';
import {i2SafeScorecard} from '../src/i2-result-boundary.js';
import {i2ManagerResultBoard} from '../src/i2-manager-result-board.js';
import {i2EconomicManagerReading} from '../src/i2-economic-manager.js';
import {i2NicoEvidenceLearning,I2_EVIDENCE_AWARDS} from '../src/i2-nico-evidence-learning.js';
import {I2_DEFAULT_OBJECTIVES,I2_BUDGET_CHOICES,I2_GOALS} from '../src/i2-management-objectives.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';
import {i2NormalizeMultiRecovery} from '../src/i2-multi-recovery.js';
import {i2ConfirmMultiRecovery,i2ConfirmedMultiOutcome} from '../src/i2-recovery-confirmation.js';

const seeds=['alpha-case-01','alpha-case-02','alpha-case-03','alpha-case-04','alpha-case-05'];
function ready(seed,advanced=I2_DEFAULT_ADVANCED){
 let state=newI2GameState({seed,advanced});
 state=navigateI2GameState(state,'start');
 for(let i=0;i<8;i++)state=navigateI2GameState(state,'forward');
 return navigateI2GameState(state,'reveal');
}
const result=(s,option='wait',arrival=2)=>i2MvpPhysicalResult({
 choices:s.choices,seed:s.seed,advanced:s.advanced,option,urgentArrivalDay:arrival
});
function reading(state,chosen,base,mode='classic',objectives=I2_DEFAULT_OBJECTIVES){
 const score=i2SafeScorecard(chosen),board=i2ManagerResultBoard({
  state,scorecard:score,baseline:base,objectives,mode
 });
 const economics=i2EconomicManagerReading({
  state,scorecard:score,selected:chosen.economicEvidence,original:base.economicEvidence
 });
 return i2NicoEvidenceLearning({state,scorecard:score,board,economics,objectives});
}
function check(m){
 assert.equal(m.kind,'i2-evidence-based-manager-learning');
 assert.equal(m.evidence.dispatched+m.evidence.pending,m.evidence.actual);
 assert.equal(m.evidence.dispatched-m.evidence.originalDispatched,m.evidence.recovered);
 assert.equal(m.learning.recommendations.length,3);
 for(const key of ['facts','good','bad','tradeoffs','hypotheses']){
  const rows=key==='facts'?m.evidence.facts:m.learning[key];
  assert.ok(Array.isArray(rows)&&rows.length);
  assert.ok(rows.every(x=>typeof x==='string'&&x.length>15));
 }
 assert.ok(m.learning.hypotheses.every(x=>x.includes('Hipótesis')||x.includes('Validación faltante')));
 assert.match(m.boundary,/HIPÓTESIS/);
 assert.match(m.boundary,/no es rentabilidad/);
 assert.ok(Object.isFrozen(m)&&Object.isFrozen(m.learning.recommendations));
 if(m.award){
  assert.ok(I2_EVIDENCE_AWARDS.some(a=>a.id===m.award.id));
  assert.equal(m.evidence.service,'green');
  assert.equal(m.evidence.cost,'green');
  assert.notEqual(m.evidence.queue,'red');
  assert.ok(m.award.proof.pendingOrders>=0);
  assert.ok(Object.isFrozen(m.award.proof));
 }else assert.match(m.learning.verdict,/Sin insignia/);
}
test('I2-34: five cases, five classic recovery strategies, real physical/finance evidence',()=>{
 for(const seed of seeds){
  const s=navigateI2GameState(ready(seed),'finish');
  const baseline=result(s),before=JSON.stringify(s);
  for(const option of ['wait','overtime','reserve','emergency','combined']){
   const chosen=result(s,option);
   const adjusted={...s,recovery:option};
   const model=reading(adjusted,chosen,baseline);
   check(model);
   assert.equal(model.mode,'classic');
   assert.equal(model.plan.empty,option==='wait');
   assert.equal(model.evidence.recovered,chosen.recoveredOrders);
   assert.equal(model.evidence.incrementalExpenseCLP,chosen.incrementalExpenseCLP);
   if(chosen.incrementalExpenseCLP>0&&chosen.recoveredOrders<=0)
    assert.ok(model.learning.bad.some(x=>/gasto adicional|presupuesto/.test(x)));
   assert.ok(model.evidence.facts.some(x=>x.includes('plan original')));
  }
  assert.equal(JSON.stringify(s),before,'Nico must never mutate saved state');
 }
});
test('I2-34: 5 cases × confirmed 0/1/2/3 levers, same baseline for awards',()=>{
 for(const seed of seeds){
  const g=ready(seed,{...I2_DEFAULT_ADVANCED,reservePercent:25});
  for(const [purchase,reserve,boost] of [
   [false,false,false],[true,false,false],[true,false,true],[true,true,true]
  ]){
   const actions=i2NormalizeMultiRecovery({
    urgentPurchase:{enabled:purchase,arrivalDay:2,coveragePercent:75},
    reserveTransfer:{enabled:reserve,releaseDay:2},
    capacityBoost:{enabled:boost}
   });
   const done=navigateI2GameState(i2ConfirmMultiRecovery(g,actions),'finish');
   const event=JSON.stringify(done);
   const out=i2ConfirmedMultiOutcome(done),baseline=result(done);
   const score=out.scorecard;
   const board=i2ManagerResultBoard({state:done,scorecard:score,baseline,
    objectives:I2_DEFAULT_OBJECTIVES,mode:'multi'});
   const economics=i2EconomicManagerReading({state:done,scorecard:score,
    selected:out.economicEvidence,original:baseline.economicEvidence});
   const model=i2NicoEvidenceLearning({state:done,scorecard:score,board,economics,
    objectives:I2_DEFAULT_OBJECTIVES});
   check(model);
   assert.equal(model.mode,'multi');
   assert.equal(model.plan.empty,!purchase&&!reserve&&!boost);
   assert.equal(model.plan.actions.length,[purchase,reserve,boost].filter(Boolean).length);
   assert.equal(model.evidence.recovered,out.reading.recoveredOrders);
   assert.equal(JSON.stringify(done),event);
  }
 }
});
test('I2-34: no click, purchased stock, or budget alone earns any award',()=>{
 for(const seed of seeds){
  const s=navigateI2GameState(ready(seed),'finish');
  const baseline=result(s);
  for(const goal of Object.keys(I2_GOALS)){
   for(const budget of I2_BUDGET_CHOICES){
    const objectives={goal,incrementalBudgetCLP:budget};
    for(const option of ['wait','combined']){
     const model=reading({...s,recovery:option},result(s,option),baseline,'classic',objectives);
     check(model);
     if(model.evidence.service!=='green'||model.evidence.cost!=='green'||model.evidence.queue==='red')
      assert.equal(model.award,null);
     if(option==='wait')assert.equal(model.evidence.incrementalExpenseCLP,0);
     if(model.award?.id==='prudence')assert.equal(option,'wait');
     if(model.award?.id==='effective-recovery')assert.ok(model.evidence.recovered>0);
    }
   }
  }
 }
});
test('I2-34: reject unrevealed state, inconsistent scorecard, fake economy and counterfeited badge flags',()=>{
 const start=ready('alpha-case-01'),s=navigateI2GameState(start,'finish');
 const baseline=result(s),chosen=result(s,'combined'),score=i2SafeScorecard(chosen);
 const objectives=I2_DEFAULT_OBJECTIVES;
 const board=i2ManagerResultBoard({state:s,scorecard:score,baseline,objectives});
 const economics=i2EconomicManagerReading({state:s,scorecard:score,
  selected:chosen.economicEvidence,original:baseline.economicEvidence});
 const params={state:s,scorecard:score,board,economics,objectives};
 assert.throws(()=>i2NicoEvidenceLearning({...params,state:start}),/I2-34/);
 assert.throws(()=>i2NicoEvidenceLearning({...params,scorecard:{
  ...score,shippedOrders:{...score.shippedOrders,value:score.shippedOrders.value+1}
 }}),/I2-14|I2-34/);
 assert.throws(()=>i2NicoEvidenceLearning({...params,board:{
  ...board,axes:board.axes.map(x=>x.id==='cost'?{...x,status:'green'}:x)
 }}),/I2-34/);
 assert.throws(()=>i2NicoEvidenceLearning({...params,economics:{
  ...economics,unknown:{...economics.unknown,netProfitCLP:0}
 }}),/I2-34/);
 assert.throws(()=>i2NicoEvidenceLearning({...params,objectives:{goal:'false',incrementalBudgetCLP:0}}),/I2-14/);
});
