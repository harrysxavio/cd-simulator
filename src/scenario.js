export const DEFAULT_SCENARIO={
 demand:1000,initialStock:250,reserveStock:150,unitPrice:9000,
 unitPurchaseCost:2500,initialStockUnitCost:2500,unitTransportCost:500,unitPackagingCost:250,urgentPurchaseSurcharge:500,
 inventoryOperators:3,pickingOperators:5,receivingOperators:2,
 inventoryDailyWage:42000,pickingDailyWage:42000,receivingDailyWage:42000,
 otherFixedCost:90000,maxCostPerUnit:4800
};
export const FIELDS=[
['demand','Demanda objetivo','unidades',100,100000,100],
['initialStock','Stock inicial','unidades',0,100000,50],
['reserveStock','Stock de reserva elegible','unidades',0,100000,25],
['unitPrice','Ingreso estimado por unidad expedida','$ CLP',0,10000000,500],
['unitPurchaseCost','Costo de compra por unidad recibida','$ CLP',0,10000000,100],
['initialStockUnitCost','Costo unitario del stock inicial','$ CLP',0,10000000,100],
['urgentPurchaseSurcharge','Recargo por unidad de compra urgente','$ CLP',0,10000000,50],
['unitTransportCost','Costo variable por unidad expedida','$ CLP',0,10000000,50],
['unitPackagingCost','Costo de empaque por unidad preparada','$ CLP',0,10000000,50],
['inventoryOperators','Operarios de inventario','personas',0,500,1],
['pickingOperators','Operarios de picking','personas',0,500,1],
['receivingOperators','Operarios de recepción','personas',0,500,1],
['inventoryDailyWage','Costo diario por operario de inventario','$ CLP',0,1000000,1000],
['pickingDailyWage','Costo diario por operario de picking','$ CLP',0,1000000,1000],
['receivingDailyWage','Costo diario por operario de recepción','$ CLP',0,1000000,1000],
['otherFixedCost','Otros costos fijos de campaña','$ CLP',0,100000000,1000],
['maxCostPerUnit','Meta de costo máximo por unidad expedida','$ CLP',0,10000000,100]
];
export function cleanScenario(raw={}){
 const result={};
 for(const [key,, ,min,max] of FIELDS){const v=Number(raw[key]);result[key]=raw[key]!==undefined&&raw[key]!==''&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):DEFAULT_SCENARIO[key]}
 return result;
}
// Modelo didáctico de una jornada: los costos de mercancía vendida y el flujo de caja
// se muestran por separado. La reserva se valora al costo del stock inicial.
export const RECOVERY_RATES={
 commercial:1200,planning:1800,purchasing:2500,quality:1600,
 inventory:200,transport:600
};
export function finance(flow,scenario){
 const s=cleanScenario(scenario),a=flow.actions||{};
 const labor={
 inventory:s.inventoryOperators*s.inventoryDailyWage,
 picking:s.pickingOperators*s.pickingDailyWage,
 receiving:s.receivingOperators*s.receivingDailyWage
 };
 const recoveryLabor={
 receiving:Math.ceil((a.receiving||0)/325)*s.receivingDailyWage,
 picking:Math.ceil((a.picking||0)/460)*s.pickingDailyWage,
 inventory:0
 };
 const recoveryLaborTotal=Object.values(recoveryLabor).reduce((x,y)=>x+y,0);
 const actionCosts=Object.fromEntries(Object.entries(RECOVERY_RATES).map(([key,rate])=>[key,(a[key]||0)*rate]));
 const actionCostTotal=Object.values(actionCosts).reduce((x,y)=>x+y,0);
 const laborTotal=Object.values(labor).reduce((x,y)=>x+y,0)+recoveryLaborTotal;
 const purchase=flow.received*s.unitPurchaseCost;
 const urgentSurcharge=flow.procurementMode==='express'?flow.received*s.urgentPurchaseSurcharge:0;
 const transport=flow.dispatched*s.unitTransportCost;
 const packaging=flow.picked*s.unitPackagingCost;
 const initialConsumed=Math.min(flow.dispatched,flow.stock);
 const newlyConsumed=Math.max(0,flow.dispatched-initialConsumed);
 const costOfGoods=initialConsumed*s.initialStockUnitCost+newlyConsumed*s.unitPurchaseCost;
 const operationalExpenses=laborTotal+transport+packaging+s.otherFixedCost+urgentSurcharge+actionCostTotal;
 const total=costOfGoods+operationalExpenses;
 const cashOutflow=laborTotal+purchase+urgentSurcharge+transport+packaging+s.otherFixedCost+actionCostTotal;
 const revenue=flow.dispatched*s.unitPrice;
 const contribution=revenue-costOfGoods-transport-packaging-urgentSurcharge;
 return {
 labor,recoveryLabor,recoveryLaborTotal,laborTotal,actionCosts,actionCostTotal,
 purchase,urgentSurcharge,transport,packaging,fixed:s.otherFixedCost,
 costOfGoods,initialConsumed,newlyConsumed,operationalExpenses,cashOutflow,
 total,revenue,contribution,margin:revenue-total,
 costPerUnit:flow.dispatched?total/flow.dispatched:null,
 unitMargin:flow.dispatched?(revenue-total)/flow.dispatched:null,
 meetsTarget:flow.dispatched>0&&total/flow.dispatched<=s.maxCostPerUnit,
 utilization:flow.demand?flow.dispatched/flow.demand:0
 };
}
