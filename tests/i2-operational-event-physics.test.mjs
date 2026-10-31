import test from 'node:test';
import assert from 'node:assert/strict';
import {eventSimulation} from '../src/events.js';
import {
 I2_OPERATIONAL_EVENT_SEEDS,i2OperationalEventSealed,
 i2OperationalEventsForSeed,normalizeOperationalEvents
} from '../src/operational-event-schedule.js';

const sim=events=>eventSimulation({policy:'service',orders:240,days:12,
 qualityReleasePercent:100,operationalEvents:events});
const sum=(rows,key)=>rows.reduce((total,row)=>total+row[key],0);

/** Las fechas de evento son una entrada externa; ni la demanda ni el plan las cambian. */
test('I2-35.5a: operational event seeds independent of demand and immutable',()=>{
 assert.deepEqual(I2_OPERATIONAL_EVENT_SEEDS,
  ['ops-dock-01','ops-quality-01','ops-combined-01']);
 const a=i2OperationalEventsForSeed('ops-dock-01');
 assert.deepEqual(a,[{id:'EVT-DOCK-01',kind:'receiving-stop',startDay:2,durationDays:1}]);
 assert.strictEqual(i2OperationalEventSealed('ops-dock-01').sealed,true);
 assert.equal(JSON.stringify(i2OperationalEventSealed('ops-dock-01')).includes('startDay'),false);
 assert.deepEqual(i2OperationalEventsForSeed('ops-dock-01'),a);
 assert.ok(Object.isFrozen(a)&&Object.isFrozen(a[0]));
 assert.equal(i2OperationalEventsForSeed('ops-combined-01').length,2);
 assert.throws(()=>i2OperationalEventsForSeed('ops-unknown'),/semilla operacional/);
});

test('I2-35.5a: reject fraudulent event payloads, overlap, and future shifts',()=>{
 const event={id:'EVT-A',kind:'quality-stop',startDay:3,durationDays:2};
 const cases=[
  [{...event,discountCLP:10}],
  [{...event,kind:'theft'}],
  [{...event,durationDays:0}],
  [{...event,startDay:12,durationDays:2}],
  [event,event],
  [event,{id:'EVT-B',kind:'quality-stop',startDay:4,durationDays:1}],
  [{...event,id:'event with spaces'}]
 ];
 for(const c of cases)assert.throws(()=>normalizeOperationalEvents(c,12),/I2-35.5a/);
 assert.deepEqual(normalizeOperationalEvents([],12),[]);
 assert.equal(sim([]).operationalEvents.length,0);
});

test('I2-35.5a: dock shutdown stops receipts physically and conserves FIFO stock',()=>{
 const baseline=sim([]);
 const arrival=baseline.ledger.find(d=>d.dockArrivals.some(a=>a.qty>0));
 assert.ok(arrival,'El caso debe tener un lote de proveedor dentro del horizonte');
 const event={id:'EVT-DOCK-TEST',kind:'receiving-stop',
  startDay:arrival.day,durationDays:1};
 const altered=sim([event]);
 assert.equal(altered.orders,baseline.orders);
 assert.deepEqual(altered.deliveries,baseline.deliveries);
 assert.deepEqual(altered.ledger[arrival.day].dockArrivals,arrival.dockArrivals);
 assert.equal(altered.ledger[arrival.day].receivingUsedSkuUnits,0);
 assert.equal(altered.ledger[arrival.day].receivingStopped,true);
 assert.ok(altered.ledger[arrival.day].waitingReceiving>arrival.waitingReceiving);
 assert.deepEqual(sim([event]),altered,'Mismo incidente + cohorte = mismo ledger');
 // Llegadas al muelle siguen siendo unidades físicas, no se pierden en el corte.
 for(const day of altered.ledger.slice(0,arrival.day+1)){
  const arrived=altered.ledger.slice(0,day.day+1)
   .reduce((n,x)=>n+sum(x.dockArrivals,'qty'),0);
  const received=altered.ledger.slice(0,day.day+1)
   .reduce((n,x)=>n+sum(x.receiptEvents,'qty'),0);
  assert.equal(arrived-received,day.waitingReceiving);
 }
});

test('I2-35.5a: quality halt retains actual lots without inventing write-offs',()=>{
 const baseline=sim([]);
 const arrival=baseline.ledger.find(d=>d.dockArrivals.some(a=>a.qty>0));
 assert.ok(arrival);
 const event={id:'EVT-QUALITY-TEST',kind:'quality-stop',
  startDay:arrival.day,durationDays:1};
 const halted=sim([event]);
 const d=halted.ledger[arrival.day];
 assert.equal(d.qualityStopped,true);
 assert.equal(d.releaseEvents.length,0);
 assert.deepEqual(d.receiptEvents,arrival.receiptEvents);
 assert.ok(d.waitingQuality>arrival.waitingQuality);
 assert.deepEqual(halted.deliveries,baseline.deliveries);
 for(const day of halted.ledger.slice(0,arrival.day+1)){
  const receipts=halted.ledger.slice(0,day.day+1)
   .reduce((n,x)=>n+sum(x.receiptEvents,'qty'),0);
  const released=halted.ledger.slice(0,day.day+1)
   .reduce((n,x)=>n+sum(x.releaseEvents,'qty'),0);
  assert.equal(receipts-released,day.waitingQuality);
 }
});
