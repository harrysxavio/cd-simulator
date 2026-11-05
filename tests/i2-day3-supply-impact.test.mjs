import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState,normalizeI2GameState} from '../src/i2-game-state.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2ConfirmIncidentResponse,i2ConfirmNextIncidentResponse} from '../src/i2-incident-response.js';
import {i2ConfirmDay3SupplyFollowup,i2Day3SupplyQuote} from '../src/i2-day3-supply-followups.js';
import {i2ConfirmDay3ReceivingFollowup} from '../src/i2-day3-receiving-followup.js';
import {i2Day3SupplyImpactReading} from '../src/i2-day3-supply-impact.js';
import {i2CompareMultiRecovery,i2NormalizeMultiRecovery} from '../src/i2-multi-recovery.js';

function atDay3(seed='ops-dock-01'){
 let s=newI2GameState({seed:'alpha-case-04',eventSeed:seed,
  advanced:{...I2_DEFAULT_ADVANCED,reservePercent:25}});
 s=navigateI2GameState(s,'start');
 for(let i=0;i<8;i++)s=navigateI2GameState(s,'forward');
 s=navigateI2GameState(s,'reveal');
 s=i2ConfirmIncidentResponse(s,'wait');
 return normalizeI2GameState({
  ...s,incidentViewDay:3,
  ...(seed==='ops-combined-01'?{incidentStep:1}:{})
 });
}

test('I2-37.5a: una compra del día 3 aparece solo desde el día 4, con costo real',()=>{
 let state=atDay3();
 const quoted=i2Day3SupplyQuote(state,'buy');
 assert.equal(i2Day3SupplyImpactReading(state),null);
 state=i2ConfirmDay3SupplyFollowup(state,'buy');
 assert.equal(i2Day3SupplyImpactReading(state),null,'Nunca explicar un futuro sin observarlo');
 const day4=navigateI2GameState(state,'advance-incident-day');
 const before=JSON.stringify(day4),reading=i2Day3SupplyImpactReading(day4);
 assert.equal(JSON.stringify(day4),before);
 assert.equal(reading.day,4);
 assert.deepEqual(reading.modes,['purchasing']);
 assert.equal(reading.additionalCommittedCLP,quoted.incrementalPurchaseCLP);
 assert.equal(reading.additionalShippedToDate,
  reading.shippedToDate-reading.shippedWithoutToDate);
 assert.equal(reading.pendingDifference,reading.pendingOrders-reading.pendingWithout);
 assert.equal(reading.waitingReceivingDifference,
  reading.waitingReceivingSkuUnits-reading.waitingReceivingWithoutSkuUnits);
 assert.ok(reading.urgentSkuUnitsArrivedAtDockToDate>0);
 assert.equal(reading.movedReserveSkuUnitsToDate,0);
 assert.ok(Object.isFrozen(reading));
 assert.ok(!Object.hasOwn(reading,'futureIncidents'));
 assert.ok(!Object.hasOwn(reading,'finalShippedOrders'));
 assert.ok(!Object.hasOwn(reading,'tomorrowPending'));
});

test('I2-37.5a: traslado de reserva no se confunde con una compra ni cobra dinero',()=>{
 const state=i2ConfirmDay3SupplyFollowup(atDay3(),'reserve');
 const observed=navigateI2GameState(state,'advance-incident-day');
 const reading=i2Day3SupplyImpactReading(observed);
 assert.deepEqual(reading.modes,['inventory']);
 assert.equal(reading.additionalCommittedCLP,0);
 assert.ok(reading.movedReserveSkuUnitsToDate>0);
 assert.equal(reading.urgentSkuUnitsArrivedAtDockToDate,0);
 assert.equal(reading.day,4);
});

test('I2-37.5a: comparación conjunta respeta otras órdenes, muelle y POs originales',()=>{
 const start=i2ConfirmDay3ReceivingFollowup(atDay3());
 const buy=i2ConfirmDay3SupplyFollowup(start,'buy');
 const combined=i2ConfirmDay3SupplyFollowup(buy,'reserve');
 const observed=navigateI2GameState(combined,'advance-incident-day');
 const impact=i2Day3SupplyImpactReading(observed);
 const actual=observed.recoveryConfirmation.actions;
 const reduced=i2NormalizeMultiRecovery({
  urgentPurchase:{enabled:false,arrivalDay:2,coveragePercent:100},
  reserveTransfer:{enabled:false,releaseDay:2},
  capacityBoost:actual.capacityBoost
 });
 const simulated=i2CompareMultiRecovery({state:observed,plans:[actual,reduced]});
 const [withOrders,without]=simulated.results;
 assert.deepEqual(withOrders.comparison.originalPurchaseOrders,
  without.comparison.originalPurchaseOrders);
 assert.deepEqual(withOrders.comparison.recovered.ledger.slice(0,4),
  without.comparison.recovered.ledger.slice(0,4));
 assert.equal(impact.shippedToDate,
  withOrders.comparison.recovered.ledger[4].completed);
 assert.equal(impact.shippedWithoutToDate,
  without.comparison.recovered.ledger[4].completed);
 assert.equal(impact.additionalCommittedCLP,
  withOrders.reading.incrementalExpenseCLP-without.reading.incrementalExpenseCLP);
 assert.ok(impact.movedReserveSkuUnitsToDate>0);
 assert.ok(impact.urgentSkuUnitsArrivedAtDockToDate>0);
 assert.deepEqual(impact.modes,['purchasing','inventory']);
});

test('I2-37.5a: segundo incidente preserva fecha, sin filtrar su existencia en día 3',()=>{
 let state=atDay3('ops-combined-01');
 state=i2ConfirmDay3SupplyFollowup(state,'buy');
 state=i2ConfirmDay3SupplyFollowup(state,'reserve');
 assert.equal(i2Day3SupplyImpactReading(state),null);
 state=navigateI2GameState(state,'advance-incident-day');
 assert.equal(i2Day3SupplyImpactReading(state),null);
 const resolved=i2ConfirmNextIncidentResponse(state,'quality-bridge');
 const read=normalizeI2GameState({...resolved,incidentViewDay:5});
 const impact=i2Day3SupplyImpactReading(read);
 assert.equal(impact.day,5);
 assert.deepEqual(impact.modes,['purchasing','inventory']);
 assert.ok(impact.additionalCommittedCLP>0);
 assert.match(impact.note,/No acredita entrega/);
});

test('I2-37.5a: no aparece el panel en partidas sin nueva intervención',()=>{
 const state=atDay3();
 assert.equal(i2Day3SupplyImpactReading(navigateI2GameState(state,'advance-incident-day')),null);
 assert.throws(()=>i2Day3SupplyImpactReading({...state,phase:'error'}),/I2-37.5a/);
});
