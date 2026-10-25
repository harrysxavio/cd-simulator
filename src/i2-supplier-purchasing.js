import {NODES} from './engine.js';
import {flow} from './flow.js';
import {DEFAULT_SCENARIO} from './scenario.js';
import {SKU_CATALOG} from './sku.js';
import {normalizeI2GameState} from './i2-game-state.js';
import {i2PlanningCoveragePreview} from './i2-planning-coverage.js';
import {supplierOrderLedger} from './supplier-ledger.js';

const PURCHASING=NODES.find(a=>a.id==='purchasing');
const freezeDeep=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  for(const value of Object.values(x))freezeDeep(value);
  Object.freeze(x);
 }
 return x;
};
const sum=(rows,key)=>rows.reduce((n,row)=>n+row[key],0);

/**
 * I2-20: the chosen supplier's FILL assumption applies to frozen original
 * purchasing quantities, not stock, warehouse receipts or delivered orders.
 * No seed, no actual demand, no physical replay before the explicit reveal.
 */
export function i2SupplierCommitmentPreview(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='area'||state.index!==2||state.reveal
  ||!state.confirmedAreas.includes('commercial')
  ||!state.confirmedAreas.includes('planning'))
  throw new Error('I2-20: Compras requiere Comercial y Planificación confirmadas');
 const choice=PURCHASING.choices.find(c=>c.id===state.choices.purchasing);
 if(!choice||!Number.isSafeInteger(choice.delivery)||choice.delivery<0||choice.delivery>100)
  throw new Error('I2-20: supuesto de proveedor inválido');
 // Reuse the same projection as I2-19; changing index is a READ-ONLY
 // calculation and does not confirm, edit or save a decision.
 const planning=i2PlanningCoveragePreview({...state,index:1});
 // Campaign adapter also translates a whole-unit legacy delivery rate into
 // a physical SKU fill percentage. Never infer it from the displayed 75/95/100.
 // Freeze the aggregate proxy at PLANNED demand; no observed shock enters.
 const aggregate=flow(state.choices,{},
  {...DEFAULT_SCENARIO,demand:1000,actualDemand:1000,lockUpstream:true});
 const effectiveRate=aggregate.ordered>0
  ?100*aggregate.delivered/aggregate.ordered:choice.delivery;
 const rows=planning.rows.map((row,i)=>{
  const sku=SKU_CATALOG[i];
  if(sku.id!==row.skuId)throw new Error('I2-20: SKU de compra incompatible');
  const committed=row.plannedPurchaseSkuUnits;
  const fulfilled=Math.floor(committed*effectiveRate/100);
  return {
   skuId:sku.id,orderedSkuUnits:committed,
   modeledSupplierFulfilledSkuUnits:fulfilled,
   modeledSupplierShortfallSkuUnits:committed-fulfilled,
   standardLeadDays:sku.leadDays,committedValueCLP:row.commitmentCLP
  };
 });
 return freezeDeep({
  phase:'pre-reveal',scope:'sku-cohort',status:'supplier-assumptions-only',
  supplier:choice.id,supplierFillPercent:choice.delivery,
  effectiveSkuFillPercent:effectiveRate,
  originalCommittedSkuUnits:sum(rows,'orderedSkuUnits'),
  modeledSupplierFulfilledSkuUnits:sum(rows,'modeledSupplierFulfilledSkuUnits'),
  modeledSupplierShortfallSkuUnits:sum(rows,'modeledSupplierShortfallSkuUnits'),
  originalCommittedValueCLP:sum(rows,'committedValueCLP'),
  rows,
  lesson:choice.id==='cheap'
   ?'Precio atractivo no equivale a cumplimiento: un faltante de proveedor puede dejar pedidos incompletos.'
   :choice.id==='reliable'
   ?'Mayor cumplimiento supuesto reduce faltantes, pero la fecha de llegada y Recepción siguen importando.'
   :'El 100 % supuesto de cumplimiento NO convierte entregas en stock disponible hoy; los plazos nominales permanecen.',
  source:'NODES.purchasing.delivery, flow de V1 con demanda planeada y campaña bloqueada, i2PlanningCoveragePreview y Math.floor de deliveryTimeline',
  boundary:'Cantidades modeladas de proveedor, NO entrega observada, recibo físico, stock usable, factura, pago ni expedición.'
 });
}

/**
 * Post-reveal state from the canonical baseline events and supplier ledger.
 * NEVER count an urgent recovery PO as an original purchasing commitment.
 */
export function i2SupplierOutcomeReading(comparison){
 if(!comparison||!Array.isArray(comparison.originalPurchaseOrders?.rows)
  ||!Array.isArray(comparison.base?.ledger)
  ||comparison.base.days!==12)
  throw new Error('I2-20: escenario físico original no disponible');
 const purchases=comparison.originalPurchaseOrders.rows;
 const receipts=comparison.base.ledger.flatMap(day=>
  day.receiptEvents.filter(e=>!e.urgent).map(e=>({
   id:'RCP-'+e.lotId,lotId:e.lotId,day:e.day,skuId:e.skuId,
   purchaseOrderId:e.purchaseOrderId,qty:e.qty
  }))
 );
 const ledger=supplierOrderLedger({purchaseOrders:purchases,receipts,horizonDays:12});
 const original=ledger.rows.filter(row=>row.source==='original');
 if(original.length!==SKU_CATALOG.length
  ||sum(original,'orderedSkuUnits')!==comparison.planningCommitment.totalCommittedSkuUnits
  ||sum(original,'receivedAtWarehouseSkuUnits')+sum(original,'awaitingWarehouseReceiptSkuUnits')
    !==sum(original,'arrivedByCutoffSkuUnits'))
  throw new Error('I2-20: proveedor original no concilia con compras/recepciones');
 const rows=original.map(row=>({
  skuId:row.skuId,orderedSkuUnits:row.orderedSkuUnits,
  fulfilledSkuUnits:row.supplierFulfilledSkuUnits,
  supplierShortfallSkuUnits:row.supplierShortfallSkuUnits,
  modeledArrivalDay:row.modeledArrivalDay,
  arrivedByCutoffSkuUnits:row.arrivedByCutoffSkuUnits,
  inTransitSkuUnits:row.inTransitSkuUnits,
  warehouseReceivedSkuUnits:row.receivedAtWarehouseSkuUnits,
  waitingWarehouseSkuUnits:row.awaitingWarehouseReceiptSkuUnits
 }));
 return freezeDeep({
  scope:'sku-cohort',phase:'post-reveal',horizonDays:12,
  rows,totals:{
   orderedSkuUnits:sum(rows,'orderedSkuUnits'),
   fulfilledSkuUnits:sum(rows,'fulfilledSkuUnits'),
   supplierShortfallSkuUnits:sum(rows,'supplierShortfallSkuUnits'),
   arrivedByCutoffSkuUnits:sum(rows,'arrivedByCutoffSkuUnits'),
   inTransitSkuUnits:sum(rows,'inTransitSkuUnits'),
   warehouseReceivedSkuUnits:sum(rows,'warehouseReceivedSkuUnits'),
   waitingWarehouseSkuUnits:sum(rows,'waitingWarehouseSkuUnits')
  },
  source:'supplierOrderLedger + PO originales + receiptEvents físicos del escenario sin intervención',
  boundary:'Compromiso y cumplimiento del proveedor no prueban ingreso a bodega. Recepción, liberación de calidad y picking son eventos independientes. La recuperación urgente no reescribe órdenes originales.'
 });
}
