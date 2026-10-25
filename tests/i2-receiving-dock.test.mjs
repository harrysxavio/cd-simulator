import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2ReceivingCapacityPreview,i2ReceivingOutcomeReading} from '../src/i2-receiving-dock.js';
import {i2MvpPhysicalResult,i2DefaultChoices} from '../src/i2-mvp-adapter.js';
import {eventSimulation} from '../src/events.js';

function receivingState(receiving,seed='alpha-case-01'){
 let state=newI2GameState({seed});
 state={...state,choices:{...state.choices,receiving}};
 state=navigateI2GameState(state,'start');
 for(let i=0;i<3;i++)state=navigateI2GameState(state,'forward');
 return state;
}
test('I2-21: capacidad elegida pre-reveal nunca calcula demanda sorpresa ni cola observada',()=>{
 const values=[];
 for(const choice of ['low','normal','extra']){
  const s=receivingState(choice);
  const before=JSON.stringify(s);
  const p=i2ReceivingCapacityPreview(s);
  assert.equal(p.phase,'pre-reveal');
  assert.equal(p.choice,choice);
  assert.equal(p.scope,'sku-cohort');
  assert.equal(p.nominalReferenceCapacity,650);
  assert.ok(Number.isSafeInteger(p.modeledDailySkuCapacity));
  assert.equal(Object.isFrozen(p),true);
  assert.deepEqual(p,i2ReceivingCapacityPreview(receivingState(choice,'alpha-case-04')),
   'una demanda sorpresa oculta jamás modifica la lectura previa');
  assert.equal(JSON.stringify(s),before);
  assert.doesNotMatch(JSON.stringify(p),
   /actualOrders|shockPercent|shippedOrders|receivedSkuUnits|endDockQueueSkuUnits|280 pedidos/);
  values.push(p.modeledDailySkuCapacity);
 }
 assert.ok(values[0]<values[1]&&values[1]<values[2]);
 assert.throws(()=>i2ReceivingCapacityPreview(newI2GameState()),/I2-21/);
 assert.throws(()=>i2ReceivingCapacityPreview({...receivingState('normal'),reveal:true}),/I2-21/);
 assert.throws(()=>i2ReceivingCapacityPreview({...receivingState('normal'),confirmedAreas:['commercial']}),/I2-21/);
});

test('I2-21: volver desde Calidad mantiene disponible Recepción ya confirmada',()=>{
 const opened=receivingState('normal');
 const confirmed=navigateI2GameState(opened,'forward');
 const again=navigateI2GameState(confirmed,'back');
 assert.equal(again.phase,'area');
 assert.equal(again.index,3);
 assert.ok(again.confirmedAreas.includes('receiving'));
 const preview=i2ReceivingCapacityPreview(again);
 assert.equal(preview.choice,'normal');
 assert.deepEqual(preview,i2ReceivingCapacityPreview(opened));
});

test('I2-21: 5 semillas × 3 turnos usan únicamente eventos físicos del escenario original',()=>{
 for(const seed of ['alpha-case-01','alpha-case-02','alpha-case-03','alpha-case-04','alpha-case-05'])
 for(const receiving of ['low','normal','extra']){
  const input={seed,choices:{...i2DefaultChoices(),receiving}};
  const baseline=i2MvpPhysicalResult({...input,option:'wait'});
  const urgent=i2MvpPhysicalResult({...input,option:'emergency',urgentArrivalDay:1});
  const view=baseline.receiving;
  assert.deepEqual(urgent.receiving,view,
   'la compra extraordinaria no reescribe muelle ni recepción originales');
  assert.equal(view.phase,'post-reveal');
  assert.equal(view.scope,'sku-cohort');
  assert.equal(view.rows.length,13,'día 0 y días 1..12');
  assert.equal(view.totals.arrivedSkuUnits,
   view.totals.receivedSkuUnits+view.totals.waitingAtCutoffSkuUnits);
  assert.equal(view.totals.receivedSkuUnits,baseline.purchasing.totals.warehouseReceivedSkuUnits);
  assert.equal(view.totals.arrivedSkuUnits,baseline.purchasing.totals.arrivedByCutoffSkuUnits);
  assert.equal(view.totals.waitingAtCutoffSkuUnits,baseline.purchasing.totals.waitingWarehouseSkuUnits);
  assert.equal(view.totals.receivedSkuUnits,view.rows.reduce((sum,r)=>sum+r.receivedSkuUnits,0));
  assert.equal(view.totals.arrivedSkuUnits,view.rows.reduce((sum,r)=>sum+r.arrivedSkuUnits,0));
  assert.equal(view.totals.waitingAtCutoffSkuUnits,view.rows.at(-1).endDockQueueSkuUnits);
  assert.equal(view.bySku.reduce((n,s)=>n+s.received,0),view.totals.receivedSkuUnits);
  assert.equal(Object.isFrozen(view),true);
  assert.equal(Object.isFrozen(view.rows),true);
  let waiting=0;
  for(const row of view.rows){
   assert.equal(waiting+row.arrivedSkuUnits,
    row.receivedSkuUnits+row.endDockQueueSkuUnits,
    'conservación diaria de SKU en el muelle');
   assert.ok(row.receivedSkuUnits<=view.capacitySkuUnitsPerDay);
   waiting=row.endDockQueueSkuUnits;
  }
 }
});

test('I2-21: capacidad CERO conserva FIFO en muelle y NO crea ningún recibo',()=>{
 const replay=eventSimulation({orders:240,days:12,receivingUnitCapacity:0});
 const view=i2ReceivingOutcomeReading({base:replay});
 assert.equal(view.capacitySkuUnitsPerDay,0);
 assert.equal(view.totals.receivedSkuUnits,0);
 assert.ok(view.totals.arrivedSkuUnits>0);
 assert.equal(view.totals.waitingAtCutoffSkuUnits,view.totals.arrivedSkuUnits);
 assert.ok(view.totals.peakDockQueueSkuUnits>0);
 assert.ok(view.totals.queueSkuDays>0);
 assert.ok(view.totals.maxWaitingDays>0);
 assert.ok(replay.ledger.every(d=>d.receivingUsedSkuUnits===0&&d.receiptEvents.length===0));
 assert.ok(replay.ledger.every(d=>Object.values(d.received).every(q=>q===0)));
 const normal=eventSimulation({orders:240,days:12,receivingUnitCapacity:650});
 const positive=i2ReceivingOutcomeReading({base:normal});
 assert.ok(positive.totals.receivedSkuUnits>0);
 assert.ok(positive.totals.waitingAtCutoffSkuUnits<=view.totals.waitingAtCutoffSkuUnits);
});

test('I2-21: diario adulterado se rechaza, no se crean recibos desde la vista',()=>{
 const replay=eventSimulation({orders:240,days:12,receivingUnitCapacity:0});
 assert.throws(()=>i2ReceivingOutcomeReading(null),/I2-21/);
 const broken=structuredClone(replay);
 broken.ledger[2].waitingReceiving++;
 assert.throws(()=>i2ReceivingOutcomeReading({base:broken}),/I2-21/);
 const badCap=structuredClone(replay);
 badCap.ledger[2].receivingCapacitySkuUnits=999;
 assert.throws(()=>i2ReceivingOutcomeReading({base:badCap}),/I2-21/);
});
