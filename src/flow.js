import {NODES,numericValue,TOTAL_ORDERS} from './engine.js';
export const ACTIONS={
commercial:['Corregir desviación del forecast','puntos %',40,5],
planning:['Ampliar cobertura de reposición','puntos %',40,5],
purchasing:['Recuperar entregas de proveedor','puntos %',50,5],
receiving:['Agregar capacidad de recepción','unidades',500,25],
quality:['Acelerar liberación aprobada','puntos %',30,5],
inventory:['Habilitar stock de reserva','unidades',150,10],
picking:['Reforzar preparación','unidades',600,25],
transport:['Ampliar capacidad de salida','unidades',600,25]
};
export function flow(d={},a={}){
const q=id=>numericValue(id,d),x=id=>Math.max(0,Math.min(ACTIONS[id][2],Number(a[id])||0));
const demand=TOTAL_ORDERS,stock=250;
const forecast=q('commercial')+(q('commercial')>100?-1:1)*Math.min(x('commercial'),Math.abs(100-q('commercial')));
const estimated=Math.floor(demand*forecast/100),gap=Math.max(0,estimated-stock);
const ordered=Math.ceil(gap*(q('planning')+x('planning'))/100);
const delivered=Math.floor(ordered*Math.min(100,q('purchasing')+x('purchasing'))/100);
const received=Math.min(delivered,q('receiving')+x('receiving'));
const released=Math.floor(received*Math.min(100,q('quality')+x('quality'))/100);
const available=Math.min(demand,Math.floor((stock+released)*q('inventory')/100)+x('inventory'));
const picked=Math.min(available,q('picking')+x('picking'));
const dispatched=Math.min(picked,q('transport')+x('transport'));
const data=[
['commercial',demand,estimated,estimated,'Demanda real → forecast'],
['planning',gap,ordered,ordered,'Brecha forecast - stock inicial → compra solicitada'],
['purchasing',ordered,delivered,delivered,'Solicitud → entrega real del proveedor'],
['receiving',delivered,received,q('receiving')+x('receiving'),'Entrega → ingreso por capacidad'],
['quality',received,released,received,'Ingreso → liberación de calidad'],
['inventory',stock+released,available,Math.floor((stock+released)*q('inventory')/100)+x('inventory'),'Stock inicial + liberado + reserva habilitada'],
['picking',available,picked,q('picking')+x('picking'),'Stock disponible → preparación'],
['transport',picked,dispatched,q('transport')+x('transport'),'Preparado → expedición']
];
const stages=data.map(([id,input,output,capacity,detail])=>({id,input,output,capacity,detail,unit:'unidades'}));
return {stages,demand,stock,estimated,ordered,delivered,received,released,available,picked,dispatched,pending:demand-dispatched,actions:Object.fromEntries(NODES.map(n=>[n.id,x(n.id)]))};
}
export function diagnose(d={},a={}){
const current=flow(d,a);
const findings=NODES.map((n,i)=>{
const id=n.id,stage=current.stages[i],best=flow(d,{...a,[id]:ACTIONS[id][2]}),without=flow(d,{...a,[id]:0});
return {id,title:n.title,icon:n.icon,stage,potential:best.dispatched-current.dispatched,recovered:current.dispatched-without.dispatched,inherited:stage.input<stage.capacity,loss:Math.max(0,stage.input-stage.output)};
}).sort((a,b)=>b.potential-a.potential||b.loss-a.loss);
return {current,findings};
}
