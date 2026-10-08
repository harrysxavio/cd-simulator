export const PRODUCTS=[
{id:'perfume',name:'Perfume',icon:'🧴',perOrder:1,initial:380,need:600},
{id:'crema',name:'Crema corporal',icon:'🧴',perOrder:1,initial:470,need:800},
{id:'shampoo',name:'Shampoo',icon:'🫧',perOrder:1,initial:330,need:500}
];
export const NODES=[
{id:'commercial',title:'Comercial',icon:'📈',kpi:'Precisión del forecast',desc:'Valida la demanda de la campaña.',choices:[{id:'under',label:'Forecast conservador',note:'Subestima un 20 % de la demanda.',forecast:80},{id:'accurate',label:'Forecast basado en campaña',note:'Mantiene la demanda proyectada.',forecast:100},{id:'over',label:'Forecast optimista',note:'Sobrestima un 15 % de la demanda.',forecast:115}]},
{id:'planning',title:'Planning',icon:'🗓️',kpi:'Cobertura planificada',desc:'Define cuánto de la brecha de stock se repondrá.',choices:[{id:'partial',label:'Priorizar 70 % de faltantes',note:'Menos compra, mayor riesgo de quiebre.',coverage:70},{id:'full',label:'Cubrir toda la brecha',note:'Compra la necesidad calculada.',coverage:100},{id:'buffer',label:'Agregar colchón de 10 %',note:'Protege la campaña, con más inventario.',coverage:110}]},
{id:'purchasing',title:'Compras',icon:'🛒',kpi:'Entrega completa y oportuna',desc:'Selecciona un proveedor para la campaña.',choices:[{id:'cheap',label:'Proveedor económico',note:'Entrega 75 % antes del corte de campaña.',delivery:75},{id:'reliable',label:'Proveedor confiable',note:'Entrega 95 % antes del corte.',delivery:95},{id:'express',label:'Compra urgente',note:'Entrega 100 %, con mayor costo no modelado.',delivery:100}]},
{id:'receiving',title:'Recepción',icon:'📦',kpi:'Unidades recibidas por jornada',desc:'Asigna capacidad para ingresar lo entregado.',choices:[{id:'low',label:'Turno reducido',note:'Capacidad para 350 unidades.',capacity:350},{id:'normal',label:'Turno normal',note:'Capacidad para 650 unidades.',capacity:650},{id:'extra',label:'Refuerzo de recepción',note:'Capacidad para 1.000 unidades.',capacity:1000}]},
{id:'quality',title:'Calidad',icon:'🛡️',kpi:'Unidades liberadas',desc:'Elige la capacidad de inspección y liberación sin omitir controles.',choices:[{id:'slow',label:'Capacidad limitada',note:'Libera 75 % de unidades recibidas en la jornada.',release:75},{id:'normal',label:'Inspección normal',note:'Libera 95 % de unidades recibidas.',release:95},{id:'priority',label:'Priorización de lotes críticos',note:'Libera 100 % dentro de la jornada, si cumplen los controles.',release:100}]},
{id:'inventory',title:'Inventario',icon:'🗃️',kpi:'Stock disponible para picking',desc:'Decide cómo se asegura la disponibilidad en ubicaciones.',choices:[{id:'weak',label:'Ubicaciones sin conciliar',note:'Solo 85 % del stock puede prometerse.',accuracy:85},{id:'normal',label:'Control habitual',note:'95 % de stock utilizable.',accuracy:95},{id:'count',label:'Conciliación y reposición',note:'99 % utilizable para preparar pedidos.',accuracy:99}]},
{id:'picking',title:'Picking',icon:'🧺',kpi:'Líneas preparadas por jornada',desc:'Balancea recursos de preparación.',choices:[{id:'low',label:'Dotación reducida',note:'1.400 líneas por jornada.',lines:1400},{id:'normal',label:'Dotación habitual',note:'2.300 líneas por jornada.',lines:2300},{id:'reinforce',label:'Refuerzo de picking',note:'3.000 líneas por jornada.',lines:3000}]},
{id:'transport',title:'Transporte',icon:'🚚',kpi:'Pedidos expedibles por jornada',desc:'Define la capacidad de salida del CD.',choices:[{id:'low',label:'Rutas limitadas',note:'500 pedidos por jornada.',capacity:500},{id:'normal',label:'Plan normal',note:'800 pedidos por jornada.',capacity:800},{id:'extra',label:'Refuerzo de transporte',note:'1.000 pedidos por jornada.',capacity:1000}]}
];
export const DEFAULTS={commercial:'accurate',planning:'full',purchasing:'cheap',receiving:'normal',quality:'normal',inventory:'normal',picking:'normal',transport:'normal'};
export const START={commercial:'accurate'};
export const TOTAL_ORDERS=1000;
export function choice(nodeId,choiceId){const node=NODES.find(n=>n.id===nodeId);return node?.choices.find(c=>c.id===choiceId)??node?.choices.find(c=>c.id===DEFAULTS[nodeId]);}
export function evaluate(decisions={}){
const settings=Object.fromEntries(NODES.map(n=>[n.id,choice(n.id,decisions[n.id]??DEFAULTS[n.id])]));
const forecastFactor=settings.commercial.forecast/100,planningFactor=settings.planning.coverage/100;
const demand=PRODUCTS.map(p=>({...p,forecast:Math.ceil(p.need*forecastFactor),gap:Math.max(0,Math.ceil(p.need*forecastFactor)-p.initial)}));
const ordered=demand.map(p=>Math.ceil(p.gap*planningFactor));
const delivered=ordered.map(q=>Math.floor(q*settings.purchasing.delivery/100));
const totalDelivered=delivered.reduce((a,b)=>a+b,0);
const ratio=totalDelivered?Math.min(1,settings.receiving.capacity/totalDelivered):0;
const received=delivered.map(q=>Math.floor(q*ratio));
const approved=received.map(q=>Math.floor(q*settings.quality.release/100));
const sku=demand.map((p,i)=>({...p,ordered:ordered[i],delivered:delivered[i],received:received[i],approved:approved[i],usable:Math.floor((p.initial+approved[i])*settings.inventory.accuracy/100)}));
const forecastOrders=Math.floor(TOTAL_ORDERS*forecastFactor);
const demandKits=sku.map(p=>Math.floor(p.usable/p.perOrder));
const mix=[0.6,0.8,0.5]; // Fraction of the 1,000 customer orders requiring each product.
const stockLimit=Math.min(...sku.map((p,i)=>Math.floor(p.usable/mix[i])));
const pickLimit=Math.floor(settings.picking.lines/1.9); // 0.6+0.8+0.5 expected lines/order
const transportLimit=settings.transport.capacity;
const result=Math.min(TOTAL_ORDERS,forecastOrders,stockLimit,pickLimit,transportLimit);
const stage=[
{id:'commercial',value:Math.min(TOTAL_ORDERS,forecastOrders),label:'Pedidos considerados por forecast'},
{id:'planning',value:ordered.reduce((a,b)=>a+b,0),label:'Unidades ordenadas'},
{id:'purchasing',value:totalDelivered,label:'Unidades entregadas'},
{id:'receiving',value:received.reduce((a,b)=>a+b,0),label:'Unidades recibidas'},
{id:'quality',value:approved.reduce((a,b)=>a+b,0),label:'Unidades liberadas'},
{id:'inventory',value:stockLimit,label:'Pedidos con stock (mix estimado)'},
{id:'picking',value:pickLimit,label:'Pedidos según líneas de picking'},
{id:'transport',value:transportLimit,label:'Pedidos con capacidad de salida'}];
const constraints=[{id:'commercial',value:Math.min(TOTAL_ORDERS,forecastOrders)},{id:'inventory',value:stockLimit},{id:'picking',value:pickLimit},{id:'transport',value:transportLimit}];
const limiting=constraints.filter(x=>x.value===result).map(x=>x.id);
return {settings,sku,stage,result,pending:TOTAL_ORDERS-result,forecastOrders,stockLimit,pickLimit,transportLimit,limiting,delivered:totalDelivered,received:received.reduce((a,b)=>a+b,0),approved:approved.reduce((a,b)=>a+b,0)};
}
export function impacts(decisions){
const now=evaluate(decisions),items=[];
for(const node of NODES){const current=decisions[node.id]??DEFAULTS[node.id];const options=node.choices.filter(c=>c.id!==current).map(c=>{const next=evaluate({...decisions,[node.id]:c.id});return {node,choice:c,delta:next.result-now.result,next}}).filter(x=>x.delta>0);if(options.length){options.sort((a,b)=>b.delta-a.delta);items.push(options[0])}}
items.sort((a,b)=>b.delta-a.delta);
return items;
}
export function upstreamCause(result){
if(result.limiting.includes('inventory')){
const weakest=result.sku.reduce((a,b)=>a.usable/(a.forecast||1)<b.usable/(b.forecast||1)?a:b);
return {id:'inventory',text:'Inventario limita el cumplimiento. Revisa la disponibilidad de '+weakest.name+' y sus causas aguas arriba: planificación, proveedor, recepción y liberación de calidad.'};
}
if(result.limiting.includes('commercial'))return {id:'commercial',text:'El forecast considera menos pedidos que la demanda real. Revisa la planificación antes de comprometer disponibilidad.'};
if(result.limiting.includes('picking'))return {id:'picking',text:'Picking es la restricción de capacidad. Revisa balanceo y dotación, después de confirmar stock.'};
if(result.limiting.includes('transport'))return {id:'transport',text:'Transporte limita la expedición. Revisa capacidad de salida antes de aumentar picking.'};
return {id:null,text:'El lote está cubierto por las capacidades modeladas.'};
}
