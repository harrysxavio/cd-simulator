import {SKU_CATALOG,skuOrderLab} from './sku.js';

/** Scenario planning, not same-day replenishment: planned receipts arrive after lead time.
 * Cost comparison values ending stock, lost order contribution, and carrying cost.
 */
export const POLICY_PRESETS={
 lean:{label:'Ajustada',targetDays:{A:7,B:15,C:20}},
 balanced:{label:'Equilibrada',targetDays:{A:15,B:25,C:35}},
 service:{label:'Protección de servicio',targetDays:{A:30,B:40,C:50}}
};
const qty=n=>Number.isFinite(Number(n))?Math.max(0,Math.floor(Number(n))):0;
export function inventoryPolicy({policy='balanced',orders=200,stock={},targetDays=null,holdingMonthlyRate=0.02,unitRevenue=9000}={}){
 const preset=POLICY_PRESETS[policy];
 if(!preset)throw new Error('Política desconocida');
 if(!Number.isFinite(holdingMonthlyRate)||holdingMonthlyRate<0||!Number.isFinite(unitRevenue)||unitRevenue<0)throw new Error('Supuestos económicos inválidos');
 const initial=skuOrderLab({orders,stock});
 const targets=targetDays??preset.targetDays;
 const purchases={};const perSku=[];
 for(const item of initial.skuMetrics){
  const catalog=SKU_CATALOG.find(p=>p.id===item.id);
  const target=Number(targets[item.id]);
  if(!Number.isFinite(target)||target<0||target>365)throw new Error('Cobertura objetivo inválida');
  const daily=item.demand/30;
  const targetUnits=Math.ceil(daily*target);
  const reorderPoint=Math.ceil(daily*(catalog.leadDays+catalog.safetyDays));
  const reorder=item.onHand<=reorderPoint;
  // Reorder only if threshold reached. Target coverage is desired stock position,
  // not guaranteed same-day stock.
  const orderQty=reorder?Math.max(0,targetUnits-item.onHand):0;
  purchases[item.id]=orderQty;
  perSku.push({id:item.id,rotation:item.rotation,stock:item.onHand,dailyDemand:daily,targetDays:target,targetUnits,reorderPoint,reorder,ordered:orderQty,leadDays:catalog.leadDays,unitCost:catalog.unitCost,orderValue:orderQty*catalog.unitCost});
 }
 const futureStock=Object.fromEntries(perSku.map(p=>[p.id,p.stock+p.ordered]));
 const eventual=skuOrderLab({orders,stock:futureStock});
 const orderValue=perSku.reduce((n,p)=>n+p.orderValue,0);
 const endingInventoryValue=eventual.skuMetrics.reduce((n,p)=>n+p.remaining*p.unitCost,0);
 const holdingCost=endingInventoryValue*holdingMonthlyRate;
 const initialHoldingCost=initial.skuMetrics.reduce((n,p)=>n+p.remaining*p.unitCost,0)*holdingMonthlyRate;
 const revenue=eventual.complete*unitRevenue,baselineRevenue=initial.complete*unitRevenue;
 const procurementCash=orderValue;
 return {policy,label:preset.label,orders:qty(orders),perSku,purchases,orderValue,procurementCash,baseline:{complete:initial.complete,fulfillment:initial.fulfillment,holdingCost:initialHoldingCost},eventual:{complete:eventual.complete,fulfillment:eventual.fulfillment,remaining:eventual.stockRemaining,endingInventoryValue,holdingCost,revenue},delta:{complete:eventual.complete-initial.complete,revenue:revenue-baselineRevenue,holdingCost:holdingCost-initialHoldingCost},assumptions:'Comparación de escenarios con recepciones futuras hipotéticas; NO representa disponibilidad inmediata. El ingreso es bruto, no margen. No incluye costo de pedido, financiamiento, impuestos ni merma.'};
}
