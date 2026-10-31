import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {createRecoveryBaseline} from '../src/recovery-baseline.js';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2CompareMultiRecovery} from '../src/i2-multi-recovery.js';

const inputs={policy:'service',plannedOrders:200,actualOrders:260,days:12};
const none={urgentPurchase:{enabled:false,arrivalDay:2,coveragePercent:100},
 reserveTransfer:{enabled:false,releaseDay:2},capacityBoost:{enabled:false}};
const boost={...none,capacityBoost:{enabled:true}};

/** Construye una campaña válida sin mostrar shocks antes de confirmar las áreas. */
function readyGame(){
 let state=newI2GameState({seed:'alpha-case-04'});
 state=navigateI2GameState(state,'start');
 for(let n=0;n<8;n++)state=navigateI2GameState(state,'forward');
 return navigateI2GameState(state,'reveal');
}

test('I2-35.5b: incident belongs to actual replay, not original purchase plan',()=>{
 const unperturbed=recoveryComparison({...inputs,option:'wait'});
 const first=unperturbed.base.ledger.find(d=>d.receiptEvents.length>0);
 assert.ok(first);
 const event={id:'EVT-DOCK-RECOVERY',kind:'receiving-stop',
  startDay:first.day,durationDays:1};
 const affected=recoveryComparison({...inputs,option:'wait',operationalEvents:[event]});
 assert.deepEqual(affected.originalPurchaseOrders,unperturbed.originalPurchaseOrders);
 assert.deepEqual(affected.integrated.planned,unperturbed.integrated.planned);
 assert.deepEqual(affected.base.operationalEvents,[event]);
 assert.equal(affected.base.ledger[first.day].receivingUsedSkuUnits,0);
 assert.ok(affected.base.ledger[first.day].waitingReceiving>first.waitingReceiving);
 assert.notEqual(affected.baselineKey,unperturbed.baselineKey);
 assert.equal(affected.recovered,affected.base);
 assert.equal(affected.incrementalExpense,0);
 assert.deepEqual(recoveryComparison({...inputs,option:'wait',
  operationalEvents:[event]}).base,affected.base);
});

test('I2-35.5b: every strategy must face same incident; baseline mismatch rejected',()=>{
 const without=recoveryComparison({...inputs,option:'wait'});
 const first=without.base.ledger.find(d=>d.receiptEvents.length>0);
 const e={id:'EVT-QUALITY-RECOVERY',kind:'quality-stop',
  startDay:first.day,durationDays:1};
 const calendar=[e];
 const baseline=createRecoveryBaseline({...inputs,operationalEvents:calendar});
 for(const option of ['wait','overtime','emergency','combined']){
  const comparison=recoveryComparison({...inputs,operationalEvents:calendar,
   baselineSnapshot:baseline,option,urgentArrivalDay:2});
  assert.equal(comparison.baselineSnapshot,baseline);
  assert.equal(comparison.base,baseline.integrated.actual);
  assert.deepEqual(comparison.recovered.operationalEvents,calendar);
  assert.equal(comparison.recovered.ledger[e.startDay].qualityStopped,true);
  assert.equal(comparison.recovered.orders,comparison.base.orders);
  assert.deepEqual(comparison.originalPurchaseOrders,baseline.integrated.originalPurchaseOrders);
  assert.ok(comparison.recovered.completed+comparison.recovered.pending===inputs.actualOrders);
 }
 assert.throws(()=>recoveryComparison({...inputs,option:'wait',
  baselineSnapshot:baseline,operationalEvents:[]}),/incompatible|congelado/);
});

test('I2-35.5b: I2 multi-actions share one physical incident and PO manifest',()=>{
 const calendar=[{id:'EVT-MULTI-QUALITY',kind:'quality-stop',startDay:2,durationDays:1}];
 const s=readyGame();
 const output=i2CompareMultiRecovery({state:s,plans:[none,boost],operationalEvents:calendar});
 assert.deepEqual(output.baseline.integrated.actual.operationalEvents,calendar);
 assert.equal(output.results[0].comparison,output.baselineComparison);
 for(const x of output.results){
  assert.equal(x.comparison.baselineSnapshot,output.baseline);
  assert.deepEqual(x.comparison.recovered.operationalEvents,calendar);
  assert.equal(x.comparison.recovered.ledger[2].qualityStopped,true);
  assert.deepEqual(x.comparison.originalPurchaseOrders,
   output.baselineComparison.originalPurchaseOrders);
  assert.equal(x.reading.actualOrders,x.reading.dispatchedOrders+x.reading.pendingOrders);
 }
 // Las partidas anteriores conservan la referencia preexistente cuando no hay eventos.
 const legacy=i2CompareMultiRecovery({state:s,plans:[none]});
 assert.notEqual(legacy.baselineKey,output.baselineKey);
 assert.equal(legacy.baseline.seed.operationalEvents,undefined);
});
