import {NODES,PRODUCTS,PARAMETERS,DEFAULTS,numericValue,TOTAL_ORDERS} from './engine.js';
export const RECOVERY={
 commercial:[{id:'update',label:'Actualizar forecast con demanda real',note:'Corrige la demanda planificada antes de emitir nuevas compras.',effect:'forecast'}],
 planning:[{id:'replan',label:'Replanificar y solicitar faltantes',note:'Aumenta hasta 15 % la reposición sobre la brecha, si hay abastecimiento.',effect:'plan'}],
 purchasing:[{id:'alternate',label:'Proveedor alternativo para faltantes',note:'Recupera hasta 20 puntos de entregas oportunas, con límite de 100 %.',effect:'delivery'}],
 receiving:[{id:'extra',label:'Refuerzo de recepción',note:'Procesa hasta 250 unidades adicionales en la jornada.',effect:'receiving'}],
 quality:[{id:'priority',label:'Priorizar inspección de lotes críticos',note:'Hasta 10 puntos adicionales liberados; nunca omite controles.',effect:'quality'}],
 inventory:[{id:'reserve',label:'Liberar stock de reserva elegible',note:'Hasta 60 unidades adicionales por SKU, limitadas por reserva real y stock aprobado.',effect:'reserve'},{id:'replenish',label:'Reponer ubicaciones de picking',note:'Recupera hasta 5 puntos de disponibilidad de stock.',effect:'inventory'}],
 picking:[{id:'rebalance',label:'Rebalancear dotación y olas',note:'Hasta 350 líneas adicionales de preparación por jornada.',effect:'picking'}],
 transport:[{id:'routes',label:'Reorganizar rutas de salida',note:'Hasta 150 pedidos adicionales de capacidad de despacho.',effect:'transport'}]
};
const pct=(x,p)=>Math.floor(x*p/100);
const sum=a=>a.reduce((x,y)=>x+y,0);
const mixes=[0.6,0.8,0.5];
const effective=(id,d,r)=>{
 let v=numericValue(id,d);
 if(r?.[id]==='update'&&id==='commercial')v=100;
 if(r?.[id]==='replan'&&id==='planning')v=Math.min(130,v+15);
 if(r?.[id]==='alternate'&&id==='purchasing')v=Math.min(100,v+20);
 if(r?.[id]==='extra'&&id==='receiving')v+=250;
 if(r?.[id]==='priority'&&id==='quality')v=Math.min(100,v+10);
 if(r?.[id]==='replenish'&&id==='inventory')v=Math.min(100,v+5);
 if(r?.[id]==='rebalance'&&id==='picking')v+=350;
 if(r?.[id]==='routes'&&id==='transport')v+=150;
 return v;
};
export function flow(decisions={},recovery={}){
 const k=Object.fromEntries(NODES.map(n=>[n.id,effective(n.id,decisions,recovery)]));
 const forecast=k.commercial/100;
 const product=PRODUCTS.map((p,i)=>{
  const target=p.need,planned=Math.ceil(target*forecast);
  const gap=Math.max(0,planned-p.initial);
  const ordered=Math.ceil(gap*k.planning/100);
  const delivered=pct(ordered,k.purchasing);
  return {...p,target,planned,gap,ordered,delivered,reserveTotal:[80,100,70][i]};
 });
 const deliveredTotal=sum(product.map(p=>p.delivered));
 const receiveRatio=deliveredTotal?Math.min(1,k.receiving/deliveredTotal):0;
 product.forEach(p=>{p.received=Math.floor(p.delivered*receiveRatio);p.approved=pct(p.received,k.quality);
  p.usable=pct(p.initial+p.approved,k.inventory);
  p.reserveUsed=recovery.inventory==='reserve'?Math.min(60,p.reserveTotal):0;
  p.usable+=p.reserveUsed;
 });
 const purchased=sum(product.map(p=>p.ordered)),delivered=sum(product.map(p=>p.delivered)),received=sum(product.map(p=>p.received)),approved=sum(product.map(p=>p.approved));
 const plannedOrders=Math.min(TOTAL_ORDERS,Math.floor(TOTAL_ORDERS*forecast));
 const stockOrders=Math.min(TOTAL_ORDERS,...product.map((p,i)=>Math.floor(p.usable/mixes[i])));
 const pickingCapacity=Math.floor(k.picking/1.9),transportCapacity=k.transport;
 const picked=Math.max(0,Math.min(plannedOrders,stockOrders,pickingCapacity));
 const dispatched=Math.max(0,Math.min(picked,transportCapacity));
 const supplyStages=[
 {id:'commercial',unit:'pedidos',incoming:TOTAL_ORDERS,processed:plannedOrders,capacity:plannedOrders,reason:'Pedidos considerados por el forecast'},
 {id:'planning',unit:'unidades',incoming:sum(product.map(p=>p.gap)),processed:purchased,capacity:purchased,reason:'Unidades solicitadas sobre brecha prevista'},
 {id:'purchasing',unit:'unidades',incoming:purchased,processed:delivered,capacity:delivered,reason:'Unidades entregadas por proveedores'},
 {id:'receiving',unit:'unidades',incoming:delivered,processed:received,capacity:k.receiving,reason:'Ingreso físico limitado por recepción'},
 {id:'quality',unit:'unidades',incoming:received,processed:approved,capacity:received,reason:'Unidades liberadas tras inspección'},
 {id:'inventory',unit:'pedidos',incoming:plannedOrders,processed:Math.min(plannedOrders,stockOrders),capacity:stockOrders,reason:'Cobertura de pedidos con stock inicial + ingresos liberados + reserva elegible'},
 {id:'picking',unit:'pedidos',incoming:Math.min(plannedOrders,stockOrders),processed:picked,capacity:pickingCapacity,reason:'Pedidos preparables según líneas disponibles'},
 {id:'transport',unit:'pedidos',incoming:picked,processed:dispatched,capacity:transportCapacity,reason:'Pedidos expedibles, nunca más que los recibidos desde picking'}
 ];
 const limiting=supplyStages.filter(s=>['commercial','inventory','picking','transport'].includes(s.id)&&s.processed===dispatched).map(s=>s.id);
 return {product,stages:supplyStages,dispatched,pending:TOTAL_ORDERS-dispatched,plannedOrders,stockOrders,picked,limiting,metrics:k,received,approved,delivered,purchased};
}
export function diagnose(decisions={},recovery={}){
 const current=flow(decisions,recovery),findings=[];
 for(const n of NODES){
  const id=n.id,baseline=flow({...decisions,values:{...decisions.values,[id]:numericValue(id,{})}},recovery);
  const referenceDelta=baseline.dispatched-current.dispatched;
  const actions=(RECOVERY[id]||[]).filter(a=>recovery[id]!==a.id).map(a=>({area:id,action:a,delta:flow(decisions,{...recovery,[id]:a.id}).dispatched-current.dispatched}));
  const best=actions.sort((a,b)=>b.delta-a.delta)[0];
  findings.push({id,title:n.title,icon:n.icon,referenceDelta,improvement:best?.delta??0,action:best?.action,selected:recovery[id]||null,ownLoss:current.stages.find(s=>s.id===id)?.incoming-current.stages.find(s=>s.id===id)?.processed});
 }
 findings.sort((a,b)=>b.improvement-a.improvement||b.referenceDelta-a.referenceDelta||b.ownLoss-a.ownLoss);
 return {current,findings,priority:findings.filter(x=>x.improvement>0||x.referenceDelta>0).slice(0,5)};
}
