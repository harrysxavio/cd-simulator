import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';
import {qualityLotReadModel} from '../src/quality-ledger.js';

const base={policy:'service',plannedOrders:200,actualOrders:280,plannedForecastPercent:80,planningCoveragePercent:70};
const build=(extra={})=>{
 const comparison=recoveryComparison({...base,...extra});
 const campaign=campaignSnapshot({comparison,campaignId:'M3-09',plannedOrders:200});
 const area=campaignAreaReadModel({comparison,campaign,campaignId:'M3-09',plannedOrders:200});
 return {comparison,campaign,area};
};
const sum=(list,fn)=>list.reduce((n,x)=>n+fn(x),0);

test('M3-09: the same received lots are held, released and balanced on every simulated day',()=>{
 const {comparison,campaign,area}=build({option:'combined',urgentArrivalDay:2,qualityReleasePercent:35,receivingUnitCapacity:65});
 const q=campaign.qualityLedger,t=q.totals;
 assert.equal(campaign.passed,true);
 assert.equal(area.passed,true);
 assert.equal(area.qualityLedger,q);
 assert.equal(area.checks.qualityReconciliation,true);
 assert.equal(q.releaseRatePercentPerDay,35);
 assert.equal(q.daily.length,comparison.recovered.days+1);
 assert.equal(t.receivedSkuUnits,sum(campaign.receipts,r=>r.qty));
 assert.equal(t.releasedSkuUnits,sum(campaign.qualityReleases,r=>r.qty));
 assert.equal(t.closingHeldSkuUnits,comparison.recovered.waitingQuality);
 assert.equal(t.receivedSkuUnits,t.releasedSkuUnits+t.closingHeldSkuUnits);
 assert.equal(t.receivedLots,campaign.receipts.length);
 assert.equal(t.receivedLots,t.lotsFullyReleased+t.lotsStillHeld);
 assert.equal(t.rejectedSkuUnits,0);
 assert.ok(q.daily.every(d=>d.receivedSkuUnits>=0&&d.releasedSkuUnits>=0&&d.heldSkuUnits>=0));
 assert.ok(q.daily.every(d=>d.heldSkuUnits===sum(Object.values(d.heldBySku),x=>x)));
 assert.ok(q.daily.some(d=>d.heldSkuUnits>0));
 assert.equal(area.stages[4].id,'quality');
 assert.equal(area.stages[4].output,t.releasedSkuUnits);
 assert.equal(area.stages[4].input,t.receivedSkuUnits);
 assert.match(area.stages[4].detail,/no es merma ni rechazo/);
 assert.equal(area.stages[4].evidence[0],'qualityLedger.daily');
 assert.ok(area.days.every(d=>d.qualityHeldSkuUnits===q.daily[d.day].heldSkuUnits));
 assert.ok(Object.isFrozen(q)&&Object.isFrozen(q.lots)&&Object.isFrozen(q.daily[0]));
 assert.throws(()=>{q.lots[0].heldSkuUnits=-1},TypeError);
 assert.ok(q.lots.every(l=>l.receivedSkuUnits===l.releasedSkuUnits+l.heldSkuUnits));
 assert.ok(q.lots.every(l=>l.firstReleaseDay===null||l.firstReleaseDay>=l.receivedDay));
});

test('M3-09: zero release rate keeps every received lot under Quality and blocks use of incoming stock',()=>{
 const {comparison,campaign,area}=build({option:'emergency',urgentArrivalDay:1,qualityReleasePercent:0,stock:{A:0,B:0,C:0}});
 const q=campaign.qualityLedger,t=q.totals;
 assert.ok(t.receivedSkuUnits>0);
 assert.equal(t.releasedSkuUnits,0);
 assert.equal(t.closingHeldSkuUnits,t.receivedSkuUnits);
 assert.ok(q.lots.every(l=>l.releasedSkuUnits===0&&l.firstReleaseDay===null));
 assert.ok(q.daily.every(d=>d.releasedSkuUnits===0));
 assert.equal(comparison.recovered.completed,0,'with zero opening and no releases, no complete order can leave');
 assert.equal(area.metrics.shippedOrders,0);
 assert.equal(area.metrics.closingQualitySkuUnits,t.closingHeldSkuUnits);
 assert.equal(campaign.passed,true);
});

test('M3-09: release at 100% admits the entire lot on the receipt day, never before it',()=>{
 const {comparison,campaign}=build({qualityReleasePercent:100,receivingUnitCapacity:50});
 const q=campaign.qualityLedger;
 assert.ok(q.lots.length>0);
 assert.ok(q.lots.every(l=>l.heldSkuUnits===0));
 assert.ok(q.lots.every(l=>l.releasedSkuUnits===l.receivedSkuUnits));
 assert.ok(q.lots.every(l=>l.firstReleaseDay===l.receivedDay));
 assert.ok(q.daily.every(d=>d.heldSkuUnits===0&&d.receivedSkuUnits===d.releasedSkuUnits));
 assert.ok(comparison.recovered.ledger.every(d=>d.waitingQuality===0));
});

test('M3-09: partial releases respect FIFO and never release more than stock in a lot',()=>{
 const {comparison,campaign}=build({qualityReleasePercent:15,receivingUnitCapacity:20,option:'combined',urgentArrivalDay:2});
 const q=campaign.qualityLedger;
 assert.ok(q.lots.some(l=>l.releaseIds.length>1));
 assert.ok(q.lots.every(l=>l.heldSkuUnits>=0&&l.releasedSkuUnits<=l.receivedSkuUnits));
 const first=q.lots[0],late=q.lots.find(l=>l.receivedDay>first.receivedDay);
 assert.ok(first&&late);
 assert.ok(first.firstReleaseDay!==null);
 assert.ok(q.totals.heldSkuDays>=q.totals.closingHeldSkuUnits);
 assert.ok(q.daily.every(d=>d.releaseEvents===comparison.recovered.ledger[d.day].releaseEvents.length));
});

test('M3-09: original supplier commitments are not rewritten to accelerate Quality',()=>{
 const low=build({actualOrders:140,qualityReleasePercent:0});
 const high=build({actualOrders:340,qualityReleasePercent:100,option:'combined',urgentArrivalDay:1});
 assert.deepEqual(low.campaign.purchaseOrders.filter(p=>p.source==='original'),
  high.campaign.purchaseOrders.filter(p=>p.source==='original'));
 assert.equal(low.campaign.qualityLedger.totals.releasedSkuUnits,0);
 assert.ok(high.campaign.qualityLedger.totals.releasedSkuUnits>0);
 assert.equal(low.campaign.qualityLedger.passed,true);
 assert.equal(high.campaign.qualityLedger.passed,true);
});

test('M3-09: forged early, duplicate, wrong SKU, or excessive releases fail closed',()=>{
 const {comparison,campaign}=build({qualityReleasePercent:25,receivingUnitCapacity:50});
 const args={replay:comparison.recovered,receipts:campaign.receipts,
  qualityReleases:campaign.qualityReleases,qualityLots:campaign.qualityLots};
 const row=args.qualityReleases[0];
 assert.ok(row);
 const tampered=[{...row,qty:row.qty+1},...args.qualityReleases.slice(1)];
 assert.throws(()=>qualityLotReadModel({...args,qualityReleases:tampered}),/Calidad SKU/);
 const duplicated=[...args.qualityReleases,row];
 assert.throws(()=>qualityLotReadModel({...args,qualityReleases:duplicated}),/Calidad SKU/);
 const wrong=[{...row,skuId:'INVALID'},...args.qualityReleases.slice(1)];
 assert.throws(()=>qualityLotReadModel({...args,qualityReleases:wrong}),/Calidad SKU/);
 const fake=[{...row,lotId:'LOT-NONEXISTENT'},...args.qualityReleases.slice(1)];
 assert.throws(()=>qualityLotReadModel({...args,qualityReleases:fake}),/Calidad SKU/);
 const badLot=campaign.qualityLots.map((l,i)=>i?l:{...l,heldQty:l.heldQty+1});
 assert.throws(()=>qualityLotReadModel({...args,qualityLots:badLot}),/lote físico/);
 const alteredLedger=comparison.recovered.ledger.map((d,i)=>i!==row.day?d:{
  ...d,heldQuality:{...d.heldQuality,[row.skuId]:d.heldQuality[row.skuId]+1}
 });
 assert.throws(()=>qualityLotReadModel({...args,replay:{...comparison.recovered,ledger:alteredLedger}}),/retención diaria/);
});

test('M3-09: exhausted Quality lots do not generate zero-unit release events in subsequent days',()=>{
 const {comparison,campaign}=build({qualityReleasePercent:100,receivingUnitCapacity:800});
 const events=comparison.recovered.ledger.flatMap(d=>d.releaseEvents);
 assert.ok(events.length>0);
 assert.ok(events.every(r=>Number.isSafeInteger(r.qty)&&r.qty>0));
 assert.equal(events.length,campaign.qualityReleases.length);
 assert.equal(campaign.qualityLedger.totals.releasedSkuUnits,sum(events,r=>r.qty));
});
