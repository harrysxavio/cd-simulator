import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2InventoryAccuracyPreview,i2InventoryPhysicalReading} from '../src/i2-inventory-physical.js';
import {i2MvpPhysicalResult,i2DefaultChoices} from '../src/i2-mvp-adapter.js';
import {eventSimulation} from '../src/events.js';

function inventoryState(option,seed='alpha-case-01'){
 let state=newI2GameState({seed});
 state={...state,choices:{...state.choices,inventory:option}};
 state=navigateI2GameState(state,'start');
 for(let i=0;i<5;i++)state=navigateI2GameState(state,'forward');
 return state;
}

test('I2-23: opciones 85/95/99 y regreso sin revelar stock futuro',()=>{
 for(const [option,percent] of [['weak',85],['normal',95],['count',99]]){
  const s=inventoryState(option),before=JSON.stringify(s);
  const preview=i2InventoryAccuracyPreview(s);
  assert.equal(preview.phase,'pre-reveal');
  assert.equal(preview.accuracyPercent,percent);
  assert.equal(preview.differencePoints,percent-95);
  assert.deepEqual(preview,i2InventoryAccuracyPreview(inventoryState(option,'alpha-case-05')));
  assert.equal(JSON.stringify(s),before);
  assert.equal(Object.isFrozen(preview),true);
  assert.doesNotMatch(JSON.stringify(preview),/actualOrders|shippedOrders|shockPercent|stockAvailable|heldQuality|280 pedidos/);
  const back=navigateI2GameState(navigateI2GameState(s,'forward'),'back');
  assert.equal(back.index,5);
  assert.equal(i2InventoryAccuracyPreview(back).accuracyPercent,percent);
 }
 assert.throws(()=>i2InventoryAccuracyPreview(newI2GameState()),/I2-23/);
 assert.throws(()=>i2InventoryAccuracyPreview({...inventoryState('normal'),reveal:true}),/I2-23/);
 assert.throws(()=>i2InventoryAccuracyPreview({...inventoryState('normal'),confirmedAreas:['commercial']}),/I2-23/);
});

test('I2-23: cinco shocks × tres políticas SKU, contabilidad física diaria y baseline inmóvil',()=>{
 for(const seed of ['alpha-case-01','alpha-case-02','alpha-case-03','alpha-case-04','alpha-case-05'])
 for(const inventory of ['weak','normal','count']){
  const choices={...i2DefaultChoices(),inventory};
  const unchanged=i2MvpPhysicalResult({seed,choices,option:'wait'});
  const emergency=i2MvpPhysicalResult({seed,choices,option:'emergency',urgentArrivalDay:1});
  const view=unchanged.inventory;
  assert.deepEqual(emergency.inventory,view,'La intervención no reescribe el libro original');
  assert.equal(view.phase,'post-reveal');
  assert.equal(view.rows.length,13);
  assert.equal(view.bySku.length,3);
  assert.equal(view.totals.heldQualitySkuUnits,unchanged.quality.totals.heldAtCutoffSkuUnits);
  assert.equal(view.totals.receivedSkuUnits,unchanged.receiving.totals.receivedSkuUnits);
  assert.equal(view.totals.physicallyOnSiteSkuUnits,
   view.totals.pickFaceSkuUnits+view.totals.reserveSkuUnits+
   view.totals.heldQualitySkuUnits+view.totals.stagingSkuUnits);
  assert.equal(view.totals.pickFaceSkuUnits,
   view.totals.verifiableSkuUnits+view.totals.notVerifiableSkuUnits);
  assert.equal(view.totals.openingSkuUnits+view.totals.receivedSkuUnits,
   view.totals.dispatchedSkuUnits+view.totals.physicallyOnSiteSkuUnits);
  assert.equal(view.totals.physicallyOnSiteSkuUnits,
   view.bySku.reduce((n,row)=>n+row.physicallyOnSiteSkuUnits,0));
  assert.ok(view.rows.every(row=>
   row.verifiableSkuUnits+row.notVerifiableSkuUnits===row.pickFaceSkuUnits));
  assert.equal(Object.isFrozen(view.rows),true);
  assert.equal(Object.isFrozen(view.bySku),true);
 }
});

test('I2-23: la exactitud cero NO descuenta el stock físico; 100% todo PICK-FACE es verificable',()=>{
 for(const [accuracy,verified] of [[0,false],[100,true]]){
  const x=i2InventoryPhysicalReading({base:eventSimulation({
   orders:240,days:12,inventoryAccuracyPercent:accuracy
  })});
  assert.ok(x.totals.pickFaceSkuUnits>0);
  assert.equal(x.totals.verifiableSkuUnits,verified?x.totals.pickFaceSkuUnits:0);
  assert.equal(x.totals.notVerifiableSkuUnits,verified?0:x.totals.pickFaceSkuUnits);
  assert.equal(x.totals.physicallyOnSiteSkuUnits,
   x.totals.openingSkuUnits+x.totals.receivedSkuUnits-x.totals.dispatchedSkuUnits);
 }
});

test('I2-23: RESERVA-CD → PICK-FACE es traslado, no compra ni generación de unidades',()=>{
 const opts={orders:200,days:12,stock:{A:80,B:60,C:40},reserveStock:{A:20,B:10},reserveReleaseDay:4,inventoryAccuracyPercent:95};
 const replay=eventSimulation(opts),audit=i2InventoryPhysicalReading({base:replay});
 assert.equal(replay.openingReserve.A,20);
 assert.equal(replay.openingReserve.B,10);
 assert.equal(audit.totals.movedFromReserveSkuUnits,30);
 assert.equal(audit.rows[3].reserveSkuUnits,30);
 assert.equal(audit.rows[4].reserveSkuUnits,0);
 assert.equal(audit.rows[4].movedFromReserveSkuUnits,30);
 assert.ok(audit.rows.every(day=>day.physicallyOnSiteSkuUnits>=day.reserveSkuUnits));
 assert.ok(audit.rows.every(day=>day.verifiableSkuUnits<=day.pickFaceSkuUnits));
});

test('I2-23: auditoría rechaza stock adulterado y traslados sin contrapartida',()=>{
 const initial=eventSimulation({orders:200,days:12,inventoryAccuracyPercent:85});
 assert.throws(()=>i2InventoryPhysicalReading(null),/I2-23/);
 const wrong=structuredClone(initial);
 wrong.ledger[0].stock.A++;
 assert.throws(()=>i2InventoryPhysicalReading({base:wrong}),/I2-23/);
 const wrongVerification=structuredClone(initial);
 wrongVerification.ledger[0].pickableStock.A++;
 assert.throws(()=>i2InventoryPhysicalReading({base:wrongVerification}),/I2-23/);
 const reserve=structuredClone(eventSimulation({
  orders:200,days:12,stock:{A:80,B:60,C:40},reserveStock:{A:20},reserveReleaseDay:4
 }));
 reserve.ledger[4].reserveEvents[0].qty++;
 assert.throws(()=>i2InventoryPhysicalReading({base:reserve}),/I2-23/);
});
