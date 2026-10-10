import test from 'node:test';
import assert from 'node:assert/strict';
import {createSkuSessionCache} from '../src/sku-session.js';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {recoveryComparison} from '../src/recovery.js';
import {supplyBridge} from '../src/supply-bridge.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';

const campaign=(id='CD-SHARED',actual=1400)=>campaignSkuContract({
 campaignId:id,policy:'service',plannedSampleOrders:200,
 decisions:{commercial:'under',planning:'partial',purchasing:'reliable'},
 scenario:{demand:1000,actualDemand:actual,lockUpstream:true}
});
const options=(c,option='emergency',day=1,coverage=100)=>({
 contract:c,skuInputs:c.skuInputs,option,urgentArrivalDay:day,purchaseCoveragePercent:coverage
});

test('M2-04b: repeated views reuse same physical event replay and canonical area projection',()=>{
 let replayCalls=0,bridgeCalls=0,areaCalls=0;
 const cache=createSkuSessionCache({
  replay:p=>{replayCalls++;return recoveryComparison(p)},
  bridge:p=>{bridgeCalls++;return supplyBridge(p)},
  readModel:p=>{areaCalls++;return campaignAreaReadModel(p)}
 });
 const c=campaign();
 const first=cache.getProjection(options(c));
 const second=cache.getProjection(options(c));
 const preview=cache.getComparison(options(c));
 assert.equal(first,second);
 assert.equal(first.comparison,preview);
 assert.equal(first.chain.campaign,first.chain.campaign);
 assert.equal(first.areaModel.campaignId,c.campaignId);
 assert.equal(first.chain.campaign.shipments.length,first.areaModel.metrics.shippedOrders);
 assert.equal(first.chain.campaign.orders.length,first.areaModel.metrics.actualOrders);
 assert.equal(first.areaModel.metrics.actualOrders,280);
 assert.ok(first.areaModel.passed&&first.chain.campaign.passed);
 assert.equal(replayCalls,1);
 assert.equal(bridgeCalls,1);
 assert.equal(areaCalls,1);
 assert.deepEqual(cache.stats(),{entries:1,simulations:1,projections:1,maxEntries:10});
 assert.ok(Object.isFrozen(first)&&Object.isFrozen(first.comparison)&&Object.isFrozen(first.areaModel));
 assert.throws(()=>{first.comparison.recovered.completed=0},TypeError);
});

test('M2-04b: the selected preview, recovery mission and alternative comparisons reuse event runs',()=>{
 let count=0;
 const cache=createSkuSessionCache({replay:x=>{count++;return recoveryComparison(x)}});
 const c=campaign();
 const selected=options(c,'wait');
 const preview=cache.getComparison(selected);
 const main=cache.getProjection(selected);
 assert.equal(main.comparison,preview);
 for(const option of ['wait','reserve','overtime','emergency','combined'])
  cache.getComparison(options(c,option));
 assert.equal(count,5,'one simulation per alternative, not one per screen');
 for(const option of ['wait','reserve','overtime','emergency','combined'])
  cache.getComparison(options(c,option));
 cache.getProjection(selected);
 assert.equal(count,5,'switching tabs does not replay unchanged options');
 assert.equal(cache.stats().projections,1);
});

test('M2-04b: changed demand, recovery or supplier forecast cannot reuse stale stock/order output',()=>{
 const cache=createSkuSessionCache({maxEntries:6});
 const base=campaign('CD-CHANGED',1400);
 const original=cache.getProjection(options(base,'wait'));
 const modified=campaign('CD-CHANGED',1500);
 const fresh=cache.getProjection(options(modified,'wait'));
 const rescue=cache.getProjection(options(modified,'emergency'));
 const nextCampaign=campaign('CD-OTHER',1500);
 const other=cache.getProjection(options(nextCampaign,'wait'));
 assert.notEqual(original,fresh);
 assert.notEqual(fresh,rescue);
 assert.notEqual(fresh,other);
 assert.equal(original.areaModel.metrics.actualOrders,280);
 assert.equal(fresh.areaModel.metrics.actualOrders,300);
 assert.equal(other.campaignId,'CD-OTHER');
 assert.equal(cache.stats().simulations,4);
});

test('M2-04b: bounded LRU cache evicts old detailed ledgers on a phone',()=>{
 const cache=createSkuSessionCache({maxEntries:2});
 const c=campaign('CD-BOUNDED');
 const wait=cache.getComparison(options(c,'wait'));
 const emergency=cache.getComparison(options(c,'emergency'));
 cache.getComparison(options(c,'wait')); // wait is most recently used
 const reserve=cache.getComparison(options(c,'reserve'));
 assert.equal(cache.stats().entries,2);
 assert.equal(cache.getComparison(options(c,'wait')),wait);
 assert.notEqual(cache.getComparison(options(c,'emergency')),emergency);
 assert.equal(cache.stats().entries,2);
 assert.notEqual(wait,reserve);
 assert.throws(()=>createSkuSessionCache({maxEntries:0}),/Límite/);
});

test('M2-04b: reload reconstructs same campaign and physical facts from persisted inputs',()=>{
 const c=campaign('CD-RELOADED',1400);
 const a=createSkuSessionCache().getProjection(options(c,'emergency',2,50));
 const saved={campaignId:c.campaignId,plannedSampleOrders:c.plannedSampleOrders,skuInputs:JSON.parse(JSON.stringify(c.skuInputs))};
 const b=createSkuSessionCache().getProjection({
  contract:{campaignId:saved.campaignId,plannedSampleOrders:saved.plannedSampleOrders},
  skuInputs:saved.skuInputs,option:'emergency',urgentArrivalDay:2,purchaseCoveragePercent:50
 });
 assert.deepEqual(a.areaModel,b.areaModel);
 assert.deepEqual(a.chain.campaign,b.chain.campaign);
 assert.equal(a.campaignId,b.campaignId);
});

test('M2-04b: reset clears scenario memory and invalid request never contaminates cache',()=>{
 const cache=createSkuSessionCache();
 const c=campaign();
 cache.getProjection(options(c));
 assert.throws(()=>cache.getProjection({...options(c),skuInputs:{...c.skuInputs,plannedOrders:1}}),/Contrato/);
 assert.equal(cache.stats().entries,1);
 cache.clear();
 assert.deepEqual(cache.stats(),{entries:0,simulations:0,projections:0,maxEntries:10});
 const after=cache.getProjection(options(c));
 assert.equal(after.stamp,'SKU-VIEW-1');
 assert.equal(after.areaModel.metrics.actualOrders,280);
});
