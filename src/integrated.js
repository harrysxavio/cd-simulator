import {eventSimulation} from './events.js';
import {inventoryPolicy} from './policy.js';

/** Compare identical operational policy under planned and actual order volumes.
 * Procurement is frozen at plan: the surprise must not trigger retroactive buys.
 */
export function integratedDemand({policy='service',plannedOrders=200,actualOrders=260,delayDays={},days=12,dailyCapacity=200,receivingUnitCapacity=null,pickingUnitCapacity=null,transportUnitCapacity=null}={}){
 if(!Number.isInteger(plannedOrders)||plannedOrders<1||plannedOrders>100000||!Number.isInteger(actualOrders)||actualOrders<1||actualOrders>100000)throw new Error('Demanda de pedidos inválida');
 const plan=inventoryPolicy({policy,orders:plannedOrders});
 const purchase=Object.fromEntries(plan.perSku.map(p=>[p.id,p.ordered]));
 // A frozen purchase order may be replayed against any actual demand.
 // Override event simulation procurement through a fixed purchase manifest.
 const baseline=eventSimulation({policy,orders:plannedOrders,days,dailyCapacity,delayDays,receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity,fixedPurchases:purchase});
 const surprise=eventSimulation({policy,orders:actualOrders,days,dailyCapacity,delayDays,receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity,fixedPurchases:purchase});
 const comparison={planned:baseline,actual:surprise,plannedOrders,actualOrders,policy,purchase,committedPurchaseValue:plan.orderValue,
  impact:{orders:actualOrders-plannedOrders,onTime:surprise.onTime-baseline.onTime,completed:surprise.completed-baseline.completed,pending:surprise.pending-baseline.pending,late:surprise.late-baseline.late}};
 return {...comparison,assumptions:'La compra se calcula una sola vez con la demanda planificada y se congela al revelar la demanda real. El motor SKU de pedidos y recepciones sigue siendo un laboratorio paralelo, no sustituye el flujo agregado principal.'};
}
