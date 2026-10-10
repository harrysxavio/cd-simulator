import {integratedDemand} from './integrated.js';
import {eventSimulation} from './events.js';
import {SKU_CATALOG,ORDER_TEMPLATES} from './sku.js';
import {skuOpeningState} from './opening-state.js';
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
export function recoveryComparison({policy='service',plannedOrders=200,actualOrders=260,delayDays={},supplierFill={},dailyCapacity=200,days=12,receivingUnitCapacity=null,pickingUnitCapacity=null,transportUnitCapacity=null,qualityReleasePercent=100,inventoryAccuracyPercent=100,option='wait',unitRevenue=9000,emergencySurchargeRate=0.3,extraCapacityDailyCost=70000,latePenaltyPerOrderDay=150,holdingRatePerDay=0.0005,urgentArrivalDay=1,purchaseCoveragePercent=100,plannedForecastPercent=100,planningCoveragePercent=100,stock=null,reservePercent=0}={}){
 const choice=RECOVERY_OPTIONS[option];
 if(!choice)throw new Error('Recuperación desconocida');
 if(!Number.isInteger(urgentArrivalDay)||urgentArrivalDay<1||urgentArrivalDay>365)throw new Error('Plazo de reposición urgente inválido');
 if(!Number.isInteger(purchaseCoveragePercent)||purchaseCoveragePercent<0||purchaseCoveragePercent>100)throw new Error('Cobertura de compra urgente inválida');
 if(!Number.isInteger(reservePercent)||reservePercent<0||reservePercent>50)throw new Error('Porcentaje de reserva ubicada inválido');
 if(!Number.isFinite(unitRevenue)||unitRevenue<0||!Number.isFinite(emergencySurchargeRate)||emergencySurchargeRate<0||!Number.isFinite(extraCapacityDailyCost)||extraCapacityDailyCost<0||!Number.isFinite(latePenaltyPerOrderDay)||latePenaltyPerOrderDay<0||!Number.isFinite(holdingRatePerDay)||holdingRatePerDay<0)throw new Error('Costos de recuperación inválidos');
 // Derive reserve strictly from the SAME physical opening used by planning.
 const openingState=skuOpeningState({stock,reservePercent});
 const openingStock=openingState.openingBySku;
 const reserveStock=openingState.reserveBySku;
 const base=integratedDemand({policy,plannedOrders,actualOrders,delayDays,supplierFill,dailyCapacity,days,qualityReleasePercent,inventoryAccuracyPercent,receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity,plannedForecastPercent,planningCoveragePercent,stock:openingStock,reserveStock});
 const urgent=[];
 if(choice.urgent){
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
   const qty=Math.ceil(shortage*purchaseCoveragePercent/100);
   if(qty)urgent.push({id:p.id,qty,day:urgentArrivalDay,unitCost:p.unitCost});
  }
 }
 const capacity=dailyCapacity+choice.extraCapacity;
 const recovered=eventSimulation({policy,orders:actualOrders,days,dailyCapacity:capacity,stock:openingStock,receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity,qualityReleasePercent,inventoryAccuracyPercent,supplierFill,delayDays,fixedPurchases:base.purchase,extraDeliveries:urgent,reserveStock,reserveReleaseDay:choice.releaseReserve?urgentArrivalDay:null});
 // A recovery option may create a SEPARATE urgent PO, but cannot rewrite
 // an original supplier commitment (including its expected arrival day).
 assertFrozenOriginalPurchases(base.originalPurchaseOrders,recovered);
 const urgentBase=urgent.reduce((n,d)=>n+d.qty*d.unitCost,0);
 const urgentSurcharge=urgentBase*emergencySurchargeRate;
 const extraLabor=choice.extraCapacity?extraCapacityDailyCost*(days+1):0;
 const incrementalRevenue=(recovered.completed-base.actual.completed)*unitRevenue;
 const incrementalExpense=urgentBase+urgentSurcharge+extraLabor;
 const backlogDays=r=>r.ledger.slice(0,-1).reduce((n,day)=>n+day.backlog,0);
 const penaltyBase=backlogDays(base.actual)*latePenaltyPerOrderDay;
 const penaltyRecovered=backlogDays(recovered)*latePenaltyPerOrderDay;
 const stockDays=r=>r.ledger.reduce((n,day)=>n+SKU_CATALOG.reduce((v,p)=>v+(day.stock[p.id]+(day.reserveStock?.[p.id]||0)+(day.heldQuality?.[p.id]||0))*p.unitCost,0),0);
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
 return {option,label:choice.label,urgentArrivalDay,purchaseCoveragePercent,reservePercent,openingState,reserveStock,integrated:base,base:base.actual,recovered,urgent,urgentBase,urgentSurcharge,extraLabor,incrementalRevenue,incrementalExpense,netCashDelta,penaltyBase,penaltyRecovered,penaltySaved,backlogDaysBase:backlogDays(base.actual),backlogDaysRecovered:backlogDays(recovered),holdingBase,holdingRecovered,holdingDelta,economicProxyDelta,committedPurchaseValue:base.committedPurchaseValue,originalPurchaseOrders:base.originalPurchaseOrders,plannedForecastPercent,planningCoveragePercent,forecastOrders:base.forecastOrders,originalPurchase:base.purchase,
  assumptions:'Comparación incremental de caja simplificada, NO margen contable: ingresos adicionales menos desembolso de compra urgente, recargo y refuerzo diario. Se paga refuerzo por todas las jornadas, aun si queda ocioso. Compra urgente llega el día configurado y no mejora cumplimiento anterior a la recepción. Penalidad por pedido pendiente/día y tenencia por valor de stock/día son proxies didácticos, no gastos verificados ni asientos contables. Reserva interna: una partición del stock inicial ubicado en RESERVA-CD; un traslado la hace disponible para Picking en el día seleccionado, sin sumar inventario ni costo de compra. No hay devoluciones, IVA ni costos de transporte.'};
}
