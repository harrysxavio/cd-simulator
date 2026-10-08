import {NODES,DEFAULTS,START,PARAMETERS,numericValue} from './engine.js?v=80';
import {flow,diagnose,ACTIONS} from './flow.js?v=80';
import {DEFAULT_SCENARIO,FIELDS,cleanScenario,finance} from './scenario.js?v=80';
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
 const values=[['Unidades expedidas',fmt(r.dispatched)],['Costo por unidad',f.costPerUnit===null?'N/D':money(f.costPerUnit)],['Meta costo unitario',money(scenario.maxCostPerUnit)],['Ingreso estimado',money(f.revenue)],['Saldo operativo simulado',money(f.margin)],['Costo personal',money(f.laborTotal)],['Productividad Picking',scenario.pickingOperators?(r.picked/scenario.pickingOperators).toFixed(1)+' unid./operario':'N/D'],['Uso capacidad Picking',r.stages[6].capacity?(100*r.picked/r.stages[6].capacity).toFixed(1)+'%':'N/D'],['Cumple meta',f.meetsTarget?'Sí':'No']];
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
 ['Recargo de compra urgente',f.urgentSurcharge,baseline.urgentSurcharge],
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
 const initial=flow(decisions,{},scenario);
 const oldCost=finance(initial,scenario),newCost=finance(current,scenario);
 const percent=(a,b)=>b?((100*a/b).toFixed(1)+'%'):'N/D';
 const cash=v=>'CLP '+Math.round(v).toLocaleString('es-CL');
 const pre=$('preliminaryMetrics');pre.replaceChildren();
 const items=[['Cumplimiento',percent(initial.dispatched,initial.demand)],['Picking unid./operario',scenario.pickingOperators?(initial.picked/scenario.pickingOperators).toFixed(1):'N/D'],['Uso Picking',percent(initial.picked,initial.stages[6].capacity)],['Costo por unidad',oldCost.costPerUnit===null?'N/D':cash(oldCost.costPerUnit)],['Unidades pendientes',fmt(initial.pending)]];
 for(const item of items){const c=add(pre,'div','metric');add(c,'span','',item[0]);add(c,'strong','',item[1])}
 const descriptions={
 commercial:'El sesgo del pronóstico cambia la reposición y puede crear quiebres o exceso de compra.',
 planning:'La cobertura elegida determina las unidades solicitadas al proveedor.',
 purchasing:'La entrega real condiciona cuánto puede recibir el centro.',
 receiving:'La dotación y la capacidad limitan cuánto ingresa a Calidad.',
 quality:'Solo las unidades liberadas pasan a disponibilidad de Inventario.',
 inventory:'El stock inicial, la liberación y la reserva determinan la oferta a Picking.',
 picking:'La productividad observada puede caer por falta de unidades disponibles, aunque exista capacidad.',
 transport:'La expedición depende de las unidades preparadas y de la capacidad de salida.'
 };
 const root=$('preliminaryFindings');root.replaceChildren();
 for(const f of diagnose(decisions,{},scenario).findings){
 const box=add(root,'div','diagnosis-card');add(box,'strong','',f.icon+' '+f.title);
 const st=f.stage,util=percent(st.output,st.capacity);
 add(box,'p','',descriptions[f.id]);
 const metrics={
 commercial:['Error del pronóstico',percent(Math.abs(initial.estimated-initial.demand),initial.demand)],
 planning:['Cobertura de compra',percent(initial.ordered,Math.max(0,initial.estimated-initial.stock))],
 purchasing:['Cumplimiento del proveedor',percent(initial.delivered,initial.ordered)],
 receiving:['Unidades por operario',scenario.receivingOperators?(initial.received/scenario.receivingOperators).toFixed(1):'No aplica'],
 quality:['Tasa de liberación',percent(initial.released,initial.received)],
 inventory:['Disponibilidad sobre demanda',percent(initial.available,initial.demand)],
 picking:['Unidades por operario',scenario.pickingOperators?(initial.picked/scenario.pickingOperators).toFixed(1):'No aplica'],
 transport:['Utilización de expedición',percent(initial.dispatched,initial.stages[7].capacity)]
 };
 const metric=metrics[f.id];
 add(box,'p','kpi-strategy',metric[0]+': '+metric[1]+'.');
 add(box,'p','muted','Entrada '+fmt(st.input)+' · salida '+fmt(st.output)+' · capacidad '+fmt(st.capacity)+' · utilización '+util+'.');
 if(f.inherited)add(box,'p','diagnosis-note','La capacidad supera el flujo recibido. Reforzar aquí sin resolver el área anterior puede aumentar costos sin mejorar el resultado.');
 const button=add(box,'button','mini','Evaluar recuperación');button.onclick=()=>{active=NODES.findIndex(n=>n.id===f.id);showSection('recovery')};
 }
 const final=$('finalComparison');final.replaceChildren();
 const extra=current.dispatched-initial.dispatched,cost=newCost.total-oldCost.total;
 for(const item of [['Cumplimiento inicial',percent(initial.dispatched,initial.demand)],['Cumplimiento final',percent(current.dispatched,current.demand)],['Unidades recuperadas',fmt(extra)],['Costo incremental',cash(cost)],['Costo por unidad adicional',extra>0?cash(cost/extra):'Sin mejora global']]){
 const c=add(final,'div','metric');add(c,'span','',item[0]);add(c,'strong','',item[1]);
 }
 const insight=$('strategyInsight');insight.replaceChildren();
 const initialRate=initial.dispatched/initial.demand,finalRate=current.dispatched/current.demand;
 const deltaCost=newCost.total-oldCost.total,deltaRevenue=newCost.revenue-oldCost.revenue;
 add(insight,'strong','','¿Qué significan las decisiones para el negocio?');
 add(insight,'p','',extra>0?'El cumplimiento mejora '+((finalRate-initialRate)*100).toFixed(1)+' puntos porcentuales. Recuperaste '+fmt(extra)+' unidades expedibles, con '+cash(deltaCost)+' de variación de costo y '+cash(deltaRevenue)+' de ingreso potencial adicional.':'El cumplimiento no mejoró con las medidas actuales. Si se incurrió en costos extra, esas decisiones consumen recursos sin generar más unidades expedibles. Revisa primero el cuello de botella.');
 add(insight,'p','muted','El saldo económico modelado cambia '+cash(newCost.margin-oldCost.margin)+'. Es una aproximación didáctica de ingresos menos desembolsos modelados, no un margen contable.');
 const rec=$('recoverySummary');rec.replaceChildren();
 add(rec,'p','summary','Antes: '+fmt(initial.dispatched)+' unidades. Ahora: '+fmt(current.dispatched)+'. Recuperadas: '+fmt(extra)+'. Costo incremental: '+cash(cost)+'.');
 if(extra===0)add(rec,'p','diagnosis-note','No existe mejora global con las medidas actuales. Revisa otras restricciones antes de agregar recursos.');
}
function renderKpiLesson(r){
 const id=NODES[active].id,st=r.stages[active];
 const percent=(a,b)=>b?(100*a/b).toFixed(1)+' %':'No aplica';
 const perPerson=(a,b)=>b?(a/b).toFixed(1)+' unid./operario':'No aplica';
 const data={
 commercial:['Error absoluto del pronóstico',percent(Math.abs(r.estimated-r.demand),r.demand),'|Demanda pronosticada − demanda real| ÷ demanda real × 100','Un error alto puede provocar faltantes o sobreinventario. Una sobreestimación no implica que se vendan más unidades.','Decisión estratégica: equilibrar nivel de servicio y riesgo de inventario.'],
 planning:['Cobertura de reposición',percent(r.ordered,Math.max(0,r.estimated-r.stock)),'Unidades solicitadas ÷ brecha planificada × 100','Una cobertura baja puede dejar demanda sin abastecer. Una cobertura alta eleva las necesidades de compra.','Decisión estratégica: disponibilidad frente a capital inmovilizado.'],
 purchasing:['Cumplimiento de entrega',percent(r.delivered,r.ordered),'Unidades recibidas del proveedor antes del corte ÷ unidades solicitadas × 100','Una entrega incompleta limita las etapas posteriores aunque el centro tenga capacidad libre.','Decisión estratégica: costo de compra frente a confiabilidad del proveedor.'],
 receiving:['Productividad de recepción',perPerson(r.received,scenario.receivingOperators),'Unidades recibidas ÷ operarios de recepción en la jornada','La productividad observada depende del volumen entregado; no equivale automáticamente a eficiencia individual.','Decisión estratégica: dimensionar recursos según volumen y variabilidad.'],
 quality:['Tasa de liberación',percent(r.released,r.received),'Unidades liberadas ÷ unidades recibidas × 100','Una tasa baja reduce disponibilidad inmediata. Acelerar el proceso nunca significa saltarse los controles.','Decisión estratégica: proteger conformidad y nivel de servicio.'],
 inventory:['Disponibilidad frente a demanda',percent(r.available,r.demand),'Unidades disponibles para preparar ÷ demanda real × 100','La disponibilidad depende del stock inicial, la recepción liberada, la confiabilidad y las reservas habilitadas.','Decisión estratégica: cobertura de inventario frente a costos y riesgo de quiebre.'],
 picking:['Productividad de picking',perPerson(r.picked,scenario.pickingOperators),'Unidades preparadas ÷ operarios de picking en la jornada','Si no llegan unidades de Inventario, la productividad observada cae aunque exista capacidad. También revisa utilización: '+percent(r.picked,st.capacity)+'.','Decisión estratégica: aumentar productividad sin contratar capacidad ociosa.'],
 transport:['Utilización de expedición',percent(r.dispatched,st.capacity),'Unidades expedibles ÷ capacidad de expedición × 100','Una utilización baja puede ser consecuencia de falta de unidades preparadas, no de rutas mal planificadas.','Decisión estratégica: capacidad logística, costo de despacho y cumplimiento.']
 };
 const root=$('kpiLesson');root.replaceChildren();
 const [name,value,formula,reading,strategy]=data[id];
 const lead=add(root,'div','kpi-lead');add(lead,'span','muted',name);add(lead,'strong','',value);
 add(root,'p','',formula);add(root,'p','',reading);add(root,'p','kpi-strategy',strategy);
 add(root,'small','','Ejercicio ilustrativo. El indicador usa los parámetros actuales y se actualiza con tus decisiones.');
}

function render(){
const r=flow(decisions,actions,scenario),diag=diagnose(decisions,actions,scenario),n=NODES[active],st=r.stages[active];setup();dashboard(r);renderKpiLesson(r);
$('completed').textContent=fmt(r.dispatched);$('pending').textContent=fmt(r.pending);$('fulfillment').textContent=(r.dispatched/r.demand*100).toFixed(1).replace('.',',')+'%';
$('forecastNotice').textContent=phase==='plan'?'Planificación: las áreas pendientes usan valores iniciales; el resultado es provisional.':'Recuperación: define cuánto esfuerzo correctivo aplicar en cada área (0 = no actuar).';
$('progressText').textContent=NODES.filter(x=>decisions[x.id]).length+' de 8 áreas planificadas · '+(phase==='plan'?'Planificación':'Recuperación');
$('progressFill').style.width=NODES.filter(x=>decisions[x.id]).length/8*100+'%';
const map=$('roadmap');map.replaceChildren();NODES.forEach((x,i)=>{const b=add(map,'button','node '+(i===active?'current':decisions[x.id]?'done':''));add(b,'span','node-icon',x.icon);const c=add(b,'span','node-content');add(c,'strong','',String(i+1).padStart(2,'0')+' · '+x.title);add(c,'small','',actions[x.id]?'Recuperación aplicada: '+actions[x.id]+' '+ACTIONS[x.id][1]:decisions[x.id]?'Planificado':'Pendiente');add(b,'span','node-state',i===active?'●':'→');b.onclick=()=>nav(i)});
$('missionNumber').textContent=(phase==='plan'?'PLANIFICAR':'RECUPERAR')+' · '+(active+1)+' / 8';$('missionTitle').textContent=n.icon+' '+n.title;$('missionDescription').textContent=n.desc;$('missionKpi').textContent=n.kpi;
const choices=$('choices');choices.replaceChildren();if(phase==='plan'){add(choices,'h3','','Decisión inicial');n.choices.forEach(c=>{const b=add(choices,'button','choice '+((decisions[n.id]??DEFAULTS[n.id])===c.id?'selected':''));add(b,'strong','',c.label);add(b,'small','',c.note);b.onclick=()=>{decisions[n.id]=c.id;decisions.values[n.id]=c[PARAMETERS[n.id].key];save();render()}});
const p=PARAMETERS[n.id],control=add(choices,'div','numeric-control');control.hidden=phase==='recover';add(control,'label','',p.label+' ('+p.unit.trim()+')');add(control,'p','muted',p.hint);const row=add(control,'div','numeric-row'),input=add(row,'input','numeric-input');input.type='number';input.min=p.min;input.max=p.max;input.step=p.step;input.value=numericValue(n.id,decisions);input.onchange=()=>{const v=+input.value;if(input.value===''||!Number.isFinite(v)||v<p.min||v>p.max){alert('Valor permitido: '+p.min+' a '+p.max);return}decisions[n.id]=decisions[n.id]??DEFAULTS[n.id];decisions.values[n.id]=v;save();render()};
}const box=add(choices,'div','flow-summary');add(box,'strong','','Relación con las otras áreas');add(box,'p','','Recibe '+fmt(st.input)+' → entrega '+fmt(st.output)+' unidades. Capacidad '+fmt(st.capacity)+'.');add(box,'small','',st.detail);
if(phase==='recover'){
 const cfg=ACTIONS[n.id],selected=actions[n.id]||0;
 const before=flow(decisions,actions,scenario),baseCost=finance(before,scenario).total;
 add(choices,'h3','','Decide si intervenir');
 add(choices,'p','muted','Todas las medidas son opcionales. Puedes mantener la situación o ajustar cuánto esfuerzo aplicar.');
 const opts=[
 ['Mantener como está',0,'Sin recursos adicionales. Conserva los indicadores actuales.'],
 ['Mejora puntual',Math.round(cfg[2]*.25/cfg[3])*cfg[3],'Recuperación acotada.'],
 ['Mejora equilibrada',Math.round(cfg[2]*.6/cfg[3])*cfg[3],'Refuerzo intermedio.'],
 ['Intervención intensiva',cfg[2],'Mayor esfuerzo disponible; puede tener costo sin beneficio global.']
 ];
 for(const [title,value,description] of opts){
 const trial=flow(decisions,{...actions,[n.id]:value},scenario);
 const difference=trial.dispatched-before.dispatched;
 const extraCost=finance(trial,scenario).total-baseCost;
 const button=add(choices,'button','choice recovery-option '+(selected===value?'selected':''));
 add(button,'strong','',title+' · '+value+' '+cfg[1]);
 add(button,'small','',description);
 add(button,'small','','Cambio vs. ahora: '+(difference>=0?'+':'')+fmt(difference)+' unidades expedibles · costo '+(extraCost>=0?'+':'')+fmt(extraCost)+' CLP.');
 button.setAttribute('aria-pressed',String(selected===value));
 button.onclick=()=>{actions[n.id]=value;save();render()};
 }
 const control=add(choices,'div','numeric-control');
 add(control,'label','','O define una cantidad propia ('+cfg[1]+')');
 const num=add(control,'input','numeric-input');num.type='number';num.min=0;num.max=cfg[2];num.step=cfg[3];num.value=selected;
 num.onchange=()=>{const v=Number(num.value);if(num.value===''||!Number.isFinite(v)||v<0||v>cfg[2]){num.value=selected;return}actions[n.id]=v;save();render()};
 const noAction=flow(decisions,{...actions,[n.id]:0},scenario);
 const contribution=before.dispatched-noAction.dispatched;
 add(control,'p','muted',selected===0?'Sin intervención: la operación mantiene sus restricciones actuales.':contribution>0?'La intervención seleccionada aporta '+fmt(contribution)+' unidades expedibles con las demás decisiones actuales.':'Esta medida todavía no aumenta la expedición global; puede haber otra restricción que debas resolver.');
}
$('nodeResult').textContent='Entrada: '+fmt(st.input)+' · Salida: '+fmt(st.output)+' · Capacidad: '+fmt(st.capacity)+' unidades. '+(st.input<st.capacity?'Parte de la capacidad puede estar ociosa por falta de flujo heredado.':st.output<st.input?'Esta área reduce el flujo que recibe la siguiente.':'Sin pérdida adicional en esta etapa.');
$('prev').disabled=active===0;$('next').textContent=active===7?(phase==='plan'?'Ver diagnóstico preliminar →':'Ver resultado final →'):'Siguiente área →';
const list=$('results');list.replaceChildren();
r.stages.forEach((stage,i)=>{
 const area=NODES[i],lost=Math.max(0,stage.input-stage.output);
 const card=add(list,'div','flow-step');
 const summary=add(card,'div','flow-step-summary');
 const badge=add(summary,'span','flow-step-index',String(i+1).padStart(2,'0'));
 const label=add(summary,'span','flow-step-title');
 add(label,'strong','',area.icon+' '+area.title);
 add(label,'small','',lost>0?'Reduce '+fmt(lost)+' unidades en esta etapa':'Sin pérdida de entrada');
 const value=add(summary,'span','flow-step-value',fmt(stage.output)+' unid.');
 const body=add(card,'div','flow-step-detail');
 const stats=add(body,'div','flow-step-stats');
 for(const [name,amount] of [['Entrada',stage.input],['Salida',stage.output],['Capacidad',stage.capacity]]){const cell=add(stats,'div','');add(cell,'small','',name);add(cell,'strong','',fmt(amount))}
 add(body,'p','muted',stage.detail);if(stage.id==='picking')add(body,'p','muted','Productividad observada: '+(scenario.pickingOperators?(stage.output/scenario.pickingOperators).toFixed(1)+' unidades por operario':'N/D')+'. Utilización: '+(stage.capacity?(stage.output/stage.capacity*100).toFixed(1)+'%':'N/D')+'.');if(stage.id==='receiving')add(body,'p','muted','Productividad observada: '+(scenario.receivingOperators?(stage.output/scenario.receivingOperators).toFixed(1)+' unidades por operario':'N/D')+'.');
 add(body,'p','muted',i===5?'Inventario combina stock inicial, unidades liberadas y reservas elegibles.':i>0?'La entrada depende de lo entregado por el área anterior.':'Comercial establece el pronóstico para la planificación.');
 if(stage.input>0&&i!==5){const bar=add(body,'div','flow-bar'),fill=add(bar,'div','flow-bar-fill');fill.style.width=Math.min(100,stage.output/stage.input*100)+'%'}
});
$('sku').replaceChildren();
for(const [label,value] of [['Demanda real',r.demand],['Stock inicial',r.stock],['Compra solicitada',r.ordered],['Entrega proveedor',r.delivered],['Recepción',r.received],['Liberación Calidad',r.released],['Stock disponible',r.available],['Preparado',r.picked],['Expedido',r.dispatched]]){
 const item=add($('sku'),'div','stage-result');add(item,'span','',label);add(item,'strong','',fmt(value)+' unid.');
}
$('cause').textContent='Transporte recibe '+fmt(r.picked)+' unidades desde Picking y despacha '+fmt(r.dispatched)+'. Su capacidad es '+fmt(r.stages[7].capacity)+'. '+(r.picked<r.stages[7].capacity?'Capacidad ociosa por falta de flujo o demanda aguas arriba.':'El despacho está limitado por capacidad o disponibilidad.');
renderDiagnosis(r);const causes=$('rootCauses');causes.replaceChildren();
const initial=flow(decisions,{},scenario);
const explanations={commercial:'El pronóstico afecta la necesidad calculada para reponer.',planning:'La cobertura determina cuánto se compra para cerrar la brecha.',purchasing:'El cumplimiento del proveedor condiciona la llegada de unidades.',receiving:'La productividad de recepción depende de dotación y entregas recibidas.',quality:'La tasa de liberación define cuánto inventario queda autorizado.',inventory:'La disponibilidad combina stock inicial, calidad y reserva.',picking:'La productividad puede estar limitada por el abastecimiento anterior.',transport:'El cumplimiento de expedición depende del preparado y de la capacidad de salida.'};
for(const f of diag.findings){
 const item=add(causes,'div','diagnosis-card'),before=initial.stages.find(x=>x.id===f.id),after=f.stage;
 add(item,'strong','',f.icon+' '+f.title);
 add(item,'p','',explanations[f.id]);
 const utilization=after.capacity?((after.output/after.capacity)*100).toFixed(1)+'%':'N/D';
 add(item,'p','muted','Salida inicial '+fmt(before.output)+' → salida final '+fmt(after.output)+' unidades. Utilización final '+utilization+'. Recuperación aplicada: '+fmt(actions[f.id]||0)+' '+ACTIONS[f.id][1]+'.');
 if(f.inherited)add(item,'p','diagnosis-note','Hay capacidad no utilizada por flujo heredado. Antes de reforzar esta área conviene resolver la restricción aguas arriba.');
 if(f.potential>0){
 const projected=flow(decisions,{...actions,[f.id]:ACTIONS[f.id][2]},scenario);
 const costChange=finance(projected,scenario).total-finance(r,scenario).total;
 const localGap=Math.max(0,after.input-after.output);
 add(item,'p','diagnosis-note','Si mantienes la decisión actual en '+f.title+', esta etapa seguirá procesando '+fmt(after.output)+' de '+fmt(after.input)+' unidades de entrada'+(localGap?' (brecha de '+fmt(localGap)+').':'.')+' La campaña conservaría '+fmt(r.pending)+' unidades pendientes. Una medida adicional podría aumentar la expedición global en '+fmt(f.potential)+' unidades, con una variación de costo modelada de '+fmt(costChange)+' CLP. Compara ese costo con el beneficio antes de intervenir.');
}
 else if(!actions[f.id]){add(item,'p','muted','Mantener esta área no reduce por sí solo el despacho actual. Reforzarla aisladamente tampoco mejoraría el cumplimiento mientras exista otra restricción.');}
}
const opts=$('actions');opts.replaceChildren();diag.findings.forEach(f=>{const item=add(opts,'div','action'),body=add(item,'div','');add(body,'strong','',f.title+' · '+ACTIONS[f.id][0]);add(body,'small','','Elegido: '+(actions[f.id]||0)+' / '+ACTIONS[f.id][2]+' '+ACTIONS[f.id][1]+' · Mejora potencial adicional: +'+fmt(f.potential));const b=add(item,'button','mini','Configurar');b.onclick=()=>{phase='recover';showSection('recovery');nav(NODES.findIndex(n=>n.id===f.id))}});
$('riskCount').textContent=String(diag.findings.filter(f=>f.stage.output<f.stage.input).length);$('focus').textContent=diag.findings.filter(f=>f.potential>0).slice(0,3).map(f=>f.title).join(', ')||'Sin mejoras individuales';$('report').hidden=false;
}
$('prev').onclick=()=>nav(Math.max(0,active-1));
$('next').onclick=()=>{if(!decisions[NODES[active].id])decisions[NODES[active].id]=DEFAULTS[NODES[active].id];if(active<7)active++;else if(phase==='plan'){active=0;showSection('preliminary')}else{render();showSection('dashboard');$('report').scrollIntoView({behavior:'smooth',block:'start'});return}save();render();$('mission').scrollIntoView({behavior:'smooth',block:'start'})};
$('reset').onclick=()=>{if(!confirm('¿Reiniciar la campaña?'))return;decisions={...START,values:{}};actions={};active=0;phase='plan';save();render();showSection('operations')};
$('openReport').onclick=()=>{save();showSection('preliminary');$('preliminarySection').scrollIntoView({behavior:'smooth',block:'start'})};
$('export').onclick=()=>{const r=flow(decisions,actions,scenario),rows=[['Área','Entrada','Salida','Capacidad','Recuperación'],...r.stages.map(s=>[NODES.find(n=>n.id===s.id).title,s.input,s.output,s.capacity,actions[s.id]||0])];const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='supply-chain-cadena.csv';document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url)};
$('setupTab').onclick=()=>showSection('setup');
$('operationsTab').onclick=()=>showSection('operations');
$('preliminaryTab').onclick=()=>showSection('preliminary');
$('startRecovery').onclick=()=>showSection('recovery');
$('skipRecovery').onclick=()=>{actions={};phase='recover';save();showSection('dashboard')};
$('recoveryTab').onclick=()=>showSection('recovery');
$('dashboardTab').onclick=()=>showSection('dashboard');
$('beginExercise').onclick=()=>showSection('operations');
$('resetScenario').onclick=()=>{scenario={...DEFAULT_SCENARIO};save();render()};
load();render();showSection('operations');
