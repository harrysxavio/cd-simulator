import {recoveryComparison} from './recovery.js';
import {skuProcurementReconciliation} from './sku-procurement.js';
import {campaignSnapshot} from './campaign.js';

/** Trace a single SKU intervention through purchasing, receiving, inventory and picking.
 * The aggregate eight-area campaign is intentionally not altered by this pilot.
 */
export function supplyBridge({policy='balanced',plannedOrders=200,actualOrders=200,delayDays={},supplierFill={},option='wait',urgentArrivalDay=1,purchaseCoveragePercent=100,receivingUnitCapacity=null,pickingUnitCapacity=null,transportUnitCapacity=null,qualityReleasePercent=100,inventoryAccuracyPercent=100,plannedForecastPercent=100,planningCoveragePercent=100,campaignId='SKU-LAB',comparisonResult=null,reservePercent=0}={}){
 if(comparisonResult&&(comparisonResult.option!==option||comparisonResult.recovered?.orders!==actualOrders||comparisonResult.urgentArrivalDay!==urgentArrivalDay||comparisonResult.purchaseCoveragePercent!==purchaseCoveragePercent))throw new Error('Comparación SKU no coincide con el escenario');
 const result=comparisonResult??recoveryComparison({policy,plannedOrders,actualOrders,delayDays,supplierFill,option,urgentArrivalDay,purchaseCoveragePercent,qualityReleasePercent,inventoryAccuracyPercent,receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity,plannedForecastPercent,planningCoveragePercent,reservePercent});
 const arrival=Object.fromEntries(result.urgent.map(x=>[x.id,x.day]));
 const procurementLedger=skuProcurementReconciliation(result);
 const campaign=campaignSnapshot({comparison:result,campaignId,plannedOrders});
 const receipts=result.recovered.ledger.map(day=>({
  day:day.day,received:{...day.received},released:{...day.released},waitingQuality:day.waitingQuality,receivedUrgent:{...day.receivedUrgent},waitingReceiving:day.waitingReceiving,shipped:day.shipped,shippedUnits:day.shippedUnits,
  completed:day.completed,pending:day.backlog,stock:{...day.stock},reserveStock:{...day.reserveStock},movedReserve:{...day.movedReserve},pickableStock:{...day.pickableStock},unverifiedStock:{...day.unverifiedStock}
 }));
 const actuallyReceivedExtra=result.recovered.ledger.reduce((total,day)=>total+Object.values(day.receivedUrgent).reduce((n,qty)=>n+qty,0),0);
 const unreceivedExtra=result.urgent.reduce((total,x)=>total+x.qty,0)-actuallyReceivedExtra;
 const improvement=result.recovered.completed-result.base.completed;
 const effectiveReceiptDays=result.recovered.ledger.filter(d=>Object.values(d.receivedUrgent).some(q=>q>0)).map(d=>d.day);
 const firstUrgentReceiptDay=effectiveReceiptDays.length?Math.min(...effectiveReceiptDays):null;
 const extraUnits=result.urgent.reduce((sum,x)=>sum+x.qty,0);
 const urgentSpent=result.urgentBase+result.urgentSurcharge;
 const serviceGain=improvement>0;
 const advice=extraUnits===0
  ? (['wait','overtime'].includes(option)||purchaseCoveragePercent===0)?'No hay compra urgente solicitada. Para evaluar reposición, selecciona compra urgente y una cobertura superior a 0 %.':'El inventario disponible y las compras comprometidas cubren el faltante calculado: no se requiere compra urgente.'
  : !firstUrgentReceiptDay
   ? (urgentArrivalDay>result.recovered.days?'La compra llega después del horizonte: compromete caja sin recuperar pedidos dentro de los 12 días.':'La compra llega al proveedor/CD, pero la capacidad de Recepción no permite ingresar el stock a tiempo: no se recuperan pedidos.')
   : !serviceGain
    ? 'La compra llega dentro del horizonte, pero no recupera pedidos: revisa capacidad de picking, mezcla de SKU y otras restricciones.'
    : 'La reposición llega a tiempo y recupera '+improvement+' pedidos completos. Contrasta su costo incremental con el beneficio obtenido.';
 const decisionQuality=extraUnits===0?((['wait','overtime'].includes(option)||purchaseCoveragePercent===0)?'no-order':'no-shortage'):!firstUrgentReceiptDay?(urgentArrivalDay>result.recovered.days?'late':'receiving-blocked'):!serviceGain?'no-gain':'effective';
 return {
  option,label:result.label,plannedOrders,actualOrders,urgentArrivalDay,purchaseCoveragePercent,
  decision:{quality:decisionQuality,advice,firstUrgentReceiptDay,serviceGain,extraUnits,urgentSpent,purchaseCoveragePercent},
  purchasing:{plannedForecastPercent,planningCoveragePercent,forecastOrders:result.forecastOrders,originalPurchase:{...result.originalPurchase},supplierFill,originalOrdered:result.recovered.deliveries.reduce((n,x)=>n+x.ordered,0),originalDelivered:result.recovered.deliveries.reduce((n,x)=>n+x.received,0),originalUnfilled:result.recovered.deliveries.reduce((n,x)=>n+x.unreceived,0),committedValue:result.committedPurchaseValue,extraUnits:result.urgent.reduce((sum,x)=>sum+x.qty,0),extraCost:result.urgentBase+result.urgentSurcharge,orders:result.urgent.map(x=>({...x}))},
  receiving:{arrivals:arrival,receivedExtraUnits:actuallyReceivedExtra,outsideHorizonUnits:unreceivedExtra,waitingReceiving:result.recovered.waitingReceiving,unitCapacity:receivingUnitCapacity},
  quality:{releasePercent:qualityReleasePercent,waiting:result.recovered.waitingQuality,heldBySku:{...result.recovered.heldQuality}},
  inventory:{accuracyPercent:result.recovered.inventoryAccuracyPercent,initial:{...result.recovered.initial},openingReserve:{...result.recovered.openingReserve},reserved:{...result.recovered.endingReserveStock},ending:{...result.recovered.endingStock},pickable:{...result.recovered.endingPickableStock},unverified:{...result.recovered.endingUnverifiedStock},consumed:{...result.recovered.consumed}},
  picking:{completed:result.recovered.completed,pending:result.recovered.pending,improvement,unitCapacity:pickingUnitCapacity,transportUnitCapacity},
  finance:{incrementalExpense:result.incrementalExpense,incrementalCash:result.netCashDelta,economicProxy:result.economicProxyDelta},
  receipts,procurementLedger,campaign,assumptions:'Trazabilidad SKU didáctica: compras → recepción limitada por capacidad → liberación gradual de Calidad → stock físico (verificado/no verificable) → picking y transporte limitados por unidades SKU. Las capacidades diarias pueden provenir del motor agregado, pero los costos siguen separados.'
 };
}
