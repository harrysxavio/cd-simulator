import {i2DemandEventObserved} from './i2-demand-event.js';

const fail=message=>{throw new Error('I2-27: '+message)};
const int=n=>Number.isSafeInteger(n)&&n>=0;
const frozen=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(frozen);
  Object.freeze(value);
 }
 return value;
};
/**
 * Original-case management read model. Inputs are the ONLY allowed sources:
 * the explicitly revealed demand event and the existing canonical physical
 * I2 result with option='wait'. No new simulation, purchases or costs.
 * A pressure signal is evidence of a queue/shortfall, NOT causal attribution.
 */
export function i2ManagementDiagnosis(state,baseline){
 const event=i2DemandEventObserved(state);
 if(!baseline||baseline.scope!=='sku-cohort'||baseline.horizonDays!==12
  ||baseline.option!=='wait'||baseline.seed!==event.missionSeed
  ||baseline.plannedOrders!==event.plannedOrders
  ||baseline.actualOrders!==event.observedOrders
  ||baseline.unknownTotalCost!==true
  ||!int(baseline.baselineShipped)||!int(baseline.baselinePending)
  ||baseline.baselineShipped+baseline.baselinePending!==event.observedOrders
  ||baseline.recoveredOrders!==0||baseline.shippedOrders!==baseline.baselineShipped
  ||baseline.pendingOrders!==baseline.baselinePending
  ||baseline.incrementalExpenseCLP!==0
  ||baseline.commercial?.scope!=='sku-cohort'
  ||baseline.commercial.actualOrders!==event.observedOrders
  ||!int(baseline.commercial.forecastOrders)
  ||baseline.commercial.varianceVsForecastOrders!==event.observedOrders-baseline.commercial.forecastOrders
  ||!int(baseline.commercial.originalCommittedValueCLP)
  ||baseline.commercial.originalCommittedValueCLP!==baseline.committedPurchaseCLP
  ||!baseline.purchasing?.totals||!baseline.receiving?.totals
  ||!baseline.quality?.totals||!baseline.inventory?.totals
  ||!baseline.picking?.totals||!baseline.transport?.totals)
  fail('escenario original, cohorte o demanda no conciliados');
 const {purchasing,receiving,quality,inventory,picking,transport,commercial}=baseline;
 const counts=[
  purchasing.totals.supplierShortfallSkuUnits,purchasing.totals.inTransitSkuUnits,
  receiving.totals.waitingAtCutoffSkuUnits,receiving.totals.peakDockQueueSkuUnits,
  quality.totals.heldAtCutoffSkuUnits,quality.totals.peakHeldSkuUnits,
  inventory.totals.notVerifiableSkuUnits,inventory.totals.reserveSkuUnits,
  picking.totals.neverPreparedOrders,picking.totals.preparedNotDispatchedOrders,
  transport.totals.dispatchedOrders,transport.totals.pendingOrders
 ];
 if(counts.some(n=>!int(n))||transport.totals.dispatchedOrders!==baseline.baselineShipped
  ||transport.totals.pendingOrders!==baseline.baselinePending
  ||picking.totals.requestedOrders!==event.observedOrders
  ||picking.totals.dispatchedOrders!==baseline.baselineShipped
  ||picking.totals.neverPreparedOrders+picking.totals.preparedNotDispatchedOrders
   !==baseline.baselinePending
  ||receiving.totals.receivedSkuUnits!==quality.totals.receivedSkuUnits
  ||inventory.totals.dispatchedSkuUnits!==picking.totals.dispatchedSkuUnits
  ||inventory.totals.dispatchedSkuUnits!==transport.totals.dispatchedSkuUnits
  ||!Number.isFinite(transport.totals.nominalCapacityUsedPercent??0))
  fail('datos de las áreas sin conservación física');
 const forecastGap=event.observedOrders-commercial.forecastOrders;
 const baselineServicePercent=event.observedOrders>0
  ?100*baseline.baselineShipped/event.observedOrders:null;
 const evidence=[
  {
   id:'supply',title:'Compras y abastecimiento',
   value:purchasing.totals.supplierShortfallSkuUnits+purchasing.totals.inTransitSkuUnits,
   unit:'SKU',observed:'Faltante de proveedor + unidades aún en tránsito al cierre',
   source:'purchasing.totals.supplierShortfallSkuUnits + inTransitSkuUnits',
   guidance:'Comprueba SKU y fechas; el faltante de proveedor no demuestra por sí solo qué pedido quedó sin completar.'
  },{
   id:'receiving',title:'Recepción',
   value:receiving.totals.waitingAtCutoffSkuUnits,unit:'SKU',
   observed:'Unidades aún esperando registro al día 12',
   peak:receiving.totals.peakDockQueueSkuUnits,
   source:'receiving.totals.waitingAtCutoffSkuUnits / peakDockQueueSkuUnits',
   guidance:'Una cola en muelle retrasa el proceso; una cola de cero al cierre no descarta retrasos previos.'
  },{
   id:'quality',title:'Calidad',
   value:quality.totals.heldAtCutoffSkuUnits,unit:'SKU',
   observed:'Unidades esperando liberación al día 12',
   peak:quality.totals.peakHeldSkuUnits,
   source:'quality.totals.heldAtCutoffSkuUnits / peakHeldSkuUnits',
   guidance:'Retenido no significa defectuoso, perdido ni merma; las unidades siguen físicamente dentro del CD.'
  },{
   id:'inventory',title:'Inventario',
   value:inventory.totals.notVerifiableSkuUnits,unit:'SKU',
   observed:'Unidades en PICK-FACE pendientes de conciliar',
   source:'inventory.totals.notVerifiableSkuUnits',
   guidance:'Son unidades físicas, no una pérdida; mejorar el registro no crea inventario adicional.'
  },{
   id:'picking',title:'Picking',
   value:picking.totals.neverPreparedOrders,unit:'pedidos',
   observed:'Pedidos que nunca se prepararon completos',
   source:'picking.totals.neverPreparedOrders',
   guidance:'Pueden intervenir mezcla de SKU, stock liberado, capacidad o varios factores; no afirmar un cuello único.'
  },{
   id:'transport',title:'Transporte',
   value:picking.totals.preparedNotDispatchedOrders,unit:'pedidos',
   observed:'Pedidos preparados pero no expedidos al día 12',
   source:'picking.totals.preparedNotDispatchedOrders',
   guidance:'Solo hay una cola física separada cuando el motor usa staging; salida del CD no es entrega al cliente.'
  }
 ];
 const signals=evidence.filter(x=>x.value>0);
 const riskSummary=signals.length
  ?'Se observaron '+signals.length+' tipos de señal en el plan original. Pueden coexistir; no equivalen a '+signals.length+' causas demostradas.'
  :'No se detectan faltantes/colas en estos seis cortes al cierre. Revisa las jornadas anteriores y la composición de SKU antes de atribuir causas.';
 const hypotheses=[
  '¿El pedido quedó incompleto por una línea SKU faltante o porque faltó capacidad de preparación? Revisa BOM y stock liberado antes de contratar más turnos.',
  '¿Aumentar Transporte serviría si casi no hay pedidos preparados? Contrasta preparación y expedición antes de comprar capacidad.',
  '¿El día de llegada de la compra extraordinaria está dentro de las doce jornadas y pueden Recepción y Calidad procesarla a tiempo?'
 ];
 return frozen({
  phase:'post-reveal',scope:'sku-cohort',horizonDays:12,
  mode:'baseline-original-no-recovery',baselineOnly:true,
  headline:'Diagnóstico del plan original, sin recuperación',
  kpis:{
   forecastOrders:commercial.forecastOrders,
   actualOrders:event.observedOrders,forecastVarianceOrders:forecastGap,
   dispatchedOrders:baseline.baselineShipped,pendingOrders:baseline.baselinePending,
   dispatchServicePercent:baselineServicePercent
  },
  queues:{
   waitingReceivingSkuUnits:receiving.totals.waitingAtCutoffSkuUnits,
   peakReceivingSkuUnits:receiving.totals.peakDockQueueSkuUnits,
   heldQualitySkuUnits:quality.totals.heldAtCutoffSkuUnits,
   peakHeldQualitySkuUnits:quality.totals.peakHeldSkuUnits,
   neverPreparedOrders:picking.totals.neverPreparedOrders,
   preparedNotDispatchedOrders:picking.totals.preparedNotDispatchedOrders
  },
  economics:{
   originalPurchaseCommitmentCLP:commercial.originalCommittedValueCLP,
   incrementalExpenseCLP:0,
   totalOperatingCostCLP:null,
   boundary:'La orden original es un compromiso CLP, no pago ni costo operativo total. Esta lectura aún NO incluye una intervención.'
  },
  evidence,signals:signals.map(x=>x.id),riskSummary,hypotheses,
  coach:{
   observation:'En la muestra de '+event.observedOrders+' pedidos, el plan original expidió '+baseline.baselineShipped+' y dejó '+baseline.baselinePending+' pendientes al cierre.',
   analysis:'Primero identifica dónde hay unidades y pedidos detenidos y contrasta el pronóstico con la demanda real. Estas señales no prueban qué inversión recuperará más pedidos.',
   consumer:'La cifra indica salida del CD, no la entrega final al consumidor. Una espera interna puede afectar la promesa, pero no contamos entregas efectivas.'
  },
  sources:'i2DemandEventObserved; i2MvpPhysicalResult(option=wait): commercial,purchasing,receiving,quality,inventory,picking,transport, baselineShipped y baselinePending',
  boundary:'Todos los datos físicos son del escenario original SIN recuperación. No sumar unidades SKU con pedidos ni valores CLP. La atribución causal, costo total, productividad por persona-hora y entrega al consumidor no están demostrados.'
 });
}
