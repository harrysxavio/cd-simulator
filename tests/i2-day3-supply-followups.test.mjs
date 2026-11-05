import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState,normalizeI2GameState,saveI2GameState,loadI2GameState} from '../src/i2-game-state.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2ConfirmIncidentResponse,i2ConfirmNextIncidentResponse} from '../src/i2-incident-response.js';
import {i2ConfirmDay3ReceivingFollowup} from '../src/i2-day3-receiving-followup.js';
import {i2CompareMultiRecovery} from '../src/i2-multi-recovery.js';
import {i2DailyOperationsSnapshot} from '../src/i2-daily-operations.js';
import {i2DatedOrdersForObservedDay} from '../src/i2-dated-operational-orders.js';
import {i2Day3SupplyAvailability,i2Day3SupplyQuote,
 i2ConfirmDay3SupplyFollowup} from '../src/i2-day3-supply-followups.js';

/** Partida con demanda ya revelada y día 3 físicamente observado. */
function atDay3({seed='ops-dock-01',kind='wait',reservePercent=0,stockProfile='standard'}={}){
 let s=newI2GameState({
  seed:'alpha-case-04',eventSeed:seed,
  advanced:{...I2_DEFAULT_ADVANCED,reservePercent,stockProfile}
 });
 s=navigateI2GameState(s,'start');
 for(let i=0;i<8;i++)s=navigateI2GameState(s,'forward');
 s=navigateI2GameState(s,'reveal');
 s=i2ConfirmIncidentResponse(s,kind);
 return normalizeI2GameState({
  ...s,incidentViewDay:3,
  ...(seed==='ops-combined-01'?{incidentStep:1}:{})
 });
}
const replay=s=>i2CompareMultiRecovery({
 state:s,plans:[s.recoveryConfirmation.actions]
});

test('I2-35.8b: compra tardía día 3→4 usa faltante SKU real y no altera ayer',()=>{
 const old=atDay3(),status=i2Day3SupplyAvailability(old);
 assert.deepEqual(status,{buy:true,reserve:false});
 const quote=i2Day3SupplyQuote(old,'buy');
 assert.equal(quote.issuedDay,3);
 assert.equal(quote.effectiveDay,4);
 assert.ok(quote.committedSkuUnits>0);
 assert.ok(quote.incrementalPurchaseCLP>0);
 assert.equal(quote.incrementalPurchaseCLP,
  quote.principalCLP+quote.surchargeCLP);
 assert.ok(!Object.hasOwn(quote,'futureShippedOrders'));
 const before=JSON.stringify(old),physicalBefore=replay(old);
 const dayBefore=i2DailyOperationsSnapshot(old);
 const updated=i2ConfirmDay3SupplyFollowup(old,'buy');
 assert.equal(JSON.stringify(old),before);
 assert.deepEqual(i2DailyOperationsSnapshot(updated),dayBefore);
 assert.equal(updated.purchaseFollowupIssuedDay,3);
 assert.deepEqual(i2Day3SupplyAvailability(updated),{buy:false,reserve:false});
 const physicalAfter=replay(updated);
 assert.deepEqual(physicalAfter.results[0].comparison.recovered.ledger.slice(0,4),
  physicalBefore.results[0].comparison.recovered.ledger.slice(0,4));
 assert.deepEqual(physicalAfter.results[0].comparison.originalPurchaseOrders,
  physicalBefore.results[0].comparison.originalPurchaseOrders);
 assert.equal(physicalAfter.baselineKey,physicalBefore.baselineKey);
 assert.equal(physicalAfter.results[0].reading.incrementalExpenseCLP,
  quote.incrementalPurchaseCLP);
 assert.ok(physicalAfter.results[0].comparison.recovered.ledger[4].dockArrivals.some(x=>x.urgent));
 const [order]=i2DatedOrdersForObservedDay(updated).orders;
 assert.equal(order.areaId,'purchasing');
 assert.deepEqual([order.issuedDay,order.effectiveDay],[3,4]);
 assert.equal(order.status,'programada');
});

test('I2-35.8b: reserva solo existe si fue separada al principio, sin compra adicional',()=>{
 const noReserve=atDay3();
 assert.equal(i2Day3SupplyAvailability(noReserve).reserve,false);
 assert.throws(()=>i2ConfirmDay3SupplyFollowup(noReserve,'reserve'),/I2-35.8b/);
 const initial=atDay3({reservePercent:25});
 assert.deepEqual(i2Day3SupplyAvailability(initial),{buy:true,reserve:true});
 const quote=i2Day3SupplyQuote(initial,'reserve');
 assert.ok(quote.existingReserveSkuUnits>0);
 assert.equal(quote.additionalPurchaseCLP,0);
 const before=replay(initial),next=i2ConfirmDay3SupplyFollowup(initial,'reserve');
 assert.equal(next.reserveFollowupIssuedDay,3);
 const after=replay(next);
 assert.deepEqual(after.results[0].comparison.recovered.ledger.slice(0,4),
  before.results[0].comparison.recovered.ledger.slice(0,4));
 assert.deepEqual(after.results[0].comparison.originalPurchaseOrders,
  before.results[0].comparison.originalPurchaseOrders);
 assert.equal(after.results[0].reading.orderedUrgentSkuUnits,0);
 assert.ok(after.results[0].comparison.recovered.ledger[4].reserveEvents.length>0);
 assert.deepEqual(i2Day3SupplyAvailability(next),{buy:true,reserve:false});
 const [order]=i2DatedOrdersForObservedDay(next).orders;
 assert.equal(order.areaId,'inventory');
 assert.equal(order.issuedDay,3);
 assert.equal(order.effectiveDay,4);
 assert.ok(Object.isFrozen(next));
});

test('I2-35.8b: compras, reserva y turno de muelle se combinan sin duplicar SKU/CLP',()=>{
 const s=atDay3({reservePercent:25});
 const afterDock=i2ConfirmDay3ReceivingFollowup(s);
 const afterBuy=i2ConfirmDay3SupplyFollowup(afterDock,'buy');
 const afterReserve=i2ConfirmDay3SupplyFollowup(afterBuy,'reserve');
 assert.deepEqual(i2Day3SupplyAvailability(afterReserve),{buy:false,reserve:false});
 assert.equal(afterReserve.receivingFollowupIssuedDay,3);
 assert.equal(afterReserve.purchaseFollowupIssuedDay,3);
 assert.equal(afterReserve.reserveFollowupIssuedDay,3);
 const compare=replay(afterReserve).results[0];
 assert.equal(compare.reading.receivingShiftCostCLP,55000);
 assert.ok(compare.reading.urgentPurchaseValueCLP>0);
 assert.ok(compare.comparison.recovered.ledger[4].reserveEvents.length>0);
 assert.equal(compare.comparison.recovered.ledger[4].receivingShiftCostCLP,55000);
 assert.deepEqual(i2DatedOrdersForObservedDay(afterReserve).orders.map(x=>x.areaId),
  ['purchasing','inventory','receiving']);
 assert.throws(()=>i2ConfirmDay3SupplyFollowup(afterReserve,'buy'),/I2-35.8b/);
 assert.throws(()=>i2ConfirmDay3SupplyFollowup(afterReserve,'reserve'),/I2-35.8b/);
 const store=new Map(),storage={
  setItem:(key,value)=>store.set(key,value),
  getItem:key=>store.get(key)??null
 };
 saveI2GameState(storage,afterReserve);
 assert.deepEqual(loadI2GameState(storage),afterReserve);
});

test('I2-35.8b: segundo incidente respeta órdenes previas, no inventa acciones',()=>{
 let state=i2ConfirmDay3SupplyFollowup(
  atDay3({seed:'ops-combined-01',reservePercent:25}),'buy');
 state=i2ConfirmDay3SupplyFollowup(state,'reserve');
 state=navigateI2GameState(state,'advance-incident-day');
 assert.equal(state.incidentViewDay,undefined);
 const second=i2ConfirmNextIncidentResponse(state,'quality-bridge');
 assert.equal(second.purchaseFollowupIssuedDay,3);
 assert.equal(second.reserveFollowupIssuedDay,3);
 assert.equal(second.recoveryConfirmation.actions.urgentPurchase.arrivalDay,4);
 assert.equal(second.recoveryConfirmation.actions.reserveTransfer.releaseDay,4);
 const read=normalizeI2GameState({...second,incidentViewDay:5});
 const orders=i2DatedOrdersForObservedDay(read);
 assert.deepEqual(orders.orders.map(x=>x.areaId),
  ['purchasing','inventory','quality']);
 assert.deepEqual(orders.orders.map(x=>x.issuedDay),[3,3,4]);
 assert.ok(i2DailyOperationsSnapshot(read).qualityBridgeCostCLP>0);
});

test('I2-35.8b: marcador falsificado, día incorrecto y pedido duplicado se rechazan',()=>{
 const s=atDay3({reservePercent:25});
 assert.throws(()=>i2Day3SupplyQuote(s,'invalid'),/I2-35.8b/);
 const b=i2ConfirmDay3SupplyFollowup(s,'buy');
 assert.equal(normalizeI2GameState({...b,purchaseFollowupIssuedDay:2}),null);
 assert.equal(normalizeI2GameState({...b,purchaseFollowupIssuedDay:4}),null);
 const without={...b};delete without.purchaseFollowupIssuedDay;
 assert.ok(normalizeI2GameState(without),'Compatibilidad: sin marcador es un save antiguo válido');
 const later=navigateI2GameState(b,'advance-incident-day');
 assert.throws(()=>i2ConfirmDay3SupplyFollowup(later,'reserve'),/I2-35.8b/);
 const early={...s};delete early.incidentViewDay;
 assert.deepEqual(i2Day3SupplyAvailability(early),{buy:false,reserve:false});
 assert.equal(i2ConfirmDay3SupplyFollowup.length,2);
});

test('I2-35.8b: ofertas solo si hay unidades físicas que comprar o mover',()=>{
 for(const stockProfile of ['low','standard','high']){
  for(const reservePercent of [0,25]){
   const state=atDay3({stockProfile,reservePercent});
   const possible=i2Day3SupplyAvailability(state);
   if(possible.buy){
    const quote=i2Day3SupplyQuote(state,'buy');
    assert.ok(quote.committedSkuUnits>0,'No se permite compra de cero SKU');
    assert.ok(quote.incrementalPurchaseCLP>0);
   }else assert.throws(()=>i2Day3SupplyQuote(state,'buy'),/I2-35.8b/);
   if(possible.reserve){
    const quote=i2Day3SupplyQuote(state,'reserve');
    assert.ok(quote.existingReserveSkuUnits>0,'No se mueve reserva inexistente');
   }else assert.throws(()=>i2Day3SupplyQuote(state,'reserve'),/I2-35.8b/);
  }
 }
});
