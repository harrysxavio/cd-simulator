import {flow} from './flow.js';
import {finance,cleanScenario} from './scenario.js';

export const AREA_NAMES={commercial:'Comercial',planning:'Planning',purchasing:'Compras',receiving:'Recepción',quality:'Calidad',inventory:'Inventario',picking:'Picking',transport:'Transporte'};
export function areaEconomics(decisions,actions,scenario){
 const s=cleanScenario(scenario),r=flow(decisions,actions,s),f=finance(r,s);
 const baseline=flow(decisions,{}, {...s,actualDemand:s.demand});
 const fb=finance(baseline,{...s,actualDemand:s.demand});
 const costs=(x,y)=>({
  commercial:y.actionCosts.commercial||0,
  planning:y.actionCosts.planning||0,
  purchasing:(y.actionCosts.purchasing||0)+y.urgentSurcharge,
  receiving:y.labor.receiving+y.recoveryLabor.receiving+(y.modeCosts.receiving||0),
  quality:(y.actionCosts.quality||0)+(y.modeCosts.quality||0),
  inventory:y.labor.inventory+(y.actionCosts.inventory||0)+(y.modeCosts.inventory||0),
  picking:y.labor.picking+y.recoveryLabor.picking+(y.modeCosts.picking||0)+y.packaging,
  transport:(y.actionCosts.transport||0)+(y.modeCosts.transport||0)+y.transport
 });
 const current=costs(r,f),reference=costs(baseline,fb);
 const tolerance=s.areaCostTolerance/100;
 const result=Object.keys(AREA_NAMES).map(id=>{
  const value=current[id],base=reference[id],over=value>base*(1+tolerance)+0.01;
  const additional=value-base;
  const status=over?'over':additional<0?'under':'ok';
  return {id,title:AREA_NAMES[id],cost:value,reference:base,delta:additional,over,status,
   label:over?'Sobrecosto frente a referencia':additional<0?'Menor gasto; validar volumen':'Dentro de tolerancia'};
 });
 return {result,current:r,finance:f,reference:baseline,referenceFinance:fb,tolerance:s.areaCostTolerance,
  allocatedCurrent:Object.values(current).reduce((a,b)=>a+b,0),
  allocatedReference:Object.values(reference).reduce((a,b)=>a+b,0)};
}
export function attentionSignals(decisions,actions,scenario){
 const s=cleanScenario(scenario),data=areaEconomics(decisions,actions,s);
 const r=data.current,f=data.finance;
 const messages=[];
 const add=(level,title,description)=>messages.push({level,title,description});
 if(r.demand>r.plannedDemand*1.05)add('warning','Demanda superior a lo previsto','La demanda real supera el plan en '+(100*(r.demand/r.plannedDemand-1)).toFixed(1)+' %. Comprueba stock, proveedores y capacidades antes de prometer servicio.');
 if(r.demand<r.plannedDemand*.95)add('warning','Demanda inferior a lo previsto','La demanda real es '+(100*(1-r.demand/r.plannedDemand)).toFixed(1)+' % menor al plan. Evalúa compras y dotación para evitar gasto o inventario sin rotación.');
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
 for(const x of data.result.filter(x=>x.over))add('warning','Sobrecosto en '+x.title,'Costo '+Math.round(x.cost).toLocaleString('es-CL')+' CLP frente a referencia '+Math.round(x.reference).toLocaleString('es-CL')+' CLP; tolerancia '+s.areaCostTolerance+' %. No implica que la decisión sea incorrecta si mejora el negocio.');
 if(r.dispatched/r.demand<s.targetFulfillment/100)add('danger','Meta de servicio no alcanzada','Solo '+(100*r.dispatched/r.demand).toFixed(1)+' % de demanda real puede expedirse, frente a meta de '+s.targetFulfillment+' %.');
 if(!messages.length)add('good','Sin alertas críticas del modelo','Se cumplen las condiciones revisadas. Esto no garantiza ausencia de riesgos reales.');
 return {messages,economics:data};
}
