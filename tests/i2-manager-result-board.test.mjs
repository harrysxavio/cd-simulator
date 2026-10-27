import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';
import {i2SafeScorecard} from '../src/i2-result-boundary.js';
import {i2ManagerResultBoard} from '../src/i2-manager-result-board.js';
import {I2_DEFAULT_OBJECTIVES} from '../src/i2-management-objectives.js';
import {i2NormalizeMultiRecovery} from '../src/i2-multi-recovery.js';
import {i2ConfirmMultiRecovery,i2ConfirmedMultiOutcome} from '../src/i2-recovery-confirmation.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';

const SEEDS=['alpha-case-01','alpha-case-02','alpha-case-03','alpha-case-04','alpha-case-05'];
function revealed(seed='alpha-case-01',advanced=I2_DEFAULT_ADVANCED){
 let s=newI2GameState({seed,advanced});s=navigateI2GameState(s,'start');
 for(let i=0;i<8;i++)s=navigateI2GameState(s,'forward');
 return navigateI2GameState(s,'reveal');
}
function gameResult(state,option='wait'){
 return i2MvpPhysicalResult({choices:state.choices,option,seed:state.seed,advanced:state.advanced});
}
const make=(state,scorecard,baseline,mode='classic',obj=I2_DEFAULT_OBJECTIVES)=>
 i2ManagerResultBoard({state,scorecard,baseline,objectives:obj,mode});

test('I2-31: all five exogenous cases and classic recoveries yield measured four-axis dashboard',()=>{
 for(const seed of SEEDS){
  const state=revealed(seed),base=gameResult(state,'wait');
  for(const option of ['wait','overtime','combined']){
   const original=gameResult(state,option);
   const score=i2SafeScorecard(original);
   const board=make(state,score,base);
   assert.equal(board.axes.length,4);
   assert.deepEqual(board.axes.map(a=>a.id),['service','capacity','cost','time']);
   assert.equal(board.headline.dispatchedOrders,original.shippedOrders);
   assert.equal(board.headline.pendingOrders,original.pendingOrders);
   assert.equal(board.headline.observedOrders,original.actualOrders);
   assert.equal(board.axes[0].value,100*original.shippedOrders/original.actualOrders);
   assert.equal(board.axes[1].value,original.shippedOrders/12);
   assert.equal(board.axes[1].status,'unknown');
   assert.match(board.axes[1].threshold,/horas-persona/);
   assert.equal(board.axes[2].value,original.incrementalExpenseCLP);
   assert.equal(board.axes[3].value,original.pendingOrders);
   assert.equal(board.originalContext.waitingReceivingSkuUnits,base.receiving.totals.waitingAtCutoffSkuUnits);
   assert.equal(board.originalContext.heldQualitySkuUnits,base.quality.totals.heldAtCutoffSkuUnits);
   assert.equal(board.originalContext.originalPurchaseCommitmentCLP,base.committedPurchaseCLP);
   assert.ok(board.axes.every(a=>a.formula&&a.threshold&&a.explanation&&a.source));
   assert.ok(Object.isFrozen(board)&&Object.isFrozen(board.axes)&&Object.isFrozen(board.coach.wins));
   assert.equal(board.coach.questions.length,3);
  }
 }
});
test('I2-31: combined confirmation reads same physically conserved baseline and no fake labor productivity',()=>{
 for(const seed of SEEDS){
  const state=revealed(seed,{...I2_DEFAULT_ADVANCED,reservePercent:25});
  const actions=i2NormalizeMultiRecovery({
   urgentPurchase:{enabled:true,arrivalDay:2,coveragePercent:75},
   reserveTransfer:{enabled:true,releaseDay:2},
   capacityBoost:{enabled:true}
  });
  const confirmed=i2ConfirmMultiRecovery(state,actions);
  const outcome=i2ConfirmedMultiOutcome(navigateI2GameState(confirmed,'finish'));
  const board=make(state,outcome.scorecard,gameResult(state,'wait'),'multi');
  assert.equal(board.mode,'multi');
  assert.equal(board.headline.dispatchedOrders,outcome.reading.dispatchedOrders);
  assert.equal(board.axes[2].value,outcome.reading.incrementalExpenseCLP);
  assert.equal(board.axes[1].status,'unknown');
  assert.equal(board.axes[3].value,outcome.reading.pendingOrders);
  assert.equal(board.axes[0].source.includes('i2SafeScorecard'),true);
 }
});
test('I2-31: transparent didactic thresholds and no global praise with critical service or expense',()=>{
 const state=revealed('alpha-case-04',{...I2_DEFAULT_ADVANCED,stockProfile:'low'});
 const base=gameResult(state,'wait');
 const score=i2SafeScorecard(gameResult(state,'combined'));
 const board=make(state,score,base,'classic',{goal:'service',incrementalBudgetCLP:0});
 assert.equal(board.axes[0].status,board.axes[0].status);
 assert.match(board.axes[3].threshold,/10 %/);
 assert.equal(board.axes[2].status,score.incrementalExpense.value>0?'red':'green');
 if(board.axes.some(a=>a.status==='red'))
  assert.match(board.coach.verdict,/No hay éxito global/);
 assert.match(board.coach.tradeoff,/servicio/);
 assert.match(board.limits,/productividad/);
 assert.match(board.coach.questions[2],/dotación/);
 assert.ok(board.axes.every(a=>!String(a.formula).includes('EBITDA')));
});
test('I2-31: reject unrevealed, wrong baseline, unit tampering and false economy',()=>{
 const before=newI2GameState();
 const s=revealed(),base=gameResult(s,'wait');
 const score=i2SafeScorecard(base);
 assert.throws(()=>make(before,score,base),/I2-26|I2-27|I2-31/);
 assert.throws(()=>make(s,score,gameResult(s,'combined')),/I2-27/);
 assert.throws(()=>make(s,{...score,customerDeliveredOrders:4},base),/I2-31/);
 assert.throws(()=>make(s,{...score,totalCostCLP:0},base),/I2-31/);
 assert.throws(()=>make(s,{...score,shippedOrders:{...score.shippedOrders,value:10}},base),/I2-14|I2-31/);
 assert.throws(()=>make(s,score,base,'profit'),/I2-31/);
});
