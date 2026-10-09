import {recoveryComparison} from './recovery.js';
import {campaignSnapshot} from './campaign.js';

// U2a: the management decision is an explicit, frozen simulation commitment,
// not a monetary payment nor a supplier-confirmed real-world purchase.
// The replay is the same event ledger used by purchase/receipt/Quality/shipment.
export const DECISION_OPTIONS=Object.freeze(['wait','emergency','reserve']);
const freezeDeep=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const item of Object.values(value))freezeDeep(item);
  Object.freeze(value);
 }
 return value;
};
export function skuDecisionSignature({campaignId,skuInputs}={}){
 if(typeof campaignId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(campaignId))throw new Error('Campaña SKU inválida');
 if(!skuInputs||typeof skuInputs!=='object'||!Number.isSafeInteger(skuInputs.actualOrders)||skuInputs.actualOrders<1)throw new Error('Contrato SKU inválido');
 return JSON.stringify({campaignId,skuInputs});
}
export function createSkuRecoveryDecision({campaignId,skuInputs,option='wait',urgentArrivalDay=1,purchaseCoveragePercent=100,comparisonResult=null}={}){
 if(!DECISION_OPTIONS.includes(option))throw new Error('Acción de recuperación aún no soportada en U2');
 const signature=skuDecisionSignature({campaignId,skuInputs});
 const comparison=comparisonResult??recoveryComparison({...skuInputs,option,urgentArrivalDay,purchaseCoveragePercent});
 if(comparison.option!==option||comparison.urgentArrivalDay!==urgentArrivalDay||comparison.purchaseCoveragePercent!==purchaseCoveragePercent||
 comparison.recovered?.orders!==skuInputs.actualOrders||comparison.integrated?.plannedOrders!==skuInputs.plannedOrders)throw new Error('Vista previa SKU diferente de la decisión');
 const snapshot=campaignSnapshot({comparison,campaignId,plannedOrders:skuInputs.plannedOrders});
 if(!snapshot.passed)throw new Error('La campaña SKU no supera la conservación física');
 const urgentPurchaseOrders=snapshot.purchaseOrders.filter(po=>po.source==='urgent').map(po=>({
  id:campaignId+'-'+po.id,
  eventPurchaseOrderId:po.id,
  skuId:po.skuId,
  quantity:po.orderedQty,
  unitCostCLP:po.unitCost,
  expectedArrivalDay:po.expectedArrivalDay,
  orderCommitmentCLP:po.orderedQty*po.unitCost,
  supplier:'Proveedor extraordinario hipotético — no confirmado',
  status:'comprometida en simulación'
 }));
 const reserveTransfers=snapshot.reserveTransfers.map(move=>({...move,from:'RESERVA-CD',to:'PICK-FACE'}));
 const totalUrgent=urgentPurchaseOrders.reduce((n,p)=>n+p.quantity,0);
 const receivedUrgent=snapshot.receipts.filter(r=>urgentPurchaseOrders.some(p=>p.eventPurchaseOrderId===r.purchaseOrderId));
 const receivedUnits=receivedUrgent.reduce((n,r)=>n+r.qty,0);
 if(option!=='emergency'&&(totalUrgent||receivedUnits))throw new Error('Una acción interna o espera no puede contener una compra extraordinaria');
 if(option!=='reserve'&&reserveTransfers.length)throw new Error('Solo la habilitación de reserva puede generar traslados internos');
 if(option==='emergency'&&totalUrgent!==comparison.urgent.reduce((n,p)=>n+p.qty,0))throw new Error('Cantidades de compra extraordinaria incoherentes');
 const extraOrdersCompleted=comparison.recovered.completed-comparison.base.completed;
 return freezeDeep({
  version:1,scope:'sku-cohort',status:'confirmed-in-simulator',campaignId,scenarioSignature:signature,
  action:option==='wait'?'wait-without-purchase':option==='reserve'?'release-on-site-reserve':'extraordinary-purchase',option,urgentArrivalDay,purchaseCoveragePercent,reservePercent:skuInputs.reservePercent??0,
  originalPurchase:{...comparison.originalPurchase},
  urgentPurchaseOrders,reserveTransfers,
  releasedReserveUnits:reserveTransfers.reduce((n,r)=>n+r.qty,0),
  firstReserveTransferDay:reserveTransfers.length?Math.min(...reserveTransfers.map(x=>x.day)):null,
  openingReserve:{...snapshot.inventory.openingReserve},closingReserve:{...snapshot.inventory.closingReserved},
  orderedExtraUnits:totalUrgent,receivedExtraUnits:receivedUnits,
  urgentOrderCommitmentCLP:comparison.urgentBase+comparison.urgentSurcharge,
  urgentSurchargeCLP:comparison.urgentSurcharge,
  operationalReinforcementCLP:comparison.extraLabor,
  completedBefore:comparison.base.completed,completedAfter:comparison.recovered.completed,
  pendingBefore:comparison.base.pending,pendingAfter:comparison.recovered.pending,
  recoveredOrders:extraOrdersCompleted,horizonDays:comparison.recovered.days,
  firstReceivedDay:receivedUrgent.length?Math.min(...receivedUrgent.map(x=>x.day)):null,
  note:'Confirmación pedagógica dentro de la campaña SKU: proveedor y fecha son supuestos; no se ha pagado ni emitido una orden real. No modifica el resultado agregado de una jornada.'
 });
}
export function skuDecisionStatus({decision,contract}={}){
 if(!decision)return 'none';
 if(!decision||decision.version!==1||decision.status!=='confirmed-in-simulator'||!DECISION_OPTIONS.includes(decision.option))return 'invalid';
 let signature;
 try{signature=skuDecisionSignature({campaignId:contract?.campaignId,skuInputs:contract?.skuInputs});}catch{return 'invalid'}
 if(decision.campaignId!==contract.campaignId||decision.scenarioSignature!==signature)return 'stale';
 if(!Number.isSafeInteger(decision.orderedExtraUnits)||decision.orderedExtraUnits<0||
  !Array.isArray(decision.urgentPurchaseOrders)||!Number.isSafeInteger(decision.completedAfter)||
  !Number.isSafeInteger(decision.pendingAfter)||!Number.isSafeInteger(decision.urgentArrivalDay)||
  !Number.isInteger(decision.purchaseCoveragePercent)||!Number.isFinite(decision.urgentOrderCommitmentCLP)||
  decision.urgentOrderCommitmentCLP<0)return 'invalid';
 if(decision.option!=='emergency'&&decision.urgentPurchaseOrders.length)return 'invalid';
 if(decision.reserveTransfers!==undefined&&(!Array.isArray(decision.reserveTransfers)||decision.reserveTransfers.some(x=>!Number.isSafeInteger(x.qty)||x.qty<1)))return 'invalid';
 return 'current';
}
