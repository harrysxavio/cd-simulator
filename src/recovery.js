import {integratedDemand} from './integrated.js';
import {eventSimulation} from './events.js';
import {SKU_CATALOG,ORDER_TEMPLATES} from './sku.js';

export const RECOVERY_OPTIONS={
 wait:{label:'Aceptar espera',extraCapacity:0,urgent:false},
 overtime:{label:'Refuerzo operativo',extraCapacity:80,urgent:false},
 emergency:{label:'Compra urgente SKU',extraCapacity:0,urgent:true},
 combined:{label:'Compra urgente + refuerzo',extraCapacity:80,urgent:true}
};
/** Incremental, illustrative recovery comparison. Extra purchases arrive day 1.
 * Cash and economic contribution are distinct; sunk planned procurement is unchanged.
 */
export function recoveryComparison({policy='service',plannedOrders=200,actualOrders=260,delayDays={},dailyCapacity=200,days=12,option='wait',unitRevenue=9000,emergencySurchargeRate=0.3,extraCapacityDailyCost=70000}={}){
 const choice=RECOVERY_OPTIONS[option];
 if(!choice)throw new Error('Recuperación desconocida');
 if(!Number.isFinite(unitRevenue)||unitRevenue<0||!Number.isFinite(emergencySurchargeRate)||emergencySurchargeRate<0||!Number.isFinite(extraCapacityDailyCost)||extraCapacityDailyCost<0)throw new Error('Costos de recuperación inválidos');
 const base=integratedDemand({policy,plannedOrders,actualOrders,delayDays,dailyCapacity,days});
 const urgent=[];
 if(choice.urgent){
  // Calculate unmet BOM demand from actual orders minus stock and original purchases.
  const split=ORDER_TEMPLATES.map((t,i)=>{const exact=actualOrders*t.share/100;return {i,t,count:Math.floor(exact),rem:exact%1}});
  let left=actualOrders-split.reduce((n,x)=>n+x.count,0);
  for(const x of [...split].sort((a,b)=>b.rem-a.rem||a.i-b.i)){if(left--<=0)break;x.count++}
  const demand=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,0]));
  for(const x of split)for(const [id,qty] of Object.entries(x.t.lines))demand[id]+=x.count*qty;
  for(const p of SKU_CATALOG){
   const supply=base.actual.initial[p.id]+base.purchase[p.id];
   const shortage=Math.max(0,demand[p.id]-supply);
   if(shortage)urgent.push({id:p.id,qty:shortage,day:1,unitCost:p.unitCost});
  }
 }
 const capacity=dailyCapacity+choice.extraCapacity;
 const recovered=eventSimulation({policy,orders:actualOrders,days,dailyCapacity:capacity,delayDays,fixedPurchases:base.purchase,extraDeliveries:urgent});
 const urgentBase=urgent.reduce((n,d)=>n+d.qty*d.unitCost,0);
 const urgentSurcharge=urgentBase*emergencySurchargeRate;
 const extraLabor=choice.extraCapacity?extraCapacityDailyCost*(days+1):0;
 const incrementalRevenue=(recovered.completed-base.actual.completed)*unitRevenue;
 const incrementalExpense=urgentBase+urgentSurcharge+extraLabor;
 const netCashDelta=incrementalRevenue-incrementalExpense;
 return {option,label:choice.label,base:base.actual,recovered,urgent,urgentBase,urgentSurcharge,extraLabor,incrementalRevenue,incrementalExpense,netCashDelta,committedPurchaseValue:base.committedPurchaseValue,
  assumptions:'Comparación incremental de caja simplificada, NO margen contable: ingresos adicionales menos desembolso de compra urgente, recargo y refuerzo diario. Se paga refuerzo por todas las jornadas, aun si queda ocioso. Compra urgente llega día 1 y no mejora cumplimiento del día 0. No hay devoluciones, IVA, costos de transporte ni penalidades de atraso.'};
}
