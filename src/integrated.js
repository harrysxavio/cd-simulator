import {eventSimulation} from './events.js';
import {inventoryPolicy} from './policy.js';

/** Compare identical operational policy under planned and actual order volumes.
 * Procurement is frozen at plan: the surprise must not trigger retroactive buys.
 */
export function integratedDemand({policy='service',plannedOrders=200,actualOrders=260,delayDays={},supplierFill={},days=12,dailyCapacity=200,receivingUnitCapacity=null,pickingUnitCapacity=null,transportUnitCapacity=null,qualityReleasePercent=100,inventoryAccuracyPercent=100,plannedForecastPercent=100,planningCoveragePercent=100,stock={},reserveStock={}}={}){
 if(!Number.isInteger(plannedOrders)||plannedOrders<1||plannedOrders>100000||!Number.isInteger(actualOrders)||actualOrders<1||actualOrders>100000)throw new Error('Demanda de pedidos inválida');
 if(!Number.isFinite(plannedForecastPercent)||plannedForecastPercent<1||plannedForecastPercent>200)throw new Error('Pronóstico comercial SKU inválido');
 if(!Number.isFinite(planningCoveragePercent)||planningCoveragePercent<0||planningCoveragePercent>150)throw new Error('Cobertura planificada SKU inválida');
 // One SKU procurement manifest is committed before any real-demand surprise.
 // Forecast sizes the order-up-to stock target; planning controls how much to order.
 const forecastOrders=Math.max(1,Math.round(plannedOrders*plannedForecastPercent/100));
 // Both baseline and actual-demand replays start from exactly the same stock.
 const plan=inventoryPolicy({policy,orders:forecastOrders,stock});
 const purchase=Object.fromEntries(plan.perSku.map(p=>[p.id,Math.ceil(p.ordered*planningCoveragePercent/100)]));
 const committedPurchaseValue=plan.perSku.reduce((sum,p)=>sum+purchase[p.id]*p.unitCost,0);
 // A frozen purchase order may be replayed against any actual demand.
 // Override event simulation procurement through a fixed purchase manifest.
 const baseline=eventSimulation({policy,orders:plannedOrders,days,dailyCapacity,stock,delayDays,supplierFill,qualityReleasePercent,inventoryAccuracyPercent,receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity,reserveStock,fixedPurchases:purchase});
 const surprise=eventSimulation({policy,orders:actualOrders,days,dailyCapacity,stock,delayDays,supplierFill,qualityReleasePercent,inventoryAccuracyPercent,receivingUnitCapacity,pickingUnitCapacity,transportUnitCapacity,reserveStock,fixedPurchases:purchase});
 const comparison={planned:baseline,actual:surprise,plannedOrders,actualOrders,policy,purchase,committedPurchaseValue,forecastOrders,plannedForecastPercent,planningCoveragePercent,
  impact:{orders:actualOrders-plannedOrders,onTime:surprise.onTime-baseline.onTime,completed:surprise.completed-baseline.completed,pending:surprise.pending-baseline.pending,late:surprise.late-baseline.late}};
 return {...comparison,assumptions:'La compra se calcula una sola vez según el pronóstico comercial y la cobertura de Planeación; se congela al revelar la demanda real. El motor SKU de pedidos y recepciones sigue siendo un laboratorio paralelo, no sustituye el flujo agregado principal.'};
}
