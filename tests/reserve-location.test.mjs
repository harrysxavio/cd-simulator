import test from 'node:test';
import assert from 'node:assert/strict';
import {SKU_CATALOG} from '../src/sku.js';
import {eventSimulation} from '../src/events.js';
import {recoveryComparison} from '../src/recovery.js';
import {skuProcurementReconciliation} from '../src/sku-procurement.js';
import {skuAudit} from '../src/audit.js';
import {campaignSnapshot} from '../src/campaign.js';
import {createSkuRecoveryDecision} from '../src/sku-decision.js';

const sum=v=>Object.values(v).reduce((a,b)=>a+b,0);
const opening={A:150,B:90,C:55},reserve={A:30,B:18,C:11};
const options={policy:'service',plannedOrders:200,actualOrders:280,plannedForecastPercent:80,planningCoveragePercent:70,days:12,reservePercent:20};

test('U2b: a CD reserve is a portion of existing stock, not extra inventory or purchase',()=>{
 const base=eventSimulation({orders:280,stock:opening,days:5,reserveStock:reserve});
 const moved=eventSimulation({orders:280,stock:opening,days:5,reserveStock:reserve,reserveReleaseDay:2});
 assert.deepEqual(base.initial,opening);
 assert.deepEqual(moved.initial,opening);
 assert.deepEqual(base.openingReserve,reserve);
 assert.deepEqual(base.endingReserveStock,reserve);
 assert.ok(moved.ledger.every(d=>d.day<2?sum(d.movedReserve)===0:true));
 assert.equal(sum(moved.ledger[2].movedReserve),59);
 assert.equal(sum(moved.endingReserveStock),0);
 assert.ok(moved.ledger[2].reserveEvents.every(e=>e.from==='RESERVA-CD'&&e.to==='PICK-FACE'&&e.verified));
 assert.ok(moved.completed>=base.completed);
 for(const replay of [base,moved])for(const p of SKU_CATALOG){
  const inbound=replay.ledger.reduce((n,d)=>n+d.received[p.id],0);
  assert.equal(replay.initial[p.id]+inbound,replay.consumed[p.id]+replay.heldQuality[p.id]+replay.endingStock[p.id]+replay.endingReserveStock[p.id]);
  assert.ok(replay.ledger.every(d=>d.reserveStock[p.id]>=0&&d.stock[p.id]>=0&&d.pickableStock[p.id]+d.unverifiedStock[p.id]===d.stock[p.id]));
 }
});
test('U2b: confirmed reserve transfer reuses canonical ledger and creates no urgent POs',()=>{
 const c=recoveryComparison({...options,option:'reserve',urgentArrivalDay:1});
 const wait=recoveryComparison({...options,option:'wait'});
 assert.deepEqual(c.originalPurchase,wait.originalPurchase);
 assert.deepEqual(c.recovered.initial,wait.recovered.initial);
 assert.deepEqual(c.reserveStock,{A:30,B:18,C:11});
 assert.ok(c.recovered.completed>=wait.recovered.completed);
 assert.equal(c.urgent.length,0);
 assert.equal(c.incrementalExpense,0);
 assert.equal(c.recovered.ledger.reduce((s,d)=>s+sum(d.movedReserve),0),59);
 const snapshot=campaignSnapshot({comparison:c,campaignId:'CD-RESERVE'});
 assert.equal(snapshot.passed,true,JSON.stringify(snapshot.checks));
 assert.equal(snapshot.reserveTransfers.length,3);
 assert.ok(snapshot.reserveTransfers.every(x=>x.day===1&&x.from==='RESERVA-CD'));
 assert.equal(snapshot.purchaseOrders.filter(x=>x.source==='urgent').length,0);
 assert.ok(snapshot.inventory.bySku.every(x=>x.opening+x.received===x.dispatched+x.held+x.available+x.reserved));
 const decision=createSkuRecoveryDecision({campaignId:'CD-RESERVE',skuInputs:{...options},option:'reserve',urgentArrivalDay:1,comparisonResult:c});
 assert.equal(decision.action,'release-on-site-reserve');
 assert.equal(decision.orderedExtraUnits,0);
 assert.equal(decision.receivedExtraUnits,0);
 assert.equal(decision.releasedReserveUnits,59);
 assert.equal(decision.firstReserveTransferDay,1);
 assert.equal(decision.urgentOrderCommitmentCLP,0);
 assert.equal(decision.reserveTransfers.length,3);
 assert.ok(Object.isFrozen(decision.reserveTransfers[0]));
 assert.equal(skuProcurementReconciliation(c).passed,true);
 const audit=skuAudit({...options,option:'reserve',urgentArrivalDay:1,comparisonResult:c});
 assert.equal(audit.passed,true,JSON.stringify(audit.checks));
 assert.equal(audit.stockValue.opening+audit.stockValue.received,audit.stockValue.shipped+audit.stockValue.held+audit.stockValue.closing+audit.stockValue.reserved);
});
test('U2b: a move arriving after day 12 cannot rescue orders; held reserve remains valuable',()=>{
 const r=recoveryComparison({...options,option:'reserve',urgentArrivalDay:13});
 const wait=recoveryComparison({...options,option:'wait',urgentArrivalDay:13});
 assert.equal(r.recovered.completed,wait.recovered.completed);
 assert.equal(r.recovered.pending,wait.recovered.pending);
 assert.equal(sum(r.recovered.endingReserveStock),59);
 assert.ok(r.recovered.ledger.every(d=>d.reserveEvents.length===0));
 assert.ok(campaignSnapshot({comparison:r}).passed);
});
test('U2b: invalid or excessive physical reserve is rejected, including impossible transfer days',()=>{
 for(const value of [-1,51,1.2,Infinity])assert.throws(()=>recoveryComparison({...options,reservePercent:value,option:'reserve'}),/Porcentaje de reserva/);
 for(const reserveStock of [{A:151},{A:-1},{A:1.1},{D:1},null])assert.throws(()=>eventSimulation({orders:100,reserveStock}),/reserva|Reserva/);
 assert.throws(()=>eventSimulation({orders:100,reserveStock:{A:1},reserveReleaseDay:0}),/Día de traslado/);
});
test('U2b: conserves value and whole orders under simultaneous Quality, Receiving and accuracy limits',()=>{
 for(const attrs of [
  {qualityReleasePercent:50},
  {receivingUnitCapacity:10},
  {inventoryAccuracyPercent:70},
  {pickingUnitCapacity:0},
  {transportUnitCapacity:0}
 ]){
  const c=recoveryComparison({...options,...attrs,option:'reserve',urgentArrivalDay:2});
  const audit=skuAudit({...options,...attrs,option:'reserve',urgentArrivalDay:2,comparisonResult:c});
  const snap=campaignSnapshot({comparison:c});
  assert.equal(snap.passed,true,JSON.stringify({attrs,checks:snap.checks}));
  assert.equal(audit.passed,true,JSON.stringify({attrs,checks:audit.checks}));
  assert.equal(c.recovered.completed+c.recovered.pending,280);
  assert.deepEqual(c.integrated.purchase,c.originalPurchase);
 }
});
