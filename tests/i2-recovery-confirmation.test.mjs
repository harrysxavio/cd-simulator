import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState,normalizeI2GameState,saveI2GameState,loadI2GameState,
 I2_GAME_STORAGE_KEY} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2NormalizeMultiRecovery} from '../src/i2-multi-recovery.js';
import {i2ConfirmMultiRecovery,i2ConfirmedMultiOutcome,i2ClearMultiRecovery} from '../src/i2-recovery-confirmation.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';
import {i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';
const act=({buy=false,day=2,coverage=100,reserve=false,release=2,boost=false}={})=>
 i2NormalizeMultiRecovery({
  urgentPurchase:{enabled:buy,arrivalDay:day,coveragePercent:coverage},
  reserveTransfer:{enabled:reserve,releaseDay:release},
  capacityBoost:{enabled:boost}
 });
function revealed(seed='alpha-case-04',advanced=I2_DEFAULT_ADVANCED){
 let s=newI2GameState({seed,advanced});s=navigateI2GameState(s,'start');
 for(let i=0;i<8;i++)s=navigateI2GameState(s,'forward');
 return navigateI2GameState(s,'reveal');
}
function db(){
 const values=new Map([['supply-lab-v90','isolated-v1']]);
 return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v))};
}
test('I2-30: 5 retos × 0/1/2/3 palancas confirman, persisten y reejecutan idéntico',()=>{
 for(const seed of ['alpha-case-01','alpha-case-02','alpha-case-03','alpha-case-04','alpha-case-05']){
  const base=revealed(seed,{...I2_DEFAULT_ADVANCED,reservePercent:25});
  const old=i2MvpPhysicalResult({choices:base.choices,seed,advanced:base.advanced,option:'wait'});
  const before=JSON.stringify(base);
  for(const a of [act(),act({buy:true}),act({buy:true,boost:true}),
    act({buy:true,boost:true,reserve:true})]){
   const saved=i2ConfirmMultiRecovery(base,a);
   assert.equal(JSON.stringify(base),before);
   assert.equal(saved.phase,'recover');
   assert.deepEqual(saved.recoveryConfirmation.actions,a);
   assert.equal(saved.recoveryConfirmation.seed,seed);
   assert.ok(Object.isFrozen(saved.recoveryConfirmation));
   const storage=db(),text=saveI2GameState(storage,saved);
   const raw=storage.getItem(I2_GAME_STORAGE_KEY);
   assert.doesNotMatch(raw,/ledger|shipments|urgentOrders|baselineShipped|incrementalExpenseCLP/);
   assert.equal(storage.getItem('supply-lab-v90'),'isolated-v1');
   assert.deepEqual(loadI2GameState(storage),text);
   const finished=navigateI2GameState(text,'finish');
   const scored=i2ConfirmedMultiOutcome(finished);
   assert.equal(scored.event.baselineKey,scored.baselineKey);
   assert.equal(scored.reading.baselineDispatchedOrders,old.baselineShipped);
   assert.equal(scored.scorecard.actualOrders.value,old.actualOrders);
   assert.equal(scored.scorecard.shippedOrders.value+scored.scorecard.pendingOrders.value,old.actualOrders);
   assert.equal(scored.scorecard.totalCostCLP,null);
   assert.equal(scored.scorecard.incrementalExpense.value,scored.reading.incrementalExpenseCLP);
   assert.deepEqual(i2ConfirmedMultiOutcome(loadI2GameState({
    getItem:k=>k===I2_GAME_STORAGE_KEY?JSON.stringify(finished):null
   })),scored);
   const back=navigateI2GameState(finished,'revise-recovery');
   assert.equal(back.phase,'recover');
   assert.deepEqual(back.recoveryConfirmation.actions,a);
   assert.deepEqual(i2ConfirmedMultiOutcome(back),scored);
   const cleared=i2ClearMultiRecovery(back);
   assert.equal(Object.hasOwn(cleared,'recoveryConfirmation'),false);
   assert.deepEqual(cleared.choices,base.choices);
   assert.deepEqual(cleared.advanced,base.advanced);
  }
 }
});
test('I2-30: plan de tres palancas, reserva real, rechazo antes de reveal, tarde no recupera',()=>{
 const state=revealed('alpha-case-04',{...I2_DEFAULT_ADVANCED,stockProfile:'low',reservePercent:25});
 const both=i2ConfirmMultiRecovery(state,act({buy:true,day:13,reserve:true,release:13,boost:false}));
 const reading=i2ConfirmedMultiOutcome(both).reading;
 assert.equal(reading.orderedUrgentSkuUnits>=0,true);
 assert.equal(reading.physicallyMovedReserveSkuUnits,0);
 assert.equal(reading.recoveredOrders,0);
 assert.ok(reading.incrementalExpenseCLP>=0);
 assert.throws(()=>i2ConfirmMultiRecovery(newI2GameState(),act({buy:true})),/I2-30/);
 assert.throws(()=>i2ConfirmMultiRecovery(navigateI2GameState(both,'finish'),act()),/I2-30/);
 assert.throws(()=>i2ConfirmMultiRecovery(revealed(),act({reserve:true})),/I2-28/);
});
test('I2-30: malformed records cannot unlock reveal, mutate seed, fake baseline or extra ledger',()=>{
 const base=revealed();
 const confirmed=i2ConfirmMultiRecovery(base,act({buy:true,boost:true}));
 const event=confirmed.recoveryConfirmation;
 for(const c of [
  {...event,seed:'alpha-case-05'},
  {...event,plannedOrders:1},
  {...event,observedOrders:-1},
  {...event,actions:{...event.actions,capacityBoost:{enabled:'true'}}},
  {...event,tracking:'ORDER-PRIVATE'},
  {...event,version:2}
 ])assert.equal(normalizeI2GameState({...confirmed,recoveryConfirmation:c}),null);
 assert.equal(normalizeI2GameState({...confirmed,reveal:false}),null);
 assert.equal(normalizeI2GameState({...confirmed,phase:'area'}),null);
 const forgery=normalizeI2GameState({...confirmed,recoveryConfirmation:{
  ...event,baselineKey:'forged-baseline'
 }});
 assert.ok(forgery,'record may pass structural validation; replay must still reject');
 assert.throws(()=>i2ConfirmedMultiOutcome(forgery),/I2-30/);
 const entered=navigateI2GameState(confirmed,'finish');
 const restarted=navigateI2GameState(entered,'restart');
 assert.equal(restarted.phase,'intro');
 assert.equal(Object.hasOwn(restarted,'recoveryConfirmation'),false);
 assert.equal(restarted.seed,base.seed);
});
test('I2-30: historical saves keep exact 5-choice behavior and do not gain phantom event',()=>{
 const base=revealed();
 const original={...base,recovery:'combined',arrivalDay:13,coverage:75};
 const storage=db();
 saveI2GameState(storage,original);
 assert.deepEqual(loadI2GameState(storage),original);
 assert.equal(Object.hasOwn(loadI2GameState(storage),'recoveryConfirmation'),false);
 const score=i2MvpPhysicalResult({
  choices:original.choices,seed:original.seed,advanced:original.advanced,
  option:original.recovery,urgentArrivalDay:original.arrivalDay,
  purchaseCoveragePercent:original.coverage
 });
 assert.ok(score.actualOrders>0);
});
