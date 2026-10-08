import {flow} from './flow.js';
import {finance,cleanScenario} from './scenario.js';

const AREAS=[
 {id:'receiving',name:'Recepción',operators:'receivingOperators',rate:'receivingUnitsPerHour',volume:'delivered',processed:'received',capacity:'receivingCapacity',wage:'receivingDailyWage'},
 {id:'inventory',name:'Inventario',operators:'inventoryOperators',rate:'inventoryUnitsPerHour',volume:'demand',processed:'available',capacity:'inventoryCapacity',wage:'inventoryDailyWage'},
 {id:'picking',name:'Picking',operators:'pickingOperators',rate:'pickingUnitsPerHour',volume:'available',processed:'picked',capacity:'pickingCapacity',wage:'pickingDailyWage'}
];
export function laborAudit(decisions={},actions={},scenario={}){
 const s=cleanScenario(scenario),r=flow(decisions,actions,s),f=finance(r,s);
 const result=AREAS.map(area=>{
  const staff=s[area.operators],rate=s[area.rate],hours=s.effectiveHours;
  const capacity=r[area.capacity],inflow=r[area.volume],processed=r[area.processed];
  const laborHours=staff*hours;
  const productivity=laborHours>0?processed/laborHours:null;
  const utilization=capacity>0?processed/capacity:0;
  const staffRequired=Math.ceil(inflow/(hours*rate));
  const unmet=Math.max(0,inflow-processed);
  const excessStaff=Math.max(0,staff-staffRequired);
  return {id:area.id,name:area.name,staff,rate,hours,laborHours,capacity,inflow,processed,productivity,utilization,staffRequired,excessStaff,unmet,wage:s[area.wage],
    idleCostIndicator:excessStaff*s[area.wage],note:'Dotación teórica para cubrir el flujo entrante con productividad estándar. No equivale a personal prescindible ni considera otras tareas, seguridad o restricciones de turnos.'};
 });
 return {result,operationalExpenses:f.operationalExpenses,dispatched:r.dispatched,demand:r.demand};
}
