import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSessionRecord,serializeSession,deserializeSession} from '../src/session-state.js';
import {recoveryComparison} from '../src/recovery.js';
import {skuAudit} from '../src/audit.js';
import {skuProcurementReconciliation} from '../src/sku-procurement.js';
import {campaignSnapshot} from '../src/campaign.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';
import {createSkuSessionCache} from '../src/sku-session.js';

const cid='CD-STAGING-12C';
const common={policy:'service',plannedOrders:200,actualOrders:280,
 plannedForecastPercent:80,planningCoveragePercent:70,
 pickingUnitCapacity:20,transportUnitCapacity:4,option:'combined',urgentArrivalDay:1};
test('M3-12c: legacy sessions remain coupled; staging toggle round-trips without serializing physical stock',()=>{
 const old={schemaVersion:3,campaignId:cid,currentSection:'dashboard',revealed:true,shockDirection:1,
  skuPolicy:'service',skuRecovery:'wait'};
 const restored=normalizeSessionRecord(old,{fallbackCampaignId:cid});
 assert.equal(restored.skuSeparateTransport,false);
 const active={...old,skuSeparateTransport:true};
 const saved=serializeSession(active);
 assert.equal(deserializeSession(saved,{fallbackCampaignId:cid}).state.skuSeparateTransport,true);
 assert.ok(!saved.includes('stagingStock'));
 assert.ok(!saved.includes('pickEvents'));
 const reset=deserializeSession(serializeSession({...active,skuSeparateTransport:false}),{fallbackCampaignId:cid});
 assert.equal(reset.state.skuSeparateTransport,false);
 assert.equal(normalizeSessionRecord({...active,skuSeparateTransport:'true'},{fallbackCampaignId:cid}).skuSeparateTransport,false);
});

test('M3-12c: Procurement and SKU economic audit conserve STAGING-CD cost with correct service count',()=>{
 const comparison=recoveryComparison({...common,separateTransport:true});
 const physical=skuProcurementReconciliation(comparison);
 const audit=skuAudit({...common,separateTransport:true,comparisonResult:comparison});
 const campaign=campaignSnapshot({comparison,campaignId:cid,plannedOrders:200});
 const areas=campaignAreaReadModel({comparison,campaign,campaignId:cid,plannedOrders:200});
 assert.equal(physical.passed,true);
 assert.equal(audit.passed,true);
 assert.equal(campaign.passed,true);
 assert.equal(areas.passed,true);
 assert.equal(audit.orders.completed,areas.metrics.shippedOrders);
 assert.equal(audit.orders.pending,areas.metrics.stagedOrders+areas.metrics.unpickedOrders);
 assert.equal(physical.totals.stagedValue,audit.stockValue.staged);
 assert.equal(physical.totals.stagedValue,campaign.inventory.bySku.reduce((n,s)=>{
  const price=campaign.catalog.find(k=>k.id===s.skuId).unitCost;return n+s.staged*price;
 },0));
 assert.ok(campaign.picks.length>=campaign.shipments.length);
 assert.ok(areas.metrics.closingStagingSkuUnits>=0);
 assert.equal(areas.metrics.unpickedOrders+areas.metrics.stagedOrders+areas.metrics.shippedOrders,280);
 for(const r of audit.bySku)assert.equal(r.opening+r.received,r.shipped+r.held+r.reserved+r.staged+r.closing);
});

test('M3-12c: legacy purchase economic audit and decision recovery remain unchanged',()=>{
 const legacy=recoveryComparison({...common,separateTransport:false});
 const audit=skuAudit({...common,comparisonResult:legacy});
 const ledger=skuProcurementReconciliation(legacy);
 assert.equal(ledger.passed,true);
 assert.equal(audit.passed,true);
 assert.equal(ledger.totals.stagedValue,0);
 assert.equal(audit.stockValue.staged,0);
 assert.ok(audit.bySku.every(x=>x.staged===0));
});

test('M3-12c: shared cached comparison changes only when user explicitly toggles mode',()=>{
 const cache=createSkuSessionCache();
 const contract={campaignId:cid,plannedSampleOrders:200};
 const make=(skuInputs)=>cache.getProjection({contract,skuInputs,option:'wait',urgentArrivalDay:1,purchaseCoveragePercent:100});
 const plainInputs={...common,option:undefined};
 delete plainInputs.option;delete plainInputs.urgentArrivalDay;
 const classic=make(plainInputs);
 const staging=make({...plainInputs,separateTransport:true});
 assert.notEqual(classic,staging);
 assert.equal(classic.comparison.recovered.separateTransport,false);
 assert.equal(staging.comparison.recovered.separateTransport,true);
 assert.equal(make(plainInputs),classic);
 assert.equal(make({...plainInputs,separateTransport:true}),staging);
 assert.equal(staging.chain.campaign.passed,true);
 assert.equal(staging.areaModel.passed,true);
 assert.equal(classic.chain.campaign.passed,true);
 assert.equal(classic.areaModel.passed,true);
});
