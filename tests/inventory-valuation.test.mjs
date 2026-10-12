import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {skuAudit} from '../src/audit.js';
import {SKU_CATALOG} from '../src/sku.js';
import {skuInventoryValuationReadModel} from '../src/inventory-valuation.js';

const options={policy:'service',plannedOrders:200,actualOrders:280,
 plannedForecastPercent:80,planningCoveragePercent:70};
function make(changes={}){
 const comparison=recoveryComparison({...options,...changes});
 const campaign=campaignSnapshot({comparison,campaignId:'M4-15',plannedOrders:200});
 return {comparison,campaign,valuation:campaign.inventoryValuation};
}
const sum=(rows,key)=>rows.reduce((total,row)=>total+row[key],0);

test('M4-15: each physical day has one CLP valuation with four exclusive zones',()=>{
 const {comparison,campaign,valuation}=make({
  option:'combined',urgentArrivalDay:2,receivingUnitCapacity:55,
  qualityReleasePercent:35,reservePercent:20,
  inventoryAccuracyPercent:80,separateTransport:true,transportUnitCapacity:10
 });
 assert.equal(campaign.passed,true);
 assert.equal(campaign.checks.inventoryValuation,true);
 assert.equal(valuation.passed,true);
 assert.equal(valuation.scope,'sku-cohort');
 assert.equal(valuation.currency,'CLP');
 assert.equal(valuation.accountingStatus,'inventory-valued-not-cash');
 assert.equal(valuation.daily.length,comparison.recovered.days+1);
 assert.equal(valuation.ratesSource,'shared-default-rates');
 assert.equal(valuation.daily[0].day,0);
 assert.equal(valuation.daily.at(-1).day,comparison.recovered.days);
 assert.equal(valuation.totals.openingCLP,
  SKU_CATALOG.reduce((n,p)=>n+comparison.recovered.initial[p.id]*p.unitCost,0));
 assert.equal(valuation.totals.openingCLP+valuation.totals.receivedToDateCLP,
  valuation.totals.shippedToDateCLP+valuation.totals.closingPhysicalCLP);
 assert.equal(valuation.totals.closingPhysicalCLP,
  valuation.totals.pickFaceCLP+valuation.totals.qualityHeldCLP+
  valuation.totals.reserveCLP+valuation.totals.stagingCLP);
 assert.equal(valuation.totals.pickFaceCLP,
  valuation.totals.verifiedCLP+valuation.totals.unverifiedCLP);
 assert.equal(campaign.inventoryValuation,valuation);
 assert.ok(valuation.daily.some(day=>day.totals.reserveCLP>0));
 assert.ok(valuation.daily.some(day=>day.totals.qualityHeldCLP>0));
 assert.ok(valuation.daily.some(day=>day.totals.stagingCLP>0));
 assert.ok(valuation.totals.closingPhysicalCLP>=0);
 for(const [dayIndex,day] of valuation.daily.entries()){
  const physical=campaign.inventoryLedger.daily[dayIndex];
  assert.equal(day.day,physical.day);
  assert.equal(day.bySku.length,3);
  assert.ok(day.checks.physicalValuationBalanced);
  for(const line of day.bySku){
   const units=physical.bySku.find(p=>p.skuId===line.skuId);
   const price=SKU_CATALOG.find(p=>p.id===line.skuId).unitCost;
   assert.equal(line.openingCLP,units.openingSkuUnits*price);
   assert.equal(line.closingPhysicalCLP,units.physicalSkuUnits*price);
   assert.equal(line.receivedTodayCLP,units.receivedTodaySkuUnits*price);
   assert.equal(line.shippedTodayCLP,units.shippedTodaySkuUnits*price);
   assert.equal(line.closingPhysicalCLP,
    line.pickFaceCLP+line.qualityHeldCLP+line.reserveCLP+line.stagingCLP);
   assert.equal(line.pickFaceCLP,line.verifiedCLP+line.unverifiedCLP);
  }
  assert.equal(day.nonPurchaseTransfersCLP,
   day.totals.transferredTodayCLP+day.totals.releasedTodayCLP);
  if(dayIndex>0){
   const before=valuation.daily[dayIndex-1];
   assert.equal(day.totals.closingPhysicalCLP,
    before.totals.closingPhysicalCLP+day.totals.receivedTodayCLP-day.totals.shippedTodayCLP);
  }
 }
 assert.ok(Object.isFrozen(valuation)&&Object.isFrozen(valuation.daily[0])
  &&Object.isFrozen(valuation.daily[0].bySku[0]));
 assert.throws(()=>{valuation.daily[0].bySku[0].closingPhysicalCLP=-1},TypeError);
});

test('M4-15: exact physical closing cost matches existing SKU audit for diverse operating scenarios',()=>{
 const scenarios=[
  {option:'wait',qualityReleasePercent:100},
  {option:'emergency',urgentArrivalDay:13},
  {option:'wait',qualityReleasePercent:0},
  {option:'reserve',reservePercent:30,urgentArrivalDay:2},
  {option:'combined',receivingUnitCapacity:0},
  {option:'wait',inventoryAccuracyPercent:0},
  {option:'emergency',separateTransport:true,transportUnitCapacity:0},
  {option:'combined',separateTransport:true,transportUnitCapacity:15,qualityReleasePercent:25},
  {option:'wait',days:0,actualOrders:1}
 ];
 for(const params of scenarios){
  const {comparison,campaign,valuation}=make(params);
  const audit=skuAudit({...options,...params,comparisonResult:comparison});
  assert.equal(campaign.passed,true,JSON.stringify(params));
  assert.equal(valuation.totals.openingCLP,audit.stockValue.opening);
  assert.equal(valuation.totals.receivedToDateCLP,audit.stockValue.received);
  assert.equal(valuation.totals.shippedToDateCLP,audit.stockValue.shipped);
  assert.equal(valuation.totals.pickFaceCLP,audit.stockValue.closing);
  assert.equal(valuation.totals.qualityHeldCLP,audit.stockValue.held);
  assert.equal(valuation.totals.reserveCLP,audit.stockValue.reserved);
  assert.equal(valuation.totals.stagingCLP,audit.stockValue.staged);
  assert.equal(valuation.totals.closingPhysicalCLP,
   audit.stockValue.closing+audit.stockValue.held+
    audit.stockValue.reserved+audit.stockValue.staged);
  assert.equal(valuation.daily.length,(params.days??12)+1);
  assert.equal(audit.passed,true);
 }
});

test('M4-15: reserve transfers, held Quality stock and unverified goods cannot be counted twice',()=>{
 const {campaign,valuation}=make({
  option:'reserve',reservePercent:30,urgentArrivalDay:2,
  qualityReleasePercent:0,inventoryAccuracyPercent:35,
  separateTransport:true,transportUnitCapacity:0
 });
 assert.ok(valuation.daily[0].totals.reserveCLP>0);
 assert.equal(valuation.totals.closingPhysicalCLP,
  valuation.totals.openingCLP+valuation.totals.receivedToDateCLP-valuation.totals.shippedToDateCLP);
 assert.equal(valuation.totals.closingPhysicalCLP,valuation.totals.pickFaceCLP+
  valuation.totals.reserveCLP+valuation.totals.stagingCLP+valuation.totals.qualityHeldCLP);
 assert.ok(valuation.totals.qualityHeldCLP>0);
 assert.ok(valuation.totals.unverifiedCLP>0);
 assert.equal(campaign.checks.inventoryValuation,true);
 assert.ok(valuation.exclusions.includes('double-count-verified-stock'));
 assert.ok(valuation.exclusions.includes('realized-payments'));
});

test('M4-15: forged values, zones, currency or missing SKU fail closed',()=>{
 const {campaign}=make({option:'combined',reservePercent:20,separateTransport:true});
 const base=campaign.inventoryLedger;
 assert.throws(()=>skuInventoryValuationReadModel({inventoryLedger:{...base,scope:'aggregate-shift'}}),/libro físico/);
 const falsifiedDay=base.daily.map((day,i)=>i!==2?day:
  {...day,bySku:day.bySku.map((row,j)=>j===0?{...row,receivedTodaySkuUnits:row.receivedTodaySkuUnits+1}:row)});
 assert.throws(()=>skuInventoryValuationReadModel({inventoryLedger:{...base,daily:falsifiedDay}}),/no concilian/);
 const doubledStock=base.daily.map((day,i)=>i!==2?day:
  {...day,bySku:day.bySku.map((row,j)=>j===0?{...row,pickFaceSkuUnits:row.pickFaceSkuUnits+1}:row)});
 assert.throws(()=>skuInventoryValuationReadModel({inventoryLedger:{...base,daily:doubledStock}}),/zona física/);
 assert.throws(()=>skuInventoryValuationReadModel({inventoryLedger:base,catalog:SKU_CATALOG.slice(1)}),/no coinciden/);
 assert.throws(()=>skuInventoryValuationReadModel({inventoryLedger:base,catalog:SKU_CATALOG.map(p=>({...p,unitCost:p.unitCost+1}))}),/no coinciden/);
});

test('M4-15: deterministic, read-only projection does not edit the physical ledger or rates',()=>{
 const {campaign,valuation}=make({option:'combined',separateTransport:true,transportUnitCapacity:8});
 const before=JSON.stringify(campaign.inventoryLedger);
 const rerender=skuInventoryValuationReadModel({inventoryLedger:campaign.inventoryLedger,catalog:campaign.catalog});
 assert.deepEqual(rerender,valuation);
 assert.equal(JSON.stringify(campaign.inventoryLedger),before);
 assert.equal(valuation.daily.length,campaign.inventoryLedger.daily.length);
 assert.equal(valuation.totals.currency,'CLP');
 assert.equal(sum(valuation.daily.at(-1).bySku,'closingPhysicalCLP'),valuation.totals.closingPhysicalCLP);
 assert.ok(!Object.hasOwn(valuation,'profit'));
 assert.ok(!Object.hasOwn(valuation,'cash'));
});
