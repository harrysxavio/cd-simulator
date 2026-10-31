import {SKU_COST_DEFAULTS} from './sku-cost-catalog.js';
import {operationalCapacityCostReadModel} from './sku-operational-cost.js';
import {createRecoveryBaseline,assertRecoveryBaseline} from './recovery-baseline.js';
import {waitWithoutInterventionReadModel} from './recovery-wait.js';
import {eventSimulation} from './events.js';
import {SKU_CATALOG,ORDER_TEMPLATES} from './sku.js';
import {assertFrozenOriginalPurchases} from './original-purchase.js';

export const RECOVERY_OPTIONS={
 wait:{label:'Aceptar espera',extraCapacity:0,urgent:false},
 overtime:{label:'Refuerzo operativo',extraCapacity:80,urgent:false},
 reserve:{label:'Habilitar reserva ubicada',extraCapacity:0,urgent:false,releaseReserve:true},
 emergency:{label:'Compra urgente SKU',extraCapacity:0,urgent:true},
 combined:{label:'Compra urgente + refuerzo',extraCapacity:80,urgent:true}
};
/** Incremental, illustrative recovery comparison. Extra purchases arrive day 1.
 * A user-selected fraction of physical SKU shortages is bought, not the full gross demand.
 * Cash and economic contribution are distinct; sunk planned procurement is unchanged.
 * Reserve reallocation is a dated internal movement of catalog opening stock,
 * not new stock or a supplier receipt. No movement is modeled without stock.
 */
export function recoveryComparison({policy='service',plannedOrders=200,actualOrders=260,delayDays={},supplierFill={},dailyCapacity=200,days=12,receivingUnitCapacity=null,pickingUnitCapacity=null,transportUnitCapacity=null,qualityReleasePercent=100,inventoryAccuracyPercent=100,option='wait',unitRevenue=SKU_COST_DEFAULTS.recovery.revenueCLPPerShippedOrder,emergencySurchargeRate=SKU_COST_DEFAULTS.recovery.urgentSurchargeRate,extraCapacityDailyCost=SKU_COST_DEFAULTS.recovery.addedCapacityCLPPerDay,latePenaltyPerOrderDay=SKU_COST_DEFAULTS.recovery.backlogPenaltyCLPPerOrderDay,holdingRatePerDay=SKU_COST_DEFAULTS.recovery.holdingFractionPerCLPDay,urgentArrivalDay=1,purchaseCoveragePercent=100,plannedForecastPercent=100,planningCoveragePercent=100,stock=null,reservePercent=0,separateTransport=false,baselineSnapshot=null,multiActions=null,operationalEvents=[]}={}){
 if(typeof separateTransport!=='boolean')throw new Error('Modo staging inválido');
 // Modo interno I2: no modificar el catálogo público de las 5 recuperaciones V1.
 const choice=option==='multi'?{label:'Intervenciones conjuntas auditadas',extraCapacity:0,urgent:false}:RECOVERY_OPTIONS[option];
 if(!choice)throw new Error('Recuperación desconocida');
 // Additive interface: existing V1 options retain precisely their behavior.
 if((option==='multi')!==(multiActions!==null))
  throw new Error('Multiacción SKU exige un contrato explícito y exclusivo');
 if(multiActions!==null&&(
  !multiActions||typeof multiActions!=='object'||Array.isArray(multiActions)
  ||Object.keys(multiActions).sort().join(',')!=='capacityBoost,reserveTransfer,urgentPurchase'
  ||!multiActions.urgentPurchase||typeof multiActions.urgentPurchase!=='object'
  ||Object.keys(multiActions.urgentPurchase).sort().join(',')!=='arrivalDay,coveragePercent,enabled'
  ||!multiActions.reserveTransfer||typeof multiActions.reserveTransfer!=='object'
  ||Object.keys(multiActions.reserveTransfer).sort().join(',')!=='enabled,releaseDay'
  ||!multiActions.capacityBoost||typeof multiActions.capacityBoost!=='object'
  ||Object.keys(multiActions.capacityBoost).join(',')!=='enabled'
  ||[multiActions.urgentPurchase.enabled,multiActions.reserveTransfer.enabled,
      multiActions.capacityBoost.enabled].some(flag=>typeof flag!=='boolean')
  ||!Number.isSafeInteger(multiActions.urgentPurchase.arrivalDay)
  ||multiActions.urgentPurchase.arrivalDay<1||multiActions.urgentPurchase.arrivalDay>365
  ||!Number.isSafeInteger(multiActions.urgentPurchase.coveragePercent)
  ||multiActions.urgentPurchase.coveragePercent<0||multiActions.urgentPurchase.coveragePercent>100
  ||!Number.isSafeInteger(multiActions.reserveTransfer.releaseDay)
  ||multiActions.reserveTransfer.releaseDay<1||multiActions.reserveTransfer.releaseDay>365
 ))throw new Error('Contrato de palancas múltiples inválido');
 const effective=multiActions===null?choice:{
  urgent:multiActions.urgentPurchase.enabled,
  extraCapacity:multiActions.capacityBoost.enabled?80:0,
  releaseReserve:multiActions.reserveTransfer.enabled
 };
 const effectiveArrivalDay=multiActions?.urgentPurchase.arrivalDay??urgentArrivalDay;
 const effectiveCoveragePercent=multiActions?.urgentPurchase.coveragePercent??purchaseCoveragePercent;
 const effectiveReserveDay=multiActions?.reserveTransfer.releaseDay??urgentArrivalDay;
 if(!Number.isInteger(urgentArrivalDay)||urgentArrivalDay<1||urgentArrivalDay>365)throw new Error('Plazo de reposición urgente inválido');
 if(!Number.isInteger(purchaseCoveragePercent)||purchaseCoveragePercent<0||purchaseCoveragePercent>100)throw new Error('Cobertura de compra urgente inválida');
 if(!Number.isInteger(reservePercent)||reservePercent<0||reservePercent>50)throw new Error('Porcentaje de reserva ubicada inválido');
 if(!Number.isFinite(unitRevenue)||unitRevenue<0||!Number.isFinite(emergencySurchargeRate)||emergencySurchargeRate<0||!Number.isFinite(extraCapacityDailyCost)||extraCapacityDailyCost<0||!Number.isFinite(latePenaltyPerOrderDay)||latePenaltyPerOrderDay<0||!Number.isFinite(holdingRatePerDay)||holdingRatePerDay<0)throw new Error('Costos de recuperación inválidos');
 // Every option consumes exactly the SAME immutable, pre-intervention
 // planning manifest and revealed-demand "do nothing" replay.
 const baselineInputs={policy,plannedOrders,actualOrders,delayDays,supplierFill,
  dailyCapacity,days,qualityReleasePercent,inventoryAccuracyPercent,
  receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity,
  plannedForecastPercent,planningCoveragePercent,stock,reservePercent,separateTransport,operationalEvents};
 const baseline=baselineSnapshot===null?createRecoveryBaseline(baselineInputs)
  :assertRecoveryBaseline(baselineSnapshot,baselineInputs);
 const openingState=baseline.openingState;
 const openingStock=openingState.openingBySku;
 const reserveStock=openingState.reserveBySku;
 const base=baseline.integrated;
 const urgent=[];
 if(effective.urgent){
  // Calculate unmet BOM demand from actual orders minus stock and original purchases.
  const split=ORDER_TEMPLATES.map((t,i)=>{const exact=actualOrders*t.share/100;return {i,t,count:Math.floor(exact),rem:exact%1}});
  let left=actualOrders-split.reduce((n,x)=>n+x.count,0);
  for(const x of [...split].sort((a,b)=>b.rem-a.rem||a.i-b.i)){if(left--<=0)break;x.count++}
  const demand=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,0]));
  for(const x of split)for(const [id,qty] of Object.entries(x.t.lines))demand[id]+=x.count*qty;
  for(const p of SKU_CATALOG){
   // Supplier shortfills are never counted as available material.
   const ordinaryDelivered=base.actual.deliveries.find(d=>d.id===p.id).received;
   const supply=base.actual.initial[p.id]+ordinaryDelivered;
   const shortage=Math.max(0,demand[p.id]-supply);
   const qty=Math.ceil(shortage*effectiveCoveragePercent/100);
   if(qty)urgent.push({id:p.id,qty,day:effectiveArrivalDay,unitCost:p.unitCost});
  }
 }
 if(option==='multi'&&effective.releaseReserve&&baseline.openingState.totals.reserveSkuUnits===0)
  throw new Error('No existe reserva física SKU habilitable en el escenario original');
 const capacity=dailyCapacity+effective.extraCapacity;
 // Waiting makes NO intervention: reuse the exact event book of the
 // frozen actual-demand baseline, including the same Picking/Transport mode.
 const isNoAction=option==='wait'||(option==='multi'&&!effective.urgent&&!effective.releaseReserve&&!effective.extraCapacity);
 const recovered=isNoAction?base.actual:eventSimulation({policy,orders:actualOrders,days,dailyCapacity:capacity,stock:openingStock,receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity,qualityReleasePercent,inventoryAccuracyPercent,supplierFill,delayDays,fixedPurchases:base.purchase,extraDeliveries:urgent,reserveStock,reserveReleaseDay:effective.releaseReserve?effectiveReserveDay:null,separateTransport,
  // Same observed incident calendar as the reference: no magic recovery.
  operationalEvents:baseline.seed.operationalEvents??[]});
 // A recovery option may create a SEPARATE urgent PO, but cannot rewrite
 // an original supplier commitment (including its expected arrival day).
 assertFrozenOriginalPurchases(base.originalPurchaseOrders,recovered);
 const urgentBase=urgent.reduce((n,d)=>n+d.qty*d.unitCost,0);
 const urgentSurcharge=urgentBase*emergencySurchargeRate;
 const operationalCost=operationalCapacityCostReadModel({
  recovered,baseline:base.actual,option,
  extraCapacity:effective.extraCapacity,dailyCapacity,extraCapacityDailyCost
 });
 const extraLabor=operationalCost.totals.totalCostCLP;
 const incrementalRevenue=(recovered.completed-base.actual.completed)*unitRevenue;
 const incrementalExpense=urgentBase+urgentSurcharge+extraLabor;
 const backlogDays=r=>r.ledger.slice(0,-1).reduce((n,day)=>n+day.backlog,0);
 const penaltyBase=backlogDays(base.actual)*latePenaltyPerOrderDay;
 const penaltyRecovered=backlogDays(recovered)*latePenaltyPerOrderDay;
 const stockDays=r=>r.ledger.reduce((n,day)=>n+SKU_CATALOG.reduce((v,p)=>v+(day.stock[p.id]+(day.reserveStock?.[p.id]||0)+(day.heldQuality?.[p.id]||0)+(day.stagingStock?.[p.id]||0))*p.unitCost,0),0);
 const holdingBase=stockDays(base.actual)*holdingRatePerDay;
 const holdingRecovered=stockDays(recovered)*holdingRatePerDay;
 const penaltySaved=penaltyBase-penaltyRecovered;
 const holdingDelta=holdingRecovered-holdingBase;
 const economicProxyDelta=incrementalRevenue-incrementalExpense+penaltySaved-holdingDelta;
 const netCashDelta=incrementalRevenue-incrementalExpense;
 // Fail fast if any compared branch is accidentally seeded with another SKU opening.
 for(const observed of [base.planned.initial,base.actual.initial,recovered.initial]){
  for(const [skuId,qty] of Object.entries(openingStock)){
   if(observed[skuId]!==qty)throw new Error('La apertura SKU cambia entre escenarios');
  }
 }
 const comparison={option,label:choice.label,multiActions,unitRevenue,baselineSnapshot:baseline,baselineKey:baseline.scenarioKey,separateTransport,urgentArrivalDay:effectiveArrivalDay,purchaseCoveragePercent:effectiveCoveragePercent,reservePercent,openingState,reserveStock,integrated:base,base:base.actual,recovered,urgent,urgentBase,urgentSurcharge,operationalCost,extraLabor,incrementalRevenue,incrementalExpense,netCashDelta,penaltyBase,penaltyRecovered,penaltySaved,backlogDaysBase:backlogDays(base.actual),backlogDaysRecovered:backlogDays(recovered),holdingBase,holdingRecovered,holdingDelta,economicProxyDelta,committedPurchaseValue:base.committedPurchaseValue,originalPurchaseOrders:base.originalPurchaseOrders,planningCommitment:base.planningCommitment,plannedForecastPercent,planningCoveragePercent,forecastOrders:base.forecastOrders,originalPurchase:base.purchase,
  assumptions:'Comparación incremental de caja simplificada, NO margen contable: ingresos adicionales menos desembolso de compra urgente, recargo y refuerzo diario. Refuerzo de capacidad de pedidos: se activa y cobra una jornada solo cuando existe Picking o expedición efectivamente simulada ese día; si se activa se cobra la tarifa diaria aun con cupos ociosos. No equivale a horas ni personas reales y no cubre tarifas operativas base no calibradas. Compra urgente llega el día configurado y no mejora cumplimiento anterior a la recepción. Penalidad por pedido pendiente/día y tenencia por valor de stock/día son proxies didácticos, no gastos verificados ni asientos contables. Reserva interna: una partición del stock inicial ubicado en RESERVA-CD; un traslado la hace disponible para Picking en el día seleccionado, sin sumar inventario ni costo de compra. No hay devoluciones, IVA ni costos de transporte. El staging opt-in no añade una tasa de almacenamiento nueva; suma su stock físico al proxy de tenencia existente.'};
 if(option==='wait')comparison.waitEvidence=waitWithoutInterventionReadModel({baseline,recovered,comparison});
 return comparison;
}
