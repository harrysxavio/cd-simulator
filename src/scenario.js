export const DEFAULT_SCENARIO={
 demand:1000,actualDemand:1000,demandShockPercent:30,areaCostTolerance:10,initialStock:250,reserveStock:150,unitPrice:9000,
 unitPurchaseCost:2500,initialStockUnitCost:2500,unitTransportCost:500,unitPackagingCost:250,urgentPurchaseSurcharge:500,
 inventoryOperators:3,pickingOperators:5,receivingOperators:2,
 effectiveHours:8,receivingUnitsPerHour:40.625,pickingUnitsPerHour:57.5,inventoryUnitsPerHour:50,
 inventoryDailyWage:42000,pickingDailyWage:42000,receivingDailyWage:42000,
 otherFixedCost:90000,maxCostPerUnit:4800,targetFulfillment:95
};
export const FIELDS=[
['demand','Demanda prevista base (plan comercial)','unidades',100,100000,100],
['demandShockPercent','Magnitud de la sorpresa (signo aleatorio al revelar)','%',0,100,5],
['areaCostTolerance','Tolerancia de sobrecosto por área','%',0,100,1],
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
['effectiveHours','Horas efectivas por operario y jornada','horas',1,12,0.5],
['receivingUnitsPerHour','Productividad estándar Recepción','unid./hora',1,1000,1],
['pickingUnitsPerHour','Productividad estándar Picking','unid./hora',1,1000,1],
['inventoryUnitsPerHour','Productividad estándar Inventario','unid./hora',1,1000,1],
['inventoryDailyWage','Costo diario por operario de inventario','$ CLP',0,1000000,1000],
['pickingDailyWage','Costo diario por operario de picking','$ CLP',0,1000000,1000],
['receivingDailyWage','Costo diario por operario de recepción','$ CLP',0,1000000,1000],
['otherFixedCost','Otros costos fijos de campaña','$ CLP',0,100000000,1000],
['maxCostPerUnit','Meta de costo máximo por unidad expedida','$ CLP',0,10000000,100],
['targetFulfillment','Meta de cumplimiento','%',1,100,1]
];
export function cleanScenario(raw={}){
 const result={};
 for(const [key,, ,min,max] of FIELDS){const v=Number(raw[key]);result[key]=raw[key]!==undefined&&raw[key]!==''&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):DEFAULT_SCENARIO[key]}
 result.actualDemand=raw.actualDemand===undefined?result.demand:Math.max(1,Math.round(Number(raw.actualDemand)||result.demand));
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
 const baseReceivingCapacity=(flow.choices?.receiving==='low'?350/650:flow.choices?.receiving==='extra'?1000/650:1)*s.receivingOperators*s.effectiveHours*s.receivingUnitsPerHour;
 const basePickingCapacity=(flow.choices?.picking==='low'?1400/2300:flow.choices?.picking==='reinforce'?3000/2300:1)*s.pickingOperators*s.effectiveHours*s.pickingUnitsPerHour;
 const capacityStaff={receiving:Math.max(0,Math.ceil((flow.receivingCapacity-(a.receiving||0)-baseReceivingCapacity)/(s.effectiveHours*s.receivingUnitsPerHour))),picking:Math.max(0,Math.ceil((flow.pickingCapacity-(a.picking||0)-basePickingCapacity)/(s.effectiveHours*s.pickingUnitsPerHour)))};
 const capacityLabor={receiving:capacityStaff.receiving*s.receivingDailyWage,picking:capacityStaff.picking*s.pickingDailyWage};
 const labor={
 inventory:s.inventoryOperators*s.inventoryDailyWage,
 picking:s.pickingOperators*s.pickingDailyWage,
 receiving:s.receivingOperators*s.receivingDailyWage
 };
 const recoveryLabor={
 receiving:Math.ceil((a.receiving||0)/(s.effectiveHours*s.receivingUnitsPerHour))*s.receivingDailyWage,
 picking:Math.ceil((a.picking||0)/(s.effectiveHours*s.pickingUnitsPerHour))*s.pickingDailyWage,
 inventory:0
 };
 const recoveryLaborTotal=Object.values(recoveryLabor).reduce((x,y)=>x+y,0);
 const actionCosts=Object.fromEntries(Object.entries(RECOVERY_RATES).map(([key,rate])=>[key,(a[key]||0)*rate]));
 const actionCostTotal=Object.values(actionCosts).reduce((x,y)=>x+y,0);
 const laborTotal=Object.values(labor).reduce((x,y)=>x+y,0)+recoveryLaborTotal+Object.values(capacityLabor).reduce((x,y)=>x+y,0);
 const purchase=flow.received*s.unitPurchaseCost;
 const urgentSurcharge=flow.procurementMode==='express'?flow.received*s.urgentPurchaseSurcharge:0;
 const transport=flow.dispatched*s.unitTransportCost;
 const packaging=flow.picked*s.unitPackagingCost;
 const initialConsumed=Math.min(flow.dispatched,flow.stock+(flow.eligibleReserve||0));
 const newlyConsumed=Math.max(0,flow.dispatched-initialConsumed);
 const costOfGoods=initialConsumed*s.initialStockUnitCost+newlyConsumed*s.unitPurchaseCost;
 const modeCosts={receiving:flow.choices?.receiving==='extra'?30000:0,quality:flow.choices?.quality==='priority'?22000:0,inventory:flow.choices?.inventory==='count'?18000:0,picking:flow.choices?.picking==='reinforce'?32000:0,transport:flow.choices?.transport==='extra'?50000:0};
 const extraCapacityCosts={transport:Math.max(0,(flow.stages?.[7]?.capacity||0)-(flow.choices?.transport==='extra'?1000:flow.choices?.transport==='low'?500:800)-(a.transport||0))*100,quality:Math.max(0,(flow.stages?.[4]?.output||0)-Math.floor((flow.received||0)*(flow.choices?.quality==='priority'?1:flow.choices?.quality==='slow'?0.75:0.95)))*80};
 const extraCapacityTotal=Object.values(extraCapacityCosts).reduce((x,y)=>x+y,0);
 const modeCostTotal=Object.values(modeCosts).reduce((a,b)=>a+b,0)+extraCapacityTotal;
 const operationalExpenses=laborTotal+transport+packaging+s.otherFixedCost+urgentSurcharge+actionCostTotal+modeCostTotal;
 const total=costOfGoods+operationalExpenses;
 const cashOutflow=laborTotal+purchase+urgentSurcharge+transport+packaging+s.otherFixedCost+actionCostTotal+modeCostTotal;
 const revenue=flow.dispatched*s.unitPrice;
 const contribution=revenue-costOfGoods-transport-packaging-urgentSurcharge;
 return {
 labor,recoveryLabor,capacityStaff,capacityLabor,extraCapacityCosts,recoveryLaborTotal,laborTotal,actionCosts,actionCostTotal,modeCosts,modeCostTotal,
 purchase,urgentSurcharge,transport,packaging,fixed:s.otherFixedCost,
 costOfGoods,initialConsumed,newlyConsumed,operationalExpenses,cashOutflow,
 total,revenue,contribution,margin:revenue-total,
 costPerUnit:flow.dispatched?total/flow.dispatched:null,
 unitMargin:flow.dispatched?(revenue-total)/flow.dispatched:null,
 meetsTarget:flow.dispatched>0&&total/flow.dispatched<=s.maxCostPerUnit,
 utilization:flow.demand?flow.dispatched/flow.demand:0
 };
}

export function strategyAssessment(r,s,mode='balanced'){
 const f=finance(r,s),goal=cleanScenario(s).targetFulfillment/100;
 const service=r.dispatched/r.demand;
 const serviceScore=Math.min(100,100*service/goal);
 const costScore=f.costPerUnit===null?0:Math.min(100,100*cleanScenario(s).maxCostPerUnit/Math.max(1,f.costPerUnit));
 const profitability=f.revenue>0?Math.max(0,Math.min(100,50+50*f.margin/f.revenue)):0;
 const weights={service:[.65,.2,.15],balanced:[.45,.35,.2],cost:[.25,.55,.2]}[mode]||[.45,.35,.2];
 return {score:Math.round(serviceScore*weights[0]+costScore*weights[1]+profitability*weights[2]),serviceScore,costScore,profitability,service,goal,mode,finance:f};
}
