import {NODES,DEFAULTS,START,PARAMETERS,numericValue} from './engine.js?v=70';
import {flow,diagnose,ACTIONS} from './flow.js?v=70';
import {DEFAULT_SCENARIO,FIELDS,cleanScenario,finance} from './scenario.js?v=70';
const $=id=>document.getElementById(id),KEY='supply-lab-v62';
let decisions={...START,values:{}},actions={},active=0,phase='plan',scenario={...DEFAULT_SCENARIO};
const fmt=n=>Math.round(n).toLocaleString('es-CL');
function add(root,tag,cls,t){const e=document.createElement(tag);e.className=cls||'';if(t!==undefined)e.textContent=t;root.append(e);return e}
function save(){try{localStorage.setItem(KEY,JSON.stringify({decisions,actions,active,phase,scenario}))}catch{}}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(!s)return;scenario=cleanScenario(s.scenario||{});for(const n of NODES){if(n.choices.some(c=>c.id===s.decisions?.[n.id]))decisions[n.id]=s.decisions[n.id];const v=s.decisions?.values?.[n.id],p=PARAMETERS[n.id];if(v!==undefined&&Number.isFinite(+v)&&+v>=p.min&&+v<=p.max)decisions.values[n.id]=+v;if(Number.isFinite(+s.actions?.[n.id]))actions[n.id]=Math.max(0,Math.min(ACTIONS[n.id][2],+s.actions[n.id]))}active=Math.max(0,Math.min(7,s.active||0));phase=s.phase==='recover'?'recover':'plan'}catch{}}
function nav(i){active=i;save();render();$('mission').scrollIntoView({behavior:'smooth',block:'start'})}
function showSection(name){
for(const x of ['setup','operations','preliminary','recovery','dashboard']){$(x+'Section').hidden=x!==name;$(x+'Tab').setAttribute('aria-selected',String(x===name))}
if(name==='recovery'){$('recoveryHost').append($('mission'));phase='recover'}
if(name==='operations'){$('operationHost').append($('mission'));phase='plan'}
save();render();
}
function setup(){
const root=$('scenarioFields');root.replaceChildren();
for(const [key,label,unit,min,max,step] of FIELDS){
const box=add(root,'div','setup-field');add(box,'label','',label+' ('+unit+')');
const input=add(box,'input','numeric-input');input.type='number';input.min=min;input.max=max;input.step=step;input.value=scenario[key];
input.setAttribute('aria-label',label);
input.onchange=()=>{const v=Number(input.value);if(input.value===''||!Number.isFinite(v)||v<min||v>max){input.value=scenario[key];return}scenario[key]=v;save();render()};
}}
function dashboard(r){
 const f=finance(r,scenario),money=v=>'$'+Math.round(v).toLocaleString('es-CL');
 const cards=$('financeMetrics');cards.replaceChildren();
 const values=[['Unidades expedidas',fmt(r.dispatched)],['Costo por unidad',f.costPerUnit===null?'N/D':money(f.costPerUnit)],['Meta costo unitario',money(scenario.maxCostPerUnit)],['Ingreso estimado',money(f.revenue)],['Margen estimado',money(f.margin)],['Costo personal',money(f.laborTotal)],['Productividad Picking',scenario.pickingOperators?(r.picked/scenario.pickingOperators).toFixed(1)+' unid./operario':'N/D'],['Uso capacidad Picking',r.stages[6].capacity?(100*r.picked/r.stages[6].capacity).toFixed(1)+'%':'N/D'],['Cumple meta',f.meetsTarget?'Sí':'No']];
 for(const [label,value] of values){const c=add(cards,'div','metric');add(c,'span','',label);add(c,'strong','',value)}
 $('costTotalHero').textContent=money(f.total);
 const budget=r.dispatched*scenario.maxCostPerUnit,over=f.total>budget;
 const status=$('costTotalStatus');status.className='cost-status '+(over?'status-bad':'status-good');
 status.textContent=r.dispatched===0?'Sin expedición':over?'Sobre meta: +'+money(f.total-budget):'Dentro de meta';
 const baseline=finance(r,DEFAULT_SCENARIO);
 const items=[
 ['Personal de inventario',f.labor.inventory,baseline.labor.inventory],
 ['Personal de picking',f.labor.picking,baseline.labor.picking],
 ['Personal de recepción',f.labor.receiving,baseline.labor.receiving],
 ['Refuerzos de recuperación',f.recoveryLaborTotal,baseline.recoveryLaborTotal],
 ['Compra de unidades recibidas',f.purchase,baseline.purchase],
 ['Empaque de unidades preparadas',f.packaging,baseline.packaging],
 ['Transporte de unidades expedidas',f.transport,baseline.transport],
 ['Otros costos fijos',f.fixed,baseline.fixed]
 ];
 const baselineTotal=items.reduce((acc,item)=>acc+item[2],0);
 const costs=$('costBreakdown');costs.replaceChildren();
 for(const [label,value,reference] of items){
 const allocation=baselineTotal>0?budget*reference/baselineTotal:0;
 const excess=value>allocation+0.5,delta=value-allocation;
 const row=add(costs,'div','cost-line '+(excess?'cost-over':'cost-ok'));
 const head=add(row,'div','cost-line-head');add(head,'strong','',label);add(head,'strong','',money(value));
 add(row,'small','', 'Presupuesto de referencia: '+money(allocation)+' · '+(excess?'Sobrecosto '+money(delta):'Dentro de referencia'));
 }
 $('financialInsight').textContent=r.dispatched===0?'No es posible calcular costo unitario sin expedición.':over?'El costo total supera el presupuesto de '+money(budget)+' calculado con la meta de '+money(scenario.maxCostPerUnit)+' por unidad. Abre el desglose para identificar conceptos que exceden su referencia.':'El costo total está dentro del presupuesto de '+money(budget)+' según tu meta por unidad. Puedes abrir el desglose para revisar desviaciones individuales.';
}


function renderDiagnosis(current){
 const initial=flow(decisions,{},scenario),baselineFinance=finance(initial,scenario),nowFinance=finance(current,scenario);
 const pct=(v,d)=>d>0?(100*v/d).toFixed(1).replace('.',',')+'%':'N/D';
 const money=v=>'
const r=flow(decisions,actions,scenario),diag=diagnose(decisions,actions,scenario),n=NODES[active],st=r.stages[active];setup();dashboard(r);
$('completed').textContent=fmt(r.dispatched);$('pending').textContent=fmt(r.pending);$('fulfillment').textContent=(r.dispatched/r.demand*100).toFixed(1).replace('.',',')+'%';
$('forecastNotice').textContent=phase==='plan'?'Planificación: las áreas pendientes usan valores iniciales; el resultado es provisional.':'Recuperación: define cuánto esfuerzo correctivo aplicar en cada área (0 = no actuar).';
$('progressText').textContent=NODES.filter(x=>decisions[x.id]).length+' de 8 áreas planificadas · '+(phase==='plan'?'Planificación':'Recuperación');
$('progressFill').style.width=NODES.filter(x=>decisions[x.id]).length/8*100+'%';
const map=$('roadmap');map.replaceChildren();NODES.forEach((x,i)=>{const b=add(map,'button','node '+(i===active?'current':decisions[x.id]?'done':''));add(b,'span','node-icon',x.icon);const c=add(b,'span','node-content');add(c,'strong','',String(i+1).padStart(2,'0')+' · '+x.title);add(c,'small','',actions[x.id]?'Recuperación aplicada: '+actions[x.id]+' '+ACTIONS[x.id][1]:decisions[x.id]?'Planificado':'Pendiente');add(b,'span','node-state',i===active?'●':'→');b.onclick=()=>nav(i)});
$('missionNumber').textContent=(phase==='plan'?'PLANIFICAR':'RECUPERAR')+' · '+(active+1)+' / 8';$('missionTitle').textContent=n.icon+' '+n.title;$('missionDescription').textContent=n.desc;$('missionKpi').textContent=n.kpi;
const choices=$('choices');choices.replaceChildren();if(phase==='plan'){add(choices,'h3','','Decisión inicial');n.choices.forEach(c=>{const b=add(choices,'button','choice '+((decisions[n.id]??DEFAULTS[n.id])===c.id?'selected':''));add(b,'strong','',c.label);add(b,'small','',c.note);b.onclick=()=>{decisions[n.id]=c.id;decisions.values[n.id]=c[PARAMETERS[n.id].key];save();render()}});
const p=PARAMETERS[n.id],control=add(choices,'div','numeric-control');control.hidden=phase==='recover';add(control,'label','',p.label+' ('+p.unit.trim()+')');add(control,'p','muted',p.hint);const row=add(control,'div','numeric-row'),input=add(row,'input','numeric-input');input.type='number';input.min=p.min;input.max=p.max;input.step=p.step;input.value=numericValue(n.id,decisions);input.onchange=()=>{const v=+input.value;if(input.value===''||!Number.isFinite(v)||v<p.min||v>p.max){alert('Valor permitido: '+p.min+' a '+p.max);return}decisions[n.id]=decisions[n.id]??DEFAULTS[n.id];decisions.values[n.id]=v;save();render()};
}const box=add(choices,'div','flow-summary');add(box,'strong','','Relación con las otras áreas');add(box,'p','','Recibe '+fmt(st.input)+' → entrega '+fmt(st.output)+' unidades. Capacidad '+fmt(st.capacity)+'.');add(box,'small','',st.detail);
if(phase==='recover'){const cfg=ACTIONS[n.id];add(choices,'h3','','Medida correctiva opcional');add(choices,'p','muted',cfg[0]+'. Elige 0 para no aplicar cambios.');const rr=add(choices,'div','numeric-control');const label=add(rr,'label','','Cantidad a aplicar: '+(actions[n.id]||0)+' '+cfg[1]);const line=add(rr,'div','numeric-row'),num=add(line,'input','numeric-input'),slider=add(line,'input','numeric-range');for(const x of [num,slider]){x.type=x===num?'number':'range';x.min=0;x.max=cfg[2];x.step=cfg[3];x.value=actions[n.id]||0}const apply=v=>{if(v===''||!Number.isFinite(+v)||+v<0||+v>cfg[2])return;actions[n.id]=+v;save();render()};num.onchange=()=>apply(num.value);slider.onchange=()=>apply(slider.value);const max=flow(decisions,{...actions,[n.id]:cfg[2]},scenario);add(rr,'small','','Potencial máximo individual: +'+fmt(Math.max(0,max.dispatched-r.dispatched))+' unidades expedibles, con otras áreas constantes.')}
$('nodeResult').textContent='Entrada: '+fmt(st.input)+' · Salida: '+fmt(st.output)+' · Capacidad: '+fmt(st.capacity)+' unidades. '+(st.input<st.capacity?'Parte de la capacidad puede estar ociosa por falta de flujo heredado.':st.output<st.input?'Esta área reduce el flujo que recibe la siguiente.':'Sin pérdida adicional en esta etapa.');
$('prev').disabled=active===0;$('next').textContent=active===7?(phase==='plan'?'Iniciar recuperación →':'Ver diagnóstico →'):'Siguiente área →';
const list=$('results');list.replaceChildren();
r.stages.forEach((stage,i)=>{
 const area=NODES[i],lost=Math.max(0,stage.input-stage.output);
 const card=add(list,'details','flow-step');
 const summary=add(card,'summary','flow-step-summary');
 const badge=add(summary,'span','flow-step-index',String(i+1).padStart(2,'0'));
 const label=add(summary,'span','flow-step-title');
 add(label,'strong','',area.icon+' '+area.title);
 add(label,'small','',lost>0?'Reduce '+fmt(lost)+' unidades en esta etapa':'Sin pérdida de entrada');
 const value=add(summary,'span','flow-step-value',fmt(stage.output)+' unid.');
 const body=add(card,'div','flow-step-detail');
 const stats=add(body,'div','flow-step-stats');
 for(const [name,amount] of [['Entrada',stage.input],['Salida',stage.output],['Capacidad',stage.capacity]]){const cell=add(stats,'div','');add(cell,'small','',name);add(cell,'strong','',fmt(amount))}
 add(body,'p','muted',stage.detail);
 add(body,'p','muted',i===5?'Inventario combina stock inicial, unidades liberadas y reservas elegibles.':i>0?'La entrada depende de lo entregado por el área anterior.':'Comercial establece el pronóstico para la planificación.');
 if(stage.input>0&&i!==5){const bar=add(body,'div','flow-bar'),fill=add(bar,'div','flow-bar-fill');fill.style.width=Math.min(100,stage.output/stage.input*100)+'%'}
});
$('sku').replaceChildren();
for(const [label,value] of [['Demanda real',r.demand],['Stock inicial',r.stock],['Compra solicitada',r.ordered],['Entrega proveedor',r.delivered],['Recepción',r.received],['Liberación Calidad',r.released],['Stock disponible',r.available],['Preparado',r.picked],['Expedido',r.dispatched]]){
 const item=add($('sku'),'div','stage-result');add(item,'span','',label);add(item,'strong','',fmt(value)+' unid.');
}
$('cause').textContent='Transporte recibe '+fmt(r.picked)+' unidades desde Picking y despacha '+fmt(r.dispatched)+'. Su capacidad es '+fmt(r.stages[7].capacity)+'. '+(r.picked<r.stages[7].capacity?'Capacidad ociosa por falta de flujo o demanda aguas arriba.':'El despacho está limitado por capacidad o disponibilidad.');
renderDiagnosis(r);const causes=$('rootCauses');causes.replaceChildren();diag.findings.forEach(f=>{const item=add(causes,'div','action');add(item,'span','action-index',f.icon);const body=add(item,'div','');add(body,'strong','',f.title);add(body,'small','','Recibe '+fmt(f.stage.input)+' · entrega '+fmt(f.stage.output)+' · capacidad '+fmt(f.stage.capacity)+'. '+(f.inherited?'Capacidad mayor que la entrada: restricción heredada.':'')+' Recuperación aplicada: +'+fmt(f.recovered)+' · potencial adicional: +'+fmt(f.potential)+'.')});
const opts=$('actions');opts.replaceChildren();diag.findings.forEach(f=>{const item=add(opts,'div','action'),body=add(item,'div','');add(body,'strong','',f.title+' · '+ACTIONS[f.id][0]);add(body,'small','','Elegido: '+(actions[f.id]||0)+' / '+ACTIONS[f.id][2]+' '+ACTIONS[f.id][1]+' · Mejora potencial adicional: +'+fmt(f.potential));const b=add(item,'button','mini','Configurar');b.onclick=()=>{phase='recover';showSection('recovery');nav(NODES.findIndex(n=>n.id===f.id))}});
$('riskCount').textContent=String(diag.findings.filter(f=>f.stage.output<f.stage.input).length);$('focus').textContent=diag.findings.filter(f=>f.potential>0).slice(0,3).map(f=>f.title).join(', ')||'Sin mejoras individuales';$('report').hidden=false;
}
$('prev').onclick=()=>nav(Math.max(0,active-1));
$('next').onclick=()=>{if(!decisions[NODES[active].id])decisions[NODES[active].id]=DEFAULTS[NODES[active].id];if(active<7)active++;else if(phase==='plan'){active=0;showSection('preliminary')}else{render();showSection('dashboard');$('report').scrollIntoView({behavior:'smooth',block:'start'});return}save();render();$('mission').scrollIntoView({behavior:'smooth',block:'start'})};
$('reset').onclick=()=>{if(!confirm('¿Reiniciar la campaña?'))return;decisions={...START,values:{}};actions={};active=0;phase='plan';save();render();showSection('operations');showSection('operations')};
$('openReport').onclick=()=>{save();render();showSection('preliminary');$('report').scrollIntoView({behavior:'smooth',block:'start'})};
$('export').onclick=()=>{const r=flow(decisions,actions,scenario),rows=[['Área','Entrada','Salida','Capacidad','Recuperación'],...r.stages.map(s=>[NODES.find(n=>n.id===s.id).title,s.input,s.output,s.capacity,actions[s.id]||0])];const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='supply-chain-cadena.csv';document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url)};
$('setupTab').onclick=()=>showSection('setup');
$('operationsTab').onclick=()=>showSection('operations');
$('preliminaryTab').onclick=()=>showSection('preliminary');
$('startRecovery').onclick=()=>showSection('recovery');
$('recoveryTab').onclick=()=>showSection('recovery');
$('dashboardTab').onclick=()=>showSection('dashboard');
$('beginExercise').onclick=()=>showSection('operations');
$('resetScenario').onclick=()=>{scenario={...DEFAULT_SCENARIO};save();render()};
load();render();showSection('operations');
+Math.round(v).toLocaleString('es-CL');
 const prelim=$('preliminaryMetrics');prelim.replaceChildren();
 const metrics=[['Cumplimiento inicial',pct(initial.dispatched,initial.demand)],['Productividad Picking',scenario.pickingOperators?(initial.picked/scenario.pickingOperators).toFixed(1)+' unid./operario':'N/D'],['Utilización Picking',pct(initial.picked,initial.stages[6].capacity)],['Costo unitario inicial',baselineFinance.costPerUnit===null?'N/D':money(baselineFinance.costPerUnit)],['Brecha de campaña',fmt(initial.pending)+' unid.']];
 for(const [name,value] of metrics){const item=add(prelim,'div','metric');add(item,'span','',name);add(item,'strong','',value)}
 const root=$('preliminaryFindings');root.replaceChildren();
 const narratives={
 commercial:'Un pronóstico inferior a la demanda real puede reducir la reposición; uno superior puede comprometer recursos sin salida equivalente.',
 planning:'La cobertura de la brecha determina cuánto se solicita. Comprar menos puede provocar falta de stock, incluso si Picking tiene capacidad disponible.',
 purchasing:'El cumplimiento del proveedor determina qué proporción de la compra llega antes del corte operativo.',
 receiving:'Una recepción saturada retrasa la disponibilidad para Calidad e Inventario, aunque el proveedor haya entregado.',
 quality:'La liberación es un requisito antes de poner unidades a disposición. Acelerar no significa omitir controles.',
 inventory:'La disponibilidad combina existencias iniciales y unidades liberadas. El indicador de Picking puede caer por falta de stock, no por baja capacidad del equipo.',
 picking:'La productividad observada depende tanto de la dotación como de las unidades que Inventario pone a disposición.',
 transport:'La expedición depende de la preparación previa; capacidad ociosa no necesariamente indica un problema del transportista.'
 };
 const lossLabels={commercial:'Error absoluto de forecast',planning:'Cobertura de brecha',purchasing:'Cumplimiento proveedor',receiving:'Productividad por operario',quality:'Tasa de liberación',inventory:'Disponibilidad sobre demanda',picking:'Productividad por operario',transport:'Utilización de transporte'};
 const indicators={
 commercial:pct(Math.abs(initial.estimated-initial.demand),initial.demand),
 planning:pct(initial.ordered,Math.max(1,initial.estimated-initial.stock)),
 purchasing:pct(initial.delivered,initial.ordered),
 receiving:scenario.receivingOperators?(initial.received/scenario.receivingOperators).toFixed(1)+' unid./operario':'N/D',
 quality:pct(initial.released,initial.received),
 inventory:pct(initial.available,initial.demand),
 picking:scenario.pickingOperators?(initial.picked/scenario.pickingOperators).toFixed(1)+' unid./operario':'N/D',
 transport:pct(initial.dispatched,initial.stages[7].capacity)
 };
 const diagnostics=diagnose(decisions,{},scenario).findings;
 for(const f of diagnostics){
 const block=add(root,'div','diagnosis-card');const head=add(block,'div','diagnosis-head');
 add(head,'strong','',f.icon+' '+f.title);add(head,'span','diagnosis-indicator',lossLabels[f.id]+': '+indicators[f.id]);
 const delta=Math.max(0,f.stage.input-f.stage.output);
 add(block,'p','',narratives[f.id]);
 add(block,'p','muted',delta?'En esta etapa hay una diferencia de '+fmt(delta)+' unidades entre entrada y salida. No todas las diferencias equivalen a pérdidas recuperables: revisa el flujo y la capacidad.':'No se observa una reducción directa de entrada a salida en esta etapa.');
 if(f.inherited)add(block,'p','diagnosis-note','Existe capacidad mayor que el flujo recibido. Aumentarla sin resolver el suministro anterior puede elevar costos sin mejorar la expedición.');
 const b=add(block,'button','mini','Evaluar medida en recuperación →');b.onclick=()=>{active=NODES.findIndex(n=>n.id===f.id);showSection('recovery')};
 }
 const comparison=$('finalComparison');comparison.replaceChildren();
 const delta=current.dispatched-initial.dispatched,increment=nowFinance.total-baselineFinance.total;
 const finalMetrics=[['Cumplimiento antes',pct(initial.dispatched,initial.demand)],['Cumplimiento después',pct(current.dispatched,current.demand)],['Unidades adicionales',fmt(delta)],['Costo incremental',money(increment)],['Costo por unidad adicional',delta>0?money(increment/delta):'Sin mejora global'],['Productividad Picking antes',scenario.pickingOperators?(initial.picked/scenario.pickingOperators).toFixed(1):'N/D'],['Productividad Picking después',scenario.pickingOperators?(current.picked/scenario.pickingOperators).toFixed(1):'N/D']];
 for(const [name,value] of finalMetrics){const item=add(comparison,'div','metric');add(item,'span','',name);add(item,'strong','',value)}
 const rec=$('recoverySummary');rec.replaceChildren();
 const note=add(rec,'p','summary','Antes: '+fmt(initial.dispatched)+' unidades expedibles ('+pct(initial.dispatched,initial.demand)+'). Con las medidas actuales: '+fmt(current.dispatched)+' ('+pct(current.dispatched,current.demand)+'). Cambio: '+(delta>=0?'+':'')+fmt(delta)+' unidades. Costo adicional modelado: '+money(increment)+'.');
 if(delta===0)add(rec,'p','diagnosis-note','Las medidas elegidas todavía no mejoran la expedición total. Puede existir una restricción en otra área. Revisa el diagnóstico preliminar antes de incrementar más recursos.');
}

function render(){
const r=flow(decisions,actions,scenario),diag=diagnose(decisions,actions,scenario),n=NODES[active],st=r.stages[active];setup();dashboard(r);
$('completed').textContent=fmt(r.dispatched);$('pending').textContent=fmt(r.pending);$('fulfillment').textContent=(r.dispatched/r.demand*100).toFixed(1).replace('.',',')+'%';
$('forecastNotice').textContent=phase==='plan'?'Planificación: las áreas pendientes usan valores iniciales; el resultado es provisional.':'Recuperación: define cuánto esfuerzo correctivo aplicar en cada área (0 = no actuar).';
$('progressText').textContent=NODES.filter(x=>decisions[x.id]).length+' de 8 áreas planificadas · '+(phase==='plan'?'Planificación':'Recuperación');
$('progressFill').style.width=NODES.filter(x=>decisions[x.id]).length/8*100+'%';
const map=$('roadmap');map.replaceChildren();NODES.forEach((x,i)=>{const b=add(map,'button','node '+(i===active?'current':decisions[x.id]?'done':''));add(b,'span','node-icon',x.icon);const c=add(b,'span','node-content');add(c,'strong','',String(i+1).padStart(2,'0')+' · '+x.title);add(c,'small','',actions[x.id]?'Recuperación aplicada: '+actions[x.id]+' '+ACTIONS[x.id][1]:decisions[x.id]?'Planificado':'Pendiente');add(b,'span','node-state',i===active?'●':'→');b.onclick=()=>nav(i)});
$('missionNumber').textContent=(phase==='plan'?'PLANIFICAR':'RECUPERAR')+' · '+(active+1)+' / 8';$('missionTitle').textContent=n.icon+' '+n.title;$('missionDescription').textContent=n.desc;$('missionKpi').textContent=n.kpi;
const choices=$('choices');choices.replaceChildren();if(phase==='plan'){add(choices,'h3','','Decisión inicial');n.choices.forEach(c=>{const b=add(choices,'button','choice '+((decisions[n.id]??DEFAULTS[n.id])===c.id?'selected':''));add(b,'strong','',c.label);add(b,'small','',c.note);b.onclick=()=>{decisions[n.id]=c.id;decisions.values[n.id]=c[PARAMETERS[n.id].key];save();render()}});
const p=PARAMETERS[n.id],control=add(choices,'div','numeric-control');control.hidden=phase==='recover';add(control,'label','',p.label+' ('+p.unit.trim()+')');add(control,'p','muted',p.hint);const row=add(control,'div','numeric-row'),input=add(row,'input','numeric-input');input.type='number';input.min=p.min;input.max=p.max;input.step=p.step;input.value=numericValue(n.id,decisions);input.onchange=()=>{const v=+input.value;if(input.value===''||!Number.isFinite(v)||v<p.min||v>p.max){alert('Valor permitido: '+p.min+' a '+p.max);return}decisions[n.id]=decisions[n.id]??DEFAULTS[n.id];decisions.values[n.id]=v;save();render()};
}const box=add(choices,'div','flow-summary');add(box,'strong','','Relación con las otras áreas');add(box,'p','','Recibe '+fmt(st.input)+' → entrega '+fmt(st.output)+' unidades. Capacidad '+fmt(st.capacity)+'.');add(box,'small','',st.detail);
if(phase==='recover'){const cfg=ACTIONS[n.id];add(choices,'h3','','Medida correctiva opcional');add(choices,'p','muted',cfg[0]+'. Elige 0 para no aplicar cambios.');const rr=add(choices,'div','numeric-control');const label=add(rr,'label','','Cantidad a aplicar: '+(actions[n.id]||0)+' '+cfg[1]);const line=add(rr,'div','numeric-row'),num=add(line,'input','numeric-input'),slider=add(line,'input','numeric-range');for(const x of [num,slider]){x.type=x===num?'number':'range';x.min=0;x.max=cfg[2];x.step=cfg[3];x.value=actions[n.id]||0}const apply=v=>{if(v===''||!Number.isFinite(+v)||+v<0||+v>cfg[2])return;actions[n.id]=+v;save();render()};num.onchange=()=>apply(num.value);slider.onchange=()=>apply(slider.value);const max=flow(decisions,{...actions,[n.id]:cfg[2]},scenario);add(rr,'small','','Potencial máximo individual: +'+fmt(Math.max(0,max.dispatched-r.dispatched))+' unidades expedibles, con otras áreas constantes.')}
$('nodeResult').textContent='Entrada: '+fmt(st.input)+' · Salida: '+fmt(st.output)+' · Capacidad: '+fmt(st.capacity)+' unidades. '+(st.input<st.capacity?'Parte de la capacidad puede estar ociosa por falta de flujo heredado.':st.output<st.input?'Esta área reduce el flujo que recibe la siguiente.':'Sin pérdida adicional en esta etapa.');
$('prev').disabled=active===0;$('next').textContent=active===7?(phase==='plan'?'Iniciar recuperación →':'Ver diagnóstico →'):'Siguiente área →';
const list=$('results');list.replaceChildren();
r.stages.forEach((stage,i)=>{
 const area=NODES[i],lost=Math.max(0,stage.input-stage.output);
 const card=add(list,'details','flow-step');
 const summary=add(card,'summary','flow-step-summary');
 const badge=add(summary,'span','flow-step-index',String(i+1).padStart(2,'0'));
 const label=add(summary,'span','flow-step-title');
 add(label,'strong','',area.icon+' '+area.title);
 add(label,'small','',lost>0?'Reduce '+fmt(lost)+' unidades en esta etapa':'Sin pérdida de entrada');
 const value=add(summary,'span','flow-step-value',fmt(stage.output)+' unid.');
 const body=add(card,'div','flow-step-detail');
 const stats=add(body,'div','flow-step-stats');
 for(const [name,amount] of [['Entrada',stage.input],['Salida',stage.output],['Capacidad',stage.capacity]]){const cell=add(stats,'div','');add(cell,'small','',name);add(cell,'strong','',fmt(amount))}
 add(body,'p','muted',stage.detail);
 add(body,'p','muted',i===5?'Inventario combina stock inicial, unidades liberadas y reservas elegibles.':i>0?'La entrada depende de lo entregado por el área anterior.':'Comercial establece el pronóstico para la planificación.');
 if(stage.input>0&&i!==5){const bar=add(body,'div','flow-bar'),fill=add(bar,'div','flow-bar-fill');fill.style.width=Math.min(100,stage.output/stage.input*100)+'%'}
});
$('sku').replaceChildren();
for(const [label,value] of [['Demanda real',r.demand],['Stock inicial',r.stock],['Compra solicitada',r.ordered],['Entrega proveedor',r.delivered],['Recepción',r.received],['Liberación Calidad',r.released],['Stock disponible',r.available],['Preparado',r.picked],['Expedido',r.dispatched]]){
 const item=add($('sku'),'div','stage-result');add(item,'span','',label);add(item,'strong','',fmt(value)+' unid.');
}
$('cause').textContent='Transporte recibe '+fmt(r.picked)+' unidades desde Picking y despacha '+fmt(r.dispatched)+'. Su capacidad es '+fmt(r.stages[7].capacity)+'. '+(r.picked<r.stages[7].capacity?'Capacidad ociosa por falta de flujo o demanda aguas arriba.':'El despacho está limitado por capacidad o disponibilidad.');
renderDiagnosis(r);const causes=$('rootCauses');causes.replaceChildren();diag.findings.forEach(f=>{const item=add(causes,'div','action');add(item,'span','action-index',f.icon);const body=add(item,'div','');add(body,'strong','',f.title);add(body,'small','','Recibe '+fmt(f.stage.input)+' · entrega '+fmt(f.stage.output)+' · capacidad '+fmt(f.stage.capacity)+'. '+(f.inherited?'Capacidad mayor que la entrada: restricción heredada.':'')+' Recuperación aplicada: +'+fmt(f.recovered)+' · potencial adicional: +'+fmt(f.potential)+'.')});
const opts=$('actions');opts.replaceChildren();diag.findings.forEach(f=>{const item=add(opts,'div','action'),body=add(item,'div','');add(body,'strong','',f.title+' · '+ACTIONS[f.id][0]);add(body,'small','','Elegido: '+(actions[f.id]||0)+' / '+ACTIONS[f.id][2]+' '+ACTIONS[f.id][1]+' · Mejora potencial adicional: +'+fmt(f.potential));const b=add(item,'button','mini','Configurar');b.onclick=()=>{phase='recover';showSection('recovery');nav(NODES.findIndex(n=>n.id===f.id))}});
$('riskCount').textContent=String(diag.findings.filter(f=>f.stage.output<f.stage.input).length);$('focus').textContent=diag.findings.filter(f=>f.potential>0).slice(0,3).map(f=>f.title).join(', ')||'Sin mejoras individuales';$('report').hidden=false;
}
$('prev').onclick=()=>nav(Math.max(0,active-1));
$('next').onclick=()=>{if(!decisions[NODES[active].id])decisions[NODES[active].id]=DEFAULTS[NODES[active].id];if(active<7)active++;else if(phase==='plan'){active=0;showSection('preliminary')}else{render();showSection('dashboard');$('report').scrollIntoView({behavior:'smooth',block:'start'});return}save();render();$('mission').scrollIntoView({behavior:'smooth',block:'start'})};
$('reset').onclick=()=>{if(!confirm('¿Reiniciar la campaña?'))return;decisions={...START,values:{}};actions={};active=0;phase='plan';save();render();showSection('operations');showSection('operations')};
$('openReport').onclick=()=>{save();render();showSection('preliminary');$('report').scrollIntoView({behavior:'smooth',block:'start'})};
$('export').onclick=()=>{const r=flow(decisions,actions,scenario),rows=[['Área','Entrada','Salida','Capacidad','Recuperación'],...r.stages.map(s=>[NODES.find(n=>n.id===s.id).title,s.input,s.output,s.capacity,actions[s.id]||0])];const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='supply-chain-cadena.csv';document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url)};
$('setupTab').onclick=()=>showSection('setup');
$('operationsTab').onclick=()=>showSection('operations');
$('preliminaryTab').onclick=()=>showSection('preliminary');
$('startRecovery').onclick=()=>showSection('recovery');
$('recoveryTab').onclick=()=>showSection('recovery');
$('dashboardTab').onclick=()=>showSection('dashboard');
$('beginExercise').onclick=()=>showSection('operations');
$('resetScenario').onclick=()=>{scenario={...DEFAULT_SCENARIO};save();render()};
load();render();showSection('operations');
