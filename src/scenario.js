export const DEFAULT_SCENARIO={
 demand:1000,initialStock:250,reserveStock:150,unitPrice:9000,
 unitPurchaseCost:2500,unitTransportCost:500,unitPackagingCost:250,
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
export function finance(flow,scenario){
 const s=cleanScenario(scenario);
 const labor={
 inventory:s.inventoryOperators*s.inventoryDailyWage,
 picking:s.pickingOperators*s.pickingDailyWage,
 receiving:s.receivingOperators*s.receivingDailyWage
 };
 const recoveryLabor={receiving:Math.ceil((flow.actions?.receiving||0)/325)*s.receivingDailyWage,picking:Math.ceil((flow.actions?.picking||0)/460)*s.pickingDailyWage,inventory:(flow.actions?.inventory||0)>0?s.inventoryDailyWage:0};
const recoveryLaborTotal=Object.values(recoveryLabor).reduce((a,b)=>a+b,0);
const laborTotal=Object.values(labor).reduce((a,b)=>a+b,0)+recoveryLaborTotal;
 const purchase=flow.received*s.unitPurchaseCost;
 const transport=flow.dispatched*s.unitTransportCost;
 const packaging=flow.picked*s.unitPackagingCost;
 const total=laborTotal+purchase+transport+packaging+s.otherFixedCost;
 const revenue=flow.dispatched*s.unitPrice;
 return {labor,recoveryLabor,recoveryLaborTotal,laborTotal,purchase,transport,packaging,fixed:s.otherFixedCost,total,revenue,margin:revenue-total,costPerUnit:flow.dispatched?total/flow.dispatched:null,unitMargin:flow.dispatched?(revenue-total)/flow.dispatched:null,meetsTarget:flow.dispatched>0&&total/flow.dispatched<=s.maxCostPerUnit,utilization:flow.demand?flow.dispatched/flow.demand:0};
}
