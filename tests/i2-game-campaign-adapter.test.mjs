import test from 'node:test';
import assert from 'node:assert/strict';
import {NODES,DEFAULTS} from '../src/engine.js';
import {DEFAULT_SCENARIO} from '../src/scenario.js';
import {I2_AREAS,I2_RECOVERIES} from '../src/i2-product-contract.js';
import {createI2GameCampaignAdapter,i2AreaSelection} from '../src/i2-game-campaign-adapter.js';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {createSkuSessionCache} from '../src/sku-session.js';
import {i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';

const decisions=()=>Object.fromEntries(I2_AREAS.map(a=>[a.id,DEFAULTS[a.id]]));
const scenarios=I2_AREAS.map((area,index)=>{
 const choices=decisions();
 // Exercise one alternative decision in EACH area, while retaining all
 // other fixed canonical inputs. All eight scenario identities are unique.
 const alternatives=area.choices.map(x=>x.optionId);
 choices[area.id]=alternatives.find(id=>id!==DEFAULTS[area.id]);
 const plannedOrders=70+index*11;
 const demand=1000;
 const pct=[-30,-10,0,10,20,35,40,50][index];
 const actualDemand=Math.round(demand*(100+pct)/100);
 return {
  id:'CD-I2-04-'+area.id,campaignId:'CD-I2-04-'+area.id,
  areaId:area.id,choices,policy:['lean','balanced','service'][index%3],
  supplierDelay:index%3===0,plannedOrders,
  scenario:{...DEFAULT_SCENARIO,demand,actualDemand,demandShockPercent:Math.abs(pct)}
 };
});

test('I2-04: 8 area configurations × 5 recovery strategies use exactly the V1 physical records',()=>{
 const game=createI2GameCampaignAdapter();
 const reference=createSkuSessionCache({maxEntries:5});
 let checked=0;
 for(const entry of scenarios){
  let common=null;
  const normalized=i2AreaSelection(entry.choices,entry.campaignId);
  assert.deepEqual(normalized,entry.choices,entry.areaId);
  for(const option of I2_RECOVERIES.map(x=>x.optionId)){
   const args={choices:entry.choices,campaignId:entry.campaignId,plannedOrders:entry.plannedOrders,
    scenario:entry.scenario,policy:entry.policy,supplierDelay:entry.supplierDelay,
    option,urgentArrivalDay:option==='emergency'?13:2,
    purchaseCoveragePercent:option==='wait'?0:75
   };
   const result=game.evaluate({...args,revealed:true});
   const contract=campaignSkuContract({
    decisions:normalized,actions:{},campaignId:entry.campaignId,
    scenario:{...entry.scenario,lockUpstream:true},
    policy:entry.policy,supplierDelay:entry.supplierDelay,
    plannedSampleOrders:entry.plannedOrders
   });
   const same=reference.getProjection({
    contract,skuInputs:contract.skuInputs,option,
    urgentArrivalDay:args.urgentArrivalDay,
    purchaseCoveragePercent:args.purchaseCoveragePercent
   });
   assert.equal(result.passed,true);
   assert.equal(result.scope,'sku-cohort');
   assert.equal(result.horizonDays,12);
   assert.equal(result.actualOrders,contract.actualSampleOrders);
   assert.deepEqual(result.contract.skuInputs,contract.skuInputs);
   assert.deepEqual(result.comparison.baselineSnapshot,same.comparison.baselineSnapshot);
   assert.deepEqual(result.comparison.originalPurchaseOrders,same.comparison.originalPurchaseOrders);
   assert.deepEqual(result.comparison.recovered.ledger,same.comparison.recovered.ledger,
    entry.areaId+'/'+option+': daily physical replay mismatch');
   assert.deepEqual(result.campaign.purchaseOrders,same.chain.campaign.purchaseOrders);
   assert.deepEqual(result.campaign.receipts,same.chain.campaign.receipts);
   assert.deepEqual(result.campaign.shipments,same.chain.campaign.shipments);
   assert.deepEqual(result.campaign.inventory,same.chain.campaign.inventory);
   assert.deepEqual(result.areaModel.stages,same.areaModel.stages);
   assert.deepEqual(result.areaModel.days,same.areaModel.days);
   assert.deepEqual(result.comparison.incrementalExpense,same.comparison.incrementalExpense);
   assert.deepEqual(result.comparison.economicProxyDelta,same.comparison.economicProxyDelta);
   assert.deepEqual(result.areaChoices,entry.choices);
   assert.deepEqual(result.campaign.plan.originalPurchaseOrders,result.comparison.originalPurchaseOrders.rows);
   assert.ok(Object.isFrozen(result.comparison)&&Object.isFrozen(result.contract));
   assert.equal(result.comparison.recovered.completed+result.comparison.recovered.pending,contract.actualSampleOrders);
   assert.equal(result.areaModel.metrics.shippedOrders,result.comparison.recovered.completed);
   // Every intervention replays the same frozen before-recovery PO/stock.
   const signature=JSON.stringify({
    baselineKey:result.comparison.baselineKey,
    original:result.comparison.originalPurchaseOrders,
    opening:result.contract.openingState
   });
   if(common===null)common=signature;
   else assert.equal(signature,common,'Recovery rewrote original planning/stock for '+entry.areaId);
   if(option==='emergency')assert.equal(result.comparison.recovered.completed,
    result.comparison.base.completed,'An urgent delivery on day 13 cannot recover a day-12 shipment');
   checked++;
  }
 }
 assert.equal(checked,40);
});

test('I2-04: pre-reveal shows only planning metadata, never calls simulation',()=>{
 let invocations=0;
 const game=createI2GameCampaignAdapter({cache:{
  getProjection(){invocations++;throw new Error('should not happen')}
 }});
 const scenario={...DEFAULT_SCENARIO,demand:1000,actualDemand:1400};
 const before=game.evaluate({revealed:false,campaignId:'CD-PREV-01',choices:decisions(),plannedOrders:200,scenario});
 assert.equal(before.revealed,false);
 assert.equal(before.phase,'planning');
 assert.equal(invocations,0);
 assert.ok(Object.isFrozen(before.areaChoices));
 const serialized=JSON.stringify(before);
 for(const forbidden of ['actualDemand','actualOrders','purchaseOrders','shipments','supplierLedger','recovered','1400']){
  assert.equal(serialized.includes(forbidden),false,'Pre-reveal leaked '+forbidden);
 }
 assert.throws(()=>game.evaluate({revealed:true,campaignId:'CD-PREV-01',choices:decisions(),scenario}),
  /should not happen/);
});

test('I2-04: fail closed on unknown area, scope, economy, surprise and unrealistic quantities',()=>{
 const good={campaignId:'CD-GATE-01',choices:decisions(),revealed:false};
 const bad=[
  {...good,choices:{...good.choices,forged:'abc'}},
  {...good,choices:{...good.choices,picking:'forged'}},
  {...good,scope:'aggregate-shift'},
  {...good,horizonDays:11},
  {...good,option:'fictional'},
  {...good,policy:'unsupported'},
  {...good,supplierDelay:'yes'},
  {...good,plannedOrders:0},
  {...good,urgentArrivalDay:0},
  {...good,purchaseCoveragePercent:101},
  {...good,scenario:{demand:1000,actualDemand:1400,customerSecret:'confidential'}},
  {...good,scenario:{demand:1000,actualDemand:1400,aggregateDispatched:200}},
  {...good,scenario:{demand:1000,actualDemand:2200}},
  {...good,scenario:{demand:1000,actualDemand:-1}},
  {...good,revealed:'true'}
 ];
 const game=createI2GameCampaignAdapter();
 for(const b of bad)assert.throws(()=>game.evaluate(b),/I2-04:|I2:/);
 assert.throws(()=>i2AreaSelection(null),/I2-04/);
});

test('I2-04: playable alpha output remains equivalent after switching to shared adapter',()=>{
 const game=i2MvpPhysicalResult({option:'combined',urgentArrivalDay:2,purchaseCoveragePercent:75});
 const reference=createI2GameCampaignAdapter().evaluate({
  revealed:true,campaignId:'CD-I2-MVP-ALFA',
  choices:decisions(),plannedOrders:200,
  scenario:{...DEFAULT_SCENARIO,demand:1000,actualDemand:1400,demandShockPercent:40},
  policy:'balanced',option:'combined',urgentArrivalDay:2,purchaseCoveragePercent:75
 });
 assert.equal(game.shippedOrders,reference.comparison.recovered.completed);
 assert.equal(game.baselineShipped,reference.comparison.base.completed);
 assert.deepEqual(game.originalPurchaseOrders,reference.comparison.originalPurchaseOrders);
 assert.equal(game.incrementalExpenseCLP,reference.comparison.incrementalExpense);
 assert.deepEqual(game.areaRows,reference.areaModel.stages);
});
