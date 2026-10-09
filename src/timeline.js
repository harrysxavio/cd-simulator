import {SKU_CATALOG,skuOrderLab} from './sku.js';
import {inventoryPolicy} from './policy.js';

/** One campaign observed at different hypothetical arrival cutoffs.
 * Each cutoff reruns the SAME order cohort from the initial stock plus receipts
 * arrived by that day; snapshots are alternatives, not cumulative shipments.
 */
export function deliveryTimeline({policy='service',orders=200,stock={},checkpoints=[0,2,5,10],delayDays={},supplierFill={},fixedPurchases=null}={}){
 const plan=inventoryPolicy({policy,orders,stock});
 const initial=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,Math.max(0,Math.floor(Number(stock[p.id]??p.initial)||0))]));
 const purchase=fixedPurchases===null?Object.fromEntries(plan.perSku.map(p=>[p.id,p.ordered])):Object.fromEntries(SKU_CATALOG.map(p=>{const v=Number(fixedPurchases[p.id]??0);if(!Number.isSafeInteger(v)||v<0)throw new Error('Compra fija inválida');return [p.id,v]}));
 const deliveries=SKU_CATALOG.map(p=>{
  const delay=Number(delayDays[p.id]??0),fill=Number(supplierFill[p.id]??100);
  if(!Number.isInteger(delay)||delay<0||delay>365||!Number.isFinite(fill)||fill<0||fill>100)throw new Error('Supuestos de proveedor inválidos');
  const ordered=purchase[p.id],received=Math.floor(ordered*fill/100);
  return {id:p.id,rotation:p.rotation,ordered,received,unreceived:ordered-received,arrivalDay:p.leadDays+delay,unitCost:p.unitCost,committedCash:ordered*p.unitCost,receivedCash:received*p.unitCost};
 });
 const days=[...new Set(checkpoints.map(Number))].sort((a,b)=>a-b);
 if(days.some(d=>!Number.isInteger(d)||d<0||d>365))throw new Error('Día de corte inválido');
 const snapshots=days.map(day=>{
  const receipts=Object.fromEntries(deliveries.map(d=>[d.id,day>=d.arrivalDay?d.received:0]));
  const usableStock=Object.fromEntries(SKU_CATALOG.map(p=>[p.id,initial[p.id]+receipts[p.id]]));
  const result=skuOrderLab({orders,stock:usableStock});
  const receivedValue=deliveries.reduce((n,d)=>n+receipts[d.id]*d.unitCost,0);
  const pendingReceipts=deliveries.reduce((n,d)=>n+d.ordered-receipts[d.id],0);
  return {day,receipts,usableStock,complete:result.complete,pending:result.pending,fulfillment:result.fulfillment,receivedValue,pendingReceipts,stockRemaining:result.stockRemaining};
 });
 return {policy,orders,initial,deliveries,purchaseValue:deliveries.reduce((n,d)=>n+d.committedCash,0),snapshots,assumptions:'Los cortes son escenarios alternativos de una misma cohorte de pedidos, no despachos acumulados. Recepción y liberación de calidad instantáneas al arribo, sin restricción de capacidad. Los faltantes de proveedor no llegan luego en este horizonte.'};
}
