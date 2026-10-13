import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {skuEconomicAuditReadModel} from '../src/sku-economic-audit.js';

const make=(params={})=>{
 const comparison=recoveryComparison({
  policy:'service',plannedOrders:200,actualOrders:280,
  plannedForecastPercent:80,planningCoveragePercent:70,...params
 });
 const campaign=campaignSnapshot({comparison,campaignId:'M4-19',plannedOrders:200});
 return {comparison,campaign,audit:campaign.economicAudit};
};
const args=({comparison,campaign})=>({
 campaignId:campaign.campaignId,horizonDays:campaign.horizonDays,
 comparison,catalog:campaign.catalog,purchaseOrders:campaign.purchaseOrders,
 receipts:campaign.receipts,shipments:campaign.shipments,orders:campaign.orders,
 inventoryLedger:campaign.inventoryLedger,inventoryValuation:campaign.inventoryValuation,
 purchaseCost:campaign.purchaseCost,operationalCost:campaign.operationalCost,
 economicResult:campaign.economicResult
});
const sum=(xs,key)=>xs.reduce((v,x)=>v+x[key],0);
const approx=(a,b)=>assert.ok(Math.abs(a-b)<0.00001,JSON.stringify({a,b}));

test('M4-19: event-level evidence reconciles purchases, physical SKU cost and partial contribution',()=>{
 const state=make({
  option:'combined',urgentArrivalDay:2,receivingUnitCapacity:25,
  supplierFill:{A:65,B:80,C:70},qualityReleasePercent:45,
  reservePercent:25,inventoryAccuracyPercent:80,
  separateTransport:true,transportUnitCapacity:14
 });
 const {comparison,campaign,audit}=state;
 assert.equal(campaign.passed,true,JSON.stringify(campaign.checks));
 assert.equal(campaign.checks.economicAudit,true);
 assert.equal(audit.passed,true);
 assert.equal(audit.scope,'sku-cohort');
 assert.equal(audit.currency,'CLP');
 assert.equal(audit.campaignId,'M4-19');
 assert.equal(audit.horizonDays,comparison.recovered.days);
 assert.equal(audit.byDay.length,comparison.recovered.days+1);
 assert.equal(audit.type,'cross-source-physical-financial-audit');
 assert.equal(audit.status,'illustrative-not-PnL');
 assert.ok(Object.values(audit.checks).every(Boolean));
 assert.equal(audit.totals.completeShipments,campaign.shipments.length);
 assert.equal(audit.totals.receivedIntoInventoryCLP,
  campaign.purchaseCost.totals.warehouseReceivedCLP);
 assert.equal(audit.totals.receivedIntoInventoryCLP,
  campaign.inventoryValuation.totals.receivedToDateCLP);
 assert.equal(audit.totals.dispatchedMaterialsCLP,
  campaign.inventoryValuation.totals.shippedToDateCLP);
 assert.equal(audit.totals.deployedReinforcementCLP,
  comparison.operationalCost.totals.totalCostCLP);
 assert.equal(audit.totals.potentialDispatchValueCLP,
  campaign.economicResult.totals.potentialDispatchValueCLP);
 assert.equal(audit.totals.partialContributionCLP,
  campaign.economicResult.totals.partialContributionCLP);
 assert.equal(audit.totals.partialContributionCLP,
  audit.totals.potentialDispatchValueCLP-audit.totals.dispatchedMaterialsCLP-
  audit.totals.deployedReinforcementCLP);
 assert.equal(audit.totals.closingPhysicalStockCLP,
  campaign.inventoryValuation.totals.closingPhysicalCLP);
 assert.equal(audit.totals.contractuallyCommittedPurchaseValueCLP,
  campaign.purchaseCost.totals.totalPurchaseCommitmentCLP);
 assert.equal(sum(audit.byDay,'receivedIntoInventoryCLP'),audit.totals.receivedIntoInventoryCLP);
 assert.equal(sum(audit.byDay,'dispatchedMaterialsCLP'),audit.totals.dispatchedMaterialsCLP);
 assert.equal(sum(audit.byDay,'partialContributionCLP'),audit.totals.partialContributionCLP);
 assert.equal(audit.recognised.length,3);
 assert.equal(audit.excluded.length,6);
 assert.equal(new Set([...audit.recognised,...audit.excluded].map(x=>x.id)).size,9);
 assert.ok(audit.excluded.some(x=>x.id==='closing-inventory'));
 assert.ok(audit.excluded.some(x=>x.id==='urgent-surcharge'));
 assert.ok(audit.excluded.some(x=>x.id==='backlog-proxy'));
 assert.ok(audit.excluded.some(x=>x.id==='holding-proxy'));
 assert.equal(audit.actualInvoicedSalesCLP,null);
 assert.equal(audit.actualCustomerCashCLP,null);
 assert.equal(audit.actualSupplierCashCLP,null);
 assert.equal(audit.actualNetProfitCLP,null);
 assert.ok(Object.isFrozen(audit)&&Object.isFrozen(audit.totals)
  &&Object.isFrozen(audit.byDay[0])&&Object.isFrozen(audit.recognised[0]));
 assert.throws(()=>{audit.byDay[0].partialContributionCLP=-100},TypeError);
 assert.deepEqual(skuEconomicAuditReadModel(args(state)),audit);
});

test('M4-19: reproducible scenarios include no sales, late PO, idle refuerzo and independent staging',()=>{
 const scenes=[
  {option:'wait'},
  {option:'reserve',reservePercent:30},
  {option:'overtime',actualOrders:1,days:12},
  {option:'emergency',urgentArrivalDay:13,days:12},
  {option:'combined',urgentArrivalDay:12,receivingUnitCapacity:0},
  {option:'combined',urgentArrivalDay:1,qualityReleasePercent:0},
  {option:'wait',inventoryAccuracyPercent:0},
  {option:'wait',pickingUnitCapacity:0},
  {option:'combined',separateTransport:true,transportUnitCapacity:0},
  {option:'combined',separateTransport:true,transportUnitCapacity:4,qualityReleasePercent:25},
  {option:'emergency',supplierFill:{A:0,B:0,C:0}},
  {option:'wait',days:0,actualOrders:1},
  {option:'wait',unitRevenue:0},
  {option:'combined',unitRevenue:1,days:3},
  {option:'wait',unitRevenue:15500,actualOrders:120}
 ];
 for(const scene of scenes){
  const a=make(scene),b=make(scene);
  assert.equal(a.campaign.passed,true,JSON.stringify(scene));
  assert.ok(a.audit.passed);
  assert.deepEqual(a.audit,b.audit,'audit is deterministic '+JSON.stringify(scene));
  assert.equal(a.audit.totals.completeShipments,a.campaign.shipments.length);
  approx(a.audit.totals.partialContributionCLP,
   a.audit.totals.potentialDispatchValueCLP-a.audit.totals.dispatchedMaterialsCLP-
   a.audit.totals.deployedReinforcementCLP);
  assert.ok(a.audit.byDay.every(d=>d.confirmation==='physical-SKU-simulation-not-real-cash'));
  assert.equal(a.audit.actualNetProfitCLP,null);
 }
});

test('M4-19: committed urgent PO beyond horizon changes exposure but cannot create expensed SKU',()=>{
 const hold=make({option:'wait',days:12});
 const late=make({option:'emergency',urgentArrivalDay:13,days:12});
 assert.ok(late.comparison.urgentBase>0);
 assert.deepEqual(hold.campaign.shipments,late.campaign.shipments);
 assert.deepEqual(hold.audit.recognised,late.audit.recognised);
 assert.equal(hold.audit.totals.partialContributionCLP,
  late.audit.totals.partialContributionCLP);
 assert.ok(late.audit.excluded.find(x=>x.id==='urgent-purchase').amountCLP>0);
 assert.ok(late.audit.excluded.find(x=>x.id==='urgent-surcharge').amountCLP>0);
 assert.equal(late.audit.totals.receivedIntoInventoryCLP,
  hold.audit.totals.receivedIntoInventoryCLP);
 assert.equal(late.audit.actualSupplierCashCLP,null);
});

test('M4-19: staging without trucks does not book a sale; deployed unused reinforcement still costs',()=>{
 const {comparison,campaign,audit}=make({
  option:'combined',separateTransport:true,transportUnitCapacity:0,
  pickingUnitCapacity:1000,actualOrders:300
 });
 assert.equal(campaign.passed,true);
 assert.equal(campaign.shipments.length,0);
 assert.ok(campaign.picks.length>0);
 assert.ok(comparison.operationalCost.totals.chargeableShifts>0);
 assert.equal(audit.totals.completeShipments,0);
 assert.equal(audit.totals.dispatchedMaterialsCLP,0);
 assert.equal(audit.totals.potentialDispatchValueCLP,0);
 assert.ok(audit.totals.deployedReinforcementCLP>0);
 assert.equal(audit.totals.partialContributionCLP,-audit.totals.deployedReinforcementCLP);
 assert.ok(audit.totals.closingPhysicalStockCLP>0);
});

test('M4-19: zero work produces no surcharge expense, salaries, revenue or customer cash',()=>{
 const {campaign,audit}=make({
  option:'overtime',stock:{A:0,B:0,C:0},
  supplierFill:{A:0,B:0,C:0},actualOrders:200
 });
 assert.equal(campaign.passed,true);
 assert.equal(campaign.shipments.length,0);
 assert.equal(audit.totals.potentialDispatchValueCLP,0);
 assert.equal(audit.totals.dispatchedMaterialsCLP,0);
 assert.equal(audit.totals.deployedReinforcementCLP,0);
 assert.equal(audit.totals.partialContributionCLP,0);
 assert.equal(audit.actualInvoicedSalesCLP,null);
 assert.equal(audit.actualCustomerCashCLP,null);
});

test('M4-19: forged shipping material, orders, procurement and daily values fail closed',()=>{
 const state=make({option:'combined',urgentArrivalDay:2,separateTransport:true,
  transportUnitCapacity:20,receivingUnitCapacity:30});
 const a=args(state);
 assert.equal(skuEconomicAuditReadModel(a).passed,true);
 assert.ok(a.shipments.length>0&&a.receipts.length>0);
 const tamper=(name,changed,pattern)=>assert.throws(
  ()=>skuEconomicAuditReadModel({...a,...changed}),
  pattern||/Auditoría económica SKU/,name);
 tamper('duplicated shipment',{shipments:[...a.shipments,a.shipments[0]]},/duplicados/);
 tamper('forged receipt ID',{receipts:[...a.receipts,a.receipts[0]]},/duplicados/);
 tamper('forged cost standard',{catalog:a.catalog.map(x=>x.id==='A'?{...x,unitCost:x.unitCost+1}:x)},/Catálogo de costos SKU/);
 tamper('forged sale',{economicResult:{...a.economicResult,
  daily:a.economicResult.daily.map((d,i)=>i===0?
   {...d,potentialDispatchValueCLP:d.potentialDispatchValueCLP+1}:d)}},/no concilia valor de pedidos/);
 tamper('forged paid cash',{economicResult:{...a.economicResult,confirmedCashReceivedCLP:200}},/no hay pruebas/);
 tamper('forged payroll',{operationalCost:{...a.operationalCost,actualPayrollPaidCLP:70000}},/no hay pruebas/);
 tamper('forged urgent invoice',{purchaseCost:{...a.purchaseCost,
  proxy:{...a.purchaseCost.proxy,actualSupplierPaymentsCLP:10000}}},/no hay pruebas/);
 tamper('forged closing value',{inventoryValuation:{...a.inventoryValuation,
  totals:{...a.inventoryValuation.totals,closingPhysicalCLP:0}}},/no concilia balance de stock/);
 tamper('incorrect PO',{purchaseOrders:a.purchaseOrders.map((po,i)=>
  i===0?{...po,unitCost:po.unitCost+1}:po)},/orden\/tarifa/);
 tamper('fake shipment day',{shipments:a.shipments.map((s,i)=>
  i===0?{...s,day:11}:s)},/expedición no corresponde/);
 tamper('duplicate PO',{purchaseOrders:[...a.purchaseOrders,a.purchaseOrders[0]]},/duplicados/);
 tamper('extra cost posted for absent activity',{operationalCost:{...a.operationalCost,
  daily:a.operationalCost.daily.map((d,i)=>i===0?{...d,costCLP:d.costCLP+500}:d)}},/recurso operacional|no concilia refuerzo/);
});

test('M4-19: changing one real shipment SKU while keeping its unit total cannot hide the cost',()=>{
 const state=make({option:'wait',actualOrders:100});
 const a=args(state);
 const idx=a.shipments.findIndex(s=>s.lines.A&&s.lines.B);
 assert.ok(idx>=0);
 const shipments=a.shipments.map((s,i)=>i===idx?{...s,
  lines:{A:s.units}}:s);
 assert.throws(()=>skuEconomicAuditReadModel({...a,shipments}),
  /expedición no corresponde al pedido completo/);
});
