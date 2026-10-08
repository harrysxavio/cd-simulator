import {flow} from './flow.js';
import {START,DEFAULTS} from './engine.js';
import {finance,cleanScenario} from './scenario.js';

export const AREA_NAMES={commercial:'Comercial',planning:'Planning',purchasing:'Compras',receiving:'Recepción',quality:'Calidad',inventory:'Inventario',picking:'Picking',transport:'Transporte'};
export function areaEconomics(decisions,actions,scenario){
 const s=cleanScenario(scenario),r=flow(decisions,actions,s),f=finance(r,s);
 const standardDecisions={...decisions};
 for(const id of Object.keys(AREA_NAMES))standardDecisions[id]=DEFAULTS[id];
 standardDecisions.values={};
 const baseline=flow(standardDecisions,{}, {...s,actualDemand:s.demand});
 const fb=finance(baseline,{...s,actualDemand:s.demand});
 const costs=(x,y)=>({
  commercial:y.actionCosts.commercial||0,
  planning:y.actionCosts.planning||0,
  purchasing:(y.actionCosts.purchasing||0)+y.urgentSurcharge,
  receiving:y.labor.receiving+y.recoveryLabor.receiving+(y.capacityLabor?.receiving||0)+(y.modeCosts.receiving||0),
  quality:(y.actionCosts.quality||0)+(y.modeCosts.quality||0)+(y.extraCapacityCosts?.quality||0),
  inventory:y.labor.inventory+(y.actionCosts.inventory||0)+(y.modeCosts.inventory||0),
  picking:y.labor.picking+y.recoveryLabor.picking+(y.capacityLabor?.picking||0)+(y.modeCosts.picking||0)+y.packaging,
  transport:(y.actionCosts.transport||0)+(y.modeCosts.transport||0)+(y.extraCapacityCosts?.transport||0)+y.transport
 });
 const current=costs(r,f),reference=costs(baseline,fb);
 // Flexible reference: retain standard fixed staffing, adjust standard variable costs to actual throughput.
 // This avoids calling volume-driven cost changes inefficiency or savings.
 const flexible={...reference,
  picking:fb.labor.picking+(baseline.picked?fb.packaging*r.picked/baseline.picked:r.picked*s.unitPackagingCost),
  transport:(baseline.dispatched?fb.transport*r.dispatched/baseline.dispatched:r.dispatched*s.unitTransportCost)};
 const tolerance=s.areaCostTolerance/100;
 const result=Object.keys(AREA_NAMES).map(id=>{
  const value=current[id],base=flexible[id],over=value>base*(1+tolerance)+0.01;
  const additional=value-base;
  const status=over?'over':additional<0?'under':'ok';
  return {id,title:AREA_NAMES[id],cost:value,reference:base,staticReference:reference[id],volumeVariance:base-reference[id],efficiencyVariance:additional,delta:additional,over,status,
   label:over?'Sobrecosto frente a referencia':additional<0?'Menor gasto; validar volumen':'Dentro de tolerancia'};
 });
 return {result,current:r,finance:f,reference:baseline,referenceFinance:fb,tolerance:s.areaCostTolerance,
  allocatedCurrent:Object.values(current).reduce((a,b)=>a+b,0),
  allocatedReference:Object.values(reference).reduce((a,b)=>a+b,0),
  allocatedFlexible:Object.values(flexible).reduce((a,b)=>a+b,0)};
}
export function attentionSignals(decisions,actions,scenario){
 const s=cleanScenario(scenario),data=areaEconomics(decisions,actions,s);
 const r=data.current,f=data.finance;
 const messages=[];
 const add=(level,title,description)=>messages.push({level,title,description});
 if(r.demand>r.plannedDemand*1.05)add('warning','Demanda superior a lo previsto','La demanda real supera el plan en '+(100*(r.demand/r.plannedDemand-1)).toFixed(1)+' %. Comprueba stock, proveedores y capacidades antes de prometer servicio.');
 if(r.demand<r.plannedDemand*.95)add('warning','Demanda inferior a lo previsto','La demanda real es '+(100*(1-r.demand/r.plannedDemand)).toFixed(1)+' % menor al plan. Evalúa compras y dotación para evitar gasto o inventario sin rotación.');
 const surplus=Math.max(0,r.stockUsableTotal-r.demand);
 if(surplus>0)add('warning','Stock potencial sin demanda en la jornada','Hay '+surplus.toLocaleString('es-CL')+' unidades utilizables por encima de la demanda real. No es merma, pero podría implicar capital inmovilizado.');
 for(const id of ['receiving','picking','transport']){
  const index={receiving:3,picking:6,transport:7}[id],st=r.stages[index];
  const isReinforced=(actions[id]||0)>0;
  const base=flow(decisions,{...actions,[id]:0},s);
  const delta=r.dispatched-base.dispatched;
  const costDelta=finance(r,s).margin-finance(base,s).margin;
  if(isReinforced&&delta===0)add('danger','Refuerzo sin expedición adicional: '+AREA_NAMES[id],'La medida no aumenta el despacho global y cambia el resultado operacional en '+Math.round(costDelta).toLocaleString('es-CL')+' CLP. Puede haber falta de flujo aguas arriba.');
  else if(isReinforced&&costDelta<0)add('warning','Revisar retorno del refuerzo: '+AREA_NAMES[id],'Se recuperan '+delta+' unidades, pero el resultado operacional disminuye '+Math.round(-costDelta).toLocaleString('es-CL')+' CLP.');
  if(st.input>st.capacity&&st.capacity>0)add('warning','Capacidad insuficiente: '+AREA_NAMES[id],'Ingresan '+st.input+' unidades a una capacidad de '+st.capacity+'. Evalúa dotación y beneficio marginal de ampliar.');
 }
 for(const id of ['receiving','inventory','picking']){
  const operators=s[id+'Operators'];
  const productivity=s[id+'UnitsPerHour'];
  const volume=id==='receiving'?r.delivered:id==='inventory'?Math.min(r.demand,r.stockUsableTotal):r.available;
  const necessary=Math.ceil(volume/(s.effectiveHours*productivity));
  const wage=s[id+'DailyWage'];
  if(operators>necessary&&operators>0){
   const excess=operators-necessary;
   add('warning','Dotación por encima de la carga: '+AREA_NAMES[id],excess+' persona(s) sobre la dotación teórica de '+necessary+' para '+volume+' unidades, con exposición de costo de '+Math.round(excess*wage).toLocaleString('es-CL')+' CLP. No es ahorro automáticamente realizable: valida dotación mínima, tareas indirectas y posibilidad de reasignación.');
  }
  if(operators<necessary&&volume>0)add('warning','Carga superior a dotación: '+AREA_NAMES[id], 'Se requieren teóricamente '+necessary+' personas frente a '+operators+' asignadas. Antes de contratar, revisa el flujo y las alternativas de turnos, productividad y reasignación.');
 }
 for(const x of data.result.filter(x=>x.over))add('warning','Sobrecosto en '+x.title,'Costo '+Math.round(x.cost).toLocaleString('es-CL')+' CLP frente a referencia '+Math.round(x.reference).toLocaleString('es-CL')+' CLP; tolerancia '+s.areaCostTolerance+' %. No implica que la decisión sea incorrecta si mejora el negocio.');
 if(r.dispatched/r.demand<s.targetFulfillment/100)add('danger','Meta de servicio no alcanzada','Solo '+(100*r.dispatched/r.demand).toFixed(1)+' % de demanda real puede expedirse, frente a meta de '+s.targetFulfillment+' %.');
 if(!messages.length)add('good','Sin alertas críticas del modelo','Se cumplen las condiciones revisadas. Esto no garantiza ausencia de riesgos reales.');
 return {messages,economics:data};
}
