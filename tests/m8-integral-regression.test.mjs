// M8-39: matriz de cierre sin alterar el motor productivo.
// Cada perfil usa la MISMA campaña congelada para comparar cinco decisiones.
// Ejecutar: node --experimental-default-type=module --test tests/m8-integral-regression.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveryBaseline} from '../src/recovery-baseline.js';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {skuAudit} from '../src/audit.js';

const OPTIONS=['wait','reserve','overtime','emergency','combined'];
const BASE={policy:'service',plannedOrders:200,actualOrders:280,days:12,
 plannedForecastPercent:80,planningCoveragePercent:70,urgentArrivalDay:2,
 purchaseCoveragePercent:100,reservePercent:20};

// Casos extremos reproducibles, con perturbaciones independientes.
// Evitar valores aleatorios: cualquier fallo debe poder repetirse en GitHub Actions.
const SCENARIOS=[
 {id:'surprise-up',changes:{}},
 {id:'surprise-down',changes:{actualOrders:120,plannedForecastPercent:100,
  planningCoveragePercent:100}},
 {id:'supplier-shortfall',changes:{actualOrders:260,receivingUnitCapacity:20,
  supplierFill:{A:60,B:75,C:80},qualityReleasePercent:50}},
 {id:'quality-quarantine',changes:{actualOrders:240,qualityReleasePercent:0,days:4}},
 {id:'inventory-unverified',changes:{actualOrders:200,inventoryAccuracyPercent:0,days:4}},
 {id:'no-supply-or-receiving',changes:{days:3,stock:{A:0,B:0,C:0},
  supplierFill:{A:0,B:0,C:0},receivingUnitCapacity:0}},
 {id:'staging-truck-blocked',changes:{actualOrders:300,days:3,
  separateTransport:true,transportUnitCapacity:0,pickingUnitCapacity:1000}},
 {id:'urgency-after-horizon',changes:{urgentArrivalDay:13,days:12}}
];

test('M8-39: matriz completa reconcilia decisiones, órdenes, eventos y CLP sin inventar caja',()=>{
 let checked=0;
 for(const {id,changes} of SCENARIOS){
  const params={...BASE,...changes};
  const baseline=createRecoveryBaseline(params);
  let originalPO=null;
  for(const option of OPTIONS){
   const input={...params,option,baselineSnapshot:baseline};
   const comparison=recoveryComparison(input);
   const campaign=campaignSnapshot({comparison,campaignId:'M8-39-'+id+'-'+option,
    plannedOrders:params.plannedOrders});
   const check=skuAudit({...input,comparisonResult:comparison});
   const name=id+'/'+option;

   // Una misma base y el mismo compromiso original para las cinco opciones.
   assert.equal(comparison.baselineKey,baseline.scenarioKey,name);
   if(originalPO===null)originalPO=comparison.originalPurchaseOrders;
   else assert.deepEqual(comparison.originalPurchaseOrders,originalPO,name+' PO inicial');
   assert.equal(campaign.passed,true,name+' '+JSON.stringify(campaign.checks));
   assert.equal(check.passed,true,name+' '+JSON.stringify(check.checks));
   assert.equal(campaign.scope,'sku-cohort',name);

   // Unidades físicas por SKU NO son pedidos completos: conciliar por separado.
   assert.equal(campaign.orders.length,params.actualOrders,name);
   assert.equal(campaign.orders.length,campaign.shipments.length+
    campaign.orders.filter(o=>o.status!=='shipped').length,name);
   assert.equal(campaign.shipments.length,comparison.recovered.completed,name);
   assert.equal(comparison.recovered.pending+comparison.recovered.completed,
    params.actualOrders,name);
   assert.ok(campaign.inventory.bySku.every(s=>s.available>=0&&s.held>=0&&
    s.reserved>=0&&s.staged>=0&&
    s.opening+s.received===s.dispatched+s.held+s.reserved+s.available+s.staged),name);
   const poById=new Map(campaign.purchaseOrders.map(p=>[p.id,p]));
   assert.ok(campaign.receipts.every(r=>poById.has(r.purchaseOrderId)&&
    r.day>=poById.get(r.purchaseOrderId).expectedArrivalDay),name+' fecha recepción');
   assert.ok(campaign.shipments.every(s=>campaign.orders.some(o=>
    o.id===s.orderId&&o.pickedDay<=s.day&&o.shippedDay===s.day)),name);

   // Valorización: apertura + entradas = salida + cierre; nunca mezclar caja real.
   const v=campaign.inventoryValuation.totals,a=campaign.economicAudit;
   assert.equal(v.openingCLP+v.receivedToDateCLP,
    v.shippedToDateCLP+v.closingPhysicalCLP,name+' balance CLP');
   assert.equal(a.passed,true,name);
   assert.equal(a.totals.completeShipments,campaign.shipments.length,name);
   assert.equal(a.totals.partialContributionCLP,
    a.totals.potentialDispatchValueCLP-a.totals.dispatchedMaterialsCLP-
    a.totals.deployedReinforcementCLP,name);
   assert.equal(a.actualInvoicedSalesCLP,null,name);
   assert.equal(a.actualCustomerCashCLP,null,name);
   assert.equal(a.actualSupplierCashCLP,null,name);
   assert.equal(a.actualNetProfitCLP,null,name);
   assert.ok(Object.isFrozen(campaign)&&Object.isFrozen(campaign.orders),name);

   // Ejecución repetida produce EXACTAMENTE los mismos movimientos físicos.
   const repeated=recoveryComparison(input);
   assert.deepEqual(repeated.recovered.ledger,comparison.recovered.ledger,
    name+' simulación no determinista');
   checked++;
  }
 }
 assert.equal(checked,SCENARIOS.length*OPTIONS.length);
});

test('M8-39: compra posterior al corte implica compromiso, nunca expedición anticipada',()=>{
 const inputs={...BASE,days:3,actualOrders:280,stock:{A:0,B:0,C:0},
  supplierFill:{A:0,B:0,C:0},urgentArrivalDay:13};
 const base=createRecoveryBaseline(inputs);
 const wait=recoveryComparison({...inputs,option:'wait',baselineSnapshot:base});
 const urgent=recoveryComparison({...inputs,option:'emergency',baselineSnapshot:base});
 assert.ok(urgent.urgentBase>0,'Debe existir compra extraordinaria');
 assert.equal(urgent.recovered.completed,wait.recovered.completed);
 assert.equal(urgent.recovered.pending,wait.recovered.pending);
 assert.ok(urgent.recovered.ledger.every(d=>
  Object.values(d.receivedUrgent).every(q=>q===0)),'Llegada fuera de plazo');
 assert.ok(urgent.incrementalExpense>0,'La PO no desaparece por llegar tarde');
 const campaign=campaignSnapshot({comparison:urgent,plannedOrders:200});
 assert.equal(campaign.economicAudit.actualSupplierCashCLP,null);
 assert.equal(campaign.economicAudit.totals.completeShipments,0);
});

test('M8-39: preparación sin capacidad de transporte no es despacho ni venta',()=>{
 const inputs={...BASE,days:3,actualOrders:300,separateTransport:true,
  pickingUnitCapacity:1000,transportUnitCapacity:0};
 const c=recoveryComparison({...inputs,option:'combined'});
 const snap=campaignSnapshot({comparison:c,plannedOrders:200});
 assert.equal(snap.passed,true);
 assert.ok(snap.picks.length>0,'Debe existir picking efectivo');
 assert.equal(snap.shipments.length,0,'No hay salida física desde el CD');
 assert.equal(snap.economicAudit.totals.potentialDispatchValueCLP,0);
 assert.equal(snap.economicAudit.actualInvoicedSalesCLP,null);
});

test('M8-39: baseline de otro escenario no puede reutilizarse silenciosamente',()=>{
 const a={...BASE,actualOrders:280},b={...BASE,actualOrders:120};
 const snapshot=createRecoveryBaseline(a);
 assert.throws(()=>recoveryComparison({...b,option:'wait',baselineSnapshot:snapshot}),
  /baseline|base|escenario|campaña|contrato|replay|coincide|incompatible|no corresponde/i);
});
