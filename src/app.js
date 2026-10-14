import {supplyBridge} from './supply-bridge.js?v=162';
import {createSkuSessionCache} from './sku-session.js?v=162';
import {SESSION_STORAGE_KEY,deserializeSession,serializeSession} from './session-state.js?v=162';
import {aggregateFlowCsv} from './aggregate-export.js?v=162';
import {campaignSkuContract} from './campaign-contract.js?v=162';
import {decisionPhysicalCoverage} from './decision-physical-coverage.js?v=162';
import {skuCostCatalogReadModel} from './sku-cost-catalog.js?v=162';
import {campaignAreaReadModel} from './area-ledger.js?v=162';
import {laborAudit} from './labor.js?v=162';
import {skuAudit} from './audit.js?v=162';
import {recoveryComparison,RECOVERY_OPTIONS} from './recovery.js?v=162';
import {integratedDemand} from './integrated.js?v=162';
import {eventSimulation} from './events.js?v=162';
import {deliveryTimeline} from './timeline.js?v=162';
import {inventoryPolicy,POLICY_PRESETS} from './policy.js?v=162';
import {skuOrderLab,SKU_CATALOG} from './sku.js?v=162';
import {demandJourney} from './journey.js?v=162';
import {NODES,DEFAULTS,START,PARAMETERS,numericValue} from './engine.js?v=162';
import {flow,diagnose,ACTIONS} from './flow.js?v=162';
import {DEFAULT_SCENARIO,FIELDS,cleanScenario,finance,strategyAssessment} from './scenario.js?v=162';
import {areaKpis} from './kpis.js?v=162';
import {causalAudit} from './causal.js?v=162';
import {managerDiagnosis} from './diagnosis-guide.js?v=162';
import {skuServiceBrief} from './sku-service.js?v=162';
import {createSkuRecoveryDecision,skuDecisionStatus} from './sku-decision.js?v=162';
import {attentionSignals} from './attention.js?v=162';
const $=id=>document.getElementById(id),KEY=SESSION_STORAGE_KEY;
// An ID remains stable on reload; a new campaign receives a new ID.
const createCampaignId=()=> 'CD-'+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
let decisions={...START,values:{}},actions={},active=0,phase='plan',scenario={...DEFAULT_SCENARIO},strategy='balanced',revealed=false,shockDirection=null,skuPolicy='balanced',skuSupplierDelay=false,skuSeparateTransport=false,skuRecovery='wait',skuUrgentArrival=1,skuPurchaseCoverage=100,skuReservePercent=0,skuDecisions=[],campaignId=createCampaignId(),currentSection='operations';
// One session-scoped, bounded physical SKU replay reused by all screens.
const skuSession=createSkuSessionCache();
let currentSkuAreaModel=null,currentSkuProjection=null;
const effectiveScenario=()=>({...scenario,lockUpstream:revealed,actualDemand:revealed?Math.max(1,Math.round(scenario.demand*(1+(shockDirection||1)*scenario.demandShockPercent/100))):scenario.demand});
const fmt=n=>Math.round(n).toLocaleString('es-CL');
const skuContractInputs=contract=>{
 const stock=skuReservePercent>0?{...contract.skuInputs,reservePercent:skuReservePercent}:contract.skuInputs;
 // The legacy signature stays identical when staging is not selected.
 return skuSeparateTransport?{...stock,separateTransport:true}:stock;
};
const activeSkuDecision=contract=>skuDecisions.findLast(d=>skuDecisionStatus({decision:d,contract:{...contract,skuInputs:skuContractInputs(contract)}})==='current')||null;
// M2-04d: one input adapter for all screens; only SKU events are physical.
// Individual SKU controls can request a fresh contract, while a full render
// passes the identical frozen contract to Results and Recovery.
const currentCampaignContract=()=>campaignSkuContract({
 decisions,actions,scenario:effectiveScenario(),policy:skuPolicy,
 supplierDelay:skuSupplierDelay,campaignId
});
function add(root,tag,cls,t){const e=document.createElement(tag);e.className=cls||'';if(t!==undefined)e.textContent=t;root.append(e);return e}
function save(){
 try{
  const data={campaignId,currentSection,decisions,actions,active,phase,scenario,strategy,revealed,shockDirection,
   skuPolicy,skuSupplierDelay,skuSeparateTransport,skuRecovery,skuUrgentArrival,skuPurchaseCoverage,skuReservePercent,skuDecisions};
  localStorage.setItem(KEY,serializeSession(data));
 }catch{
  // Browser privacy mode or exhausted storage must not break the exercise.
  // New physical SKU ledgers are deliberately never stored in localStorage.
 }
}
function load(){
 try{
  const restored=deserializeSession(localStorage.getItem(KEY),{fallbackCampaignId:campaignId});
  if(!restored.state)return;
  const s=restored.state;
  campaignId=s.campaignId;currentSection=s.currentSection;
  decisions=s.decisions;actions=s.actions;active=s.active;phase=s.phase;
  scenario=s.scenario;strategy=s.strategy;revealed=s.revealed;shockDirection=s.shockDirection;
  skuPolicy=s.skuPolicy;skuSupplierDelay=s.skuSupplierDelay;skuSeparateTransport=s.skuSeparateTransport;skuRecovery=s.skuRecovery;
  skuUrgentArrival=s.skuUrgentArrival;skuPurchaseCoverage=s.skuPurchaseCoverage;
  skuReservePercent=s.skuReservePercent;skuDecisions=s.skuDecisions;
  skuSession.clear();currentSkuAreaModel=null;currentSkuProjection=null;
 }catch{
  // Invalid, unknown-future or malformed saved sessions are never executed.
  // Leave the current fresh campaign unchanged.
 }
}
function nav(i){active=i;save();render();$('mission').scrollIntoView({behavior:'smooth',block:'start'})}
function revealSurprise(){
 if(revealed)return;
 shockDirection=Math.random()<0.5?-1:1;
 revealed=true;actions={};phase='plan';save();
}
function applyDemandOverride(sign,percent){
 const v=Number(percent);
 if(!Number.isFinite(v)||!Number.isInteger(v)||v<0||v>100){alert('Ingresa un porcentaje entero entre 0 y 100.');return false}
 if(![-1,1].includes(sign)){alert('Selecciona aumento o disminución.');return false}
 scenario.demandShockPercent=v;shockDirection=sign;revealed=true;actions={};phase='plan';save();showSection('preliminary');return true;
}
function showSection(name){
if((name==='recovery'||name==='dashboard')&&!revealed){name='preliminary'}
if(name==='preliminary'&&!revealed)revealSurprise();
currentSection=name;
for(const x of ['setup','operations','preliminary','recovery','dashboard']){$(x+'Section').hidden=x!==name;$(x+'Tab').setAttribute('aria-selected',String(x===name))}
if(name==='dashboard')showResultView($('dashboardSection').getAttribute('data-result-view')||'overview');
if(name==='recovery'){$('recoveryHost').append($('mission'));phase='recover'}
if(name==='operations'){$('operationHost').append($('mission'));phase='plan'}
save();render();
}
const RESULT_VIEWS={overview:'Resumen de la campaña: servicio, pendientes y principal alerta.',areas:'Recorre la cadena y descubre dónde se pierde capacidad o flujo.',inventory:'Prueba políticas de stock, tiempos de compra y recuperación de pedidos.',economics:'Examina costos, desembolsos e indicadores económicos.',improvement:'Identifica restricciones, productividad y oportunidades de mejora.'};
function showResultView(view,scroll=false){
 if(!RESULT_VIEWS[view])view='overview';
 const section=$('dashboardSection');
 section.setAttribute('data-result-view',view);
 $('resultViewHint').textContent=RESULT_VIEWS[view];
 for(const button of $('resultTabs').children){
  const selected=button.getAttribute('data-result-target')===view;
  button.setAttribute('aria-selected',String(selected));
  button.setAttribute('aria-pressed',String(selected));
 }
 if(scroll&&typeof window!=='undefined')$('resultTabs').scrollIntoView({behavior:'smooth',block:'start'});
}
function setup(){
 const presets=$('demandPresets');presets.replaceChildren();
 for(const [id,label,percent] of [['light','Leve',10],['medium','Moderada',20],['strong','Intensa',30]]){
  const b=add(presets,'button','choice '+(scenario.demandShockPercent===percent?'selected':''));
  add(b,'strong','',label);add(b,'small','',percent+' % de variación (signo oculto)');
  b.setAttribute('aria-pressed',String(scenario.demandShockPercent===percent));
  b.onclick=()=>{scenario.demandShockPercent=percent;revealed=false;shockDirection=null;actions={};phase='plan';save();render();showSection('operations')};
 }
 const choices=$('strategyChoices');choices.replaceChildren();
 for(const [id,title,desc] of [['service','Servicio al cliente','Prioriza cumplir la demanda.'],['balanced','Equilibrio','Equilibra cumplimiento, costos y resultado.'],['cost','Eficiencia económica','Prioriza costo unitario sin ignorar el servicio.']]){
 const button=add(choices,'button','choice '+(strategy===id?'selected':''));add(button,'strong','',title);add(button,'small','',desc);button.setAttribute('aria-pressed',String(strategy===id));button.onclick=()=>{strategy=id;save();render()};
 }
const root=$('scenarioFields');root.replaceChildren();
for(const [key,label,unit,min,max,step] of FIELDS){
const box=add(root,'div','setup-field');add(box,'label','',label+' ('+unit+')');
const input=add(box,'input','numeric-input');input.type='number';input.min=min;input.max=max;input.step=step;input.value=scenario[key];
input.setAttribute('aria-label',label);
input.onchange=()=>{const v=Number(input.value);if(input.value===''||!Number.isFinite(v)||v<min||v>max){input.value=scenario[key];return}scenario[key]=v;scenario.actualDemand=scenario.demand;scenario=cleanScenario(scenario);revealed=false;shockDirection=null;actions={};phase='plan';save();render();showSection('operations')};
}}
function dashboard(r){
 const f=finance(r,effectiveScenario()),money=v=>'$'+Math.round(v).toLocaleString('es-CL');
 const cards=$('financeMetrics');cards.replaceChildren();
 const values=[
 ['Unidades expedibles',fmt(r.dispatched)],
 ['Costo por unidad expedible',f.costPerUnit===null?'N/D':money(f.costPerUnit)],
 ['Meta de costo unitario',money(scenario.maxCostPerUnit)],
 ['Ingresos potenciales',money(f.revenue)],
 ['Costo de mercancía expedible',money(f.costOfGoods)],
 ['Gastos operacionales',money(f.operationalExpenses)],
 ['Resultado operacional simulado',money(f.margin)],
 ['Desembolso total de jornada',money(f.cashOutflow)],
 ['Compra recibida (desembolso)',money(f.purchase)],
 ['Contribución antes de gastos fijos',money(f.contribution)],
 ['Productividad Picking',scenario.pickingOperators?(r.picked/scenario.pickingOperators).toFixed(1)+' unid./operario':'N/D'],
 ['Uso capacidad Picking',r.stages[6].capacity?(100*r.picked/r.stages[6].capacity).toFixed(1)+'%':'N/D']
 ];
 for(const [label,value] of values){const c=add(cards,'div','metric');add(c,'span','',label);add(c,'strong','',value)}
 $('costTotalHero').textContent=money(f.total);
 const budget=r.dispatched*scenario.maxCostPerUnit,over=r.dispatched>0&&f.total>budget;
 const status=$('costTotalStatus');status.className='cost-status '+(over?'status-bad':'status-good');
 status.textContent=r.dispatched===0?'Sin expedición':over?'Meta no cumplida: +'+money(f.total-budget):'Meta de costo cumplida';
 const items=[
 ['Costo de mercancía expedible',f.costOfGoods],
 ['Personal base y refuerzos',f.laborTotal],
 ['Decisiones operativas especiales',f.modeCostTotal],
 ['Acciones correctivas',f.actionCostTotal],
 ['Recargo por proveedor urgente',f.urgentSurcharge],
 ['Empaque de unidades preparadas',f.packaging],
 ['Transporte de unidades expedibles',f.transport],
 ['Otros costos fijos',f.fixed]
 ];
 const costs=$('costBreakdown');costs.replaceChildren();
 for(const [label,value] of items){
 const row=add(costs,'div','cost-line');
 const head=add(row,'div','cost-line-head');add(head,'strong','',label);add(head,'strong','',money(value));
 add(row,'small','','Participación en costo total: '+(f.total?(100*value/f.total).toFixed(1):'0')+'%.');
 }
 $('financialInsight').textContent=r.dispatched===0?'No hay expedición posible: no se calcula costo unitario. Los gastos y desembolsos pueden mantenerse.':over?'El costo por unidad supera la meta. La comparación se hace contra el costo total, no contra presupuestos arbitrarios por área.':'El costo por unidad está dentro de la meta global. Revisa también el resultado operacional y los desembolsos.';
}
function renderManagerBriefing(){
 const view=managerDiagnosis({decisions,scenario:effectiveScenario(),revealed});
 const service=revealed&&currentSkuAreaModel?skuServiceBrief(currentSkuAreaModel):null;
 const briefing=$('directorBriefing'),evidence=$('directorEvidence'),reason=$('directorReason'),options=$('directorOptions');
 briefing.replaceChildren();evidence.replaceChildren();reason.replaceChildren();options.replaceChildren();
 briefing.className='director-briefing '+(service?service.severity:view.severity);
 add(briefing,'span','director-alert',view.scenarioLabel);
 add(briefing,'h3','director-story',revealed?'El escenario cambió. Tu misión es proteger el servicio.':'Primero observa el plan, después descubre la demanda.');
 add(briefing,'p','',''+view.context);
 if(service)add(briefing,'p','director-preview','Campaña SKU · '+service.horizonDays+' días · '+service.reading);
 const essential=service?[
  ['Demanda real',service.actualOrders],
  ['Salieron del CD',service.shippedOrders],
  ['Falta atender',service.pendingOrders]
 ]:[
  [revealed?'Demanda real':'Demanda prevista',view.actualDemand],
  ['Se puede despachar',view.dispatched],
  ['Falta atender',view.pending]
 ];
 evidence.dataset.scope=service?'sku-cohort':'aggregate-day';
 evidence.dataset.campaignId=service?currentSkuProjection?.campaignId||'':'';
 evidence.dataset.projectionStamp=service?currentSkuProjection?.stamp||'':'';
 evidence.setAttribute('aria-label',service?'Pedidos completos SKU en '+service.horizonDays+' días':'Unidades equivalentes de una jornada');
 for(const [title,value] of essential){
  const card=add(evidence,'div','director-stat');
  add(card,'span','',title);add(card,'strong','',fmt(value));
 }
 // Root-cause heuristic is still one-shift and MUST be marked provisional.
 add(reason,'span','director-reason-eyebrow',service?'HIPÓTESIS DE RESTRICCIÓN · JORNADA AGREGADA':view.pending>0?'SEÑAL OPERACIONAL PRIORITARIA':'LECTURA OPERACIONAL');
 add(reason,'h3','',view.title);
 add(reason,'p','director-next','Tu siguiente paso: '+view.next);
 const cause=add(reason,'details','director-why');
 add(cause,'summary','','¿Por qué sucede?');
 add(cause,'p','',view.why);
 if(service)add(cause,'p','','Esta hipótesis usa unidades equivalentes de una jornada; no demuestra la causa de los pedidos pendientes SKU. Revisa los eventos de las ocho áreas.');
 $('directorOptions').parentElement.hidden=!revealed;
 if(revealed){
  add(options,'h3','','Otras posibilidades');
  for(const option of view.options){
   const card=add(options,'div','director-option');
   const top=add(card,'div','director-option-top');
   add(top,'strong','',option.title);
   if(option.type==='pilot')add(top,'span','director-option-status','Laboratorio SKU');
   if(option.type==='future')add(top,'span','director-option-status','Próxima fase');
   const note=add(card,'details','director-option-more');add(note,'summary','','¿Por qué considerarla?');add(note,'p','',option.reason);
  }
 }else{
  add(options,'p','director-preview','Las alternativas aparecen después de descubrir la demanda. La sorpresa no modifica retroactivamente tus decisiones.');
 }
 $('directorScope').textContent=(service?service.boundary+' La causa provisional y las medidas de recuperación por área aún usan el motor agregado. ':'')+view.note+' · Modelo didáctico, no diagnóstico profesional verificado.';
 $('directorPilot').hidden=!(revealed&&view.category==='supply');
 // Keep the progressive-disclosure panel expanded if the user opened it:
 // all dynamic children re-render in-place; <details> itself is untouched.
}
function renderDiagnosis(current){
 renderManagerBriefing();
 const surpriseConfig=$('surpriseOverride');surpriseConfig.replaceChildren();
 if(revealed){
  add(surpriseConfig,'strong','','Escenario revelado: '+(shockDirection===-1?'disminución':'aumento')+' del '+scenario.demandShockPercent+' %');
  add(surpriseConfig,'p','muted','Opcional: reproduce un caso real modificando el signo y el porcentaje. Se conservan las decisiones y compras planificadas; se descartan acciones de recuperación previas.');
  const line=add(surpriseConfig,'div','surprise-controls');
  const direction=add(line,'select','numeric-input');direction.setAttribute('aria-label','Signo de variación de demanda');
  for(const [value,label] of [['1','Aumento (+)'],['-1','Disminución (−)']]){const opt=add(direction,'option','',label);opt.value=value;opt.selected=Number(value)===shockDirection;}
  direction.value=String(shockDirection);
  const pct=add(line,'input','numeric-input');pct.type='number';pct.min=0;pct.max=100;pct.step=1;pct.value=scenario.demandShockPercent;pct.setAttribute('aria-label','Porcentaje de variación de demanda');
  const apply=add(line,'button','btn secondary','Aplicar escenario');apply.type='button';apply.onclick=()=>applyDemandOverride(Number(direction.value),pct.value);
  add(surpriseConfig,'small','','Variación permitida: 0 a 100 %. La demanda mínima del motor es una unidad.');
 }

 const planScenario={...scenario,actualDemand:scenario.demand,lockUpstream:false};
 const initialPlan=flow(decisions,{},planScenario);
 const initial=flow(decisions,{},effectiveScenario());
 const planCost=finance(initialPlan,planScenario);
 const oldCost=finance(initial,effectiveScenario()),newCost=finance(current,effectiveScenario());
 const percent=(a,b)=>b?((100*a/b).toFixed(1)+'%'):'N/D';
 const cash=v=>'CLP '+Math.round(v).toLocaleString('es-CL');
 const pre=$('preliminaryMetrics');pre.replaceChildren();
 const items=[['Cumplimiento del plan original',percent(initialPlan.dispatched,initialPlan.demand)],['Cumplimiento tras sorpresa',revealed?percent(initial.dispatched,initial.demand):'Pendiente'],['Picking unid./operario',scenario.pickingOperators?(initial.picked/scenario.pickingOperators).toFixed(1):'N/D'],['Uso Picking',percent(initial.picked,initial.stages[6].capacity)],['Costo por unidad',oldCost.costPerUnit===null?'N/D':cash(oldCost.costPerUnit)],['Unidades pendientes',fmt(initial.pending)]];
 for(const item of items){const c=add(pre,'div','metric');add(c,'span','',item[0]);add(c,'strong','',item[1])}
 const comparison=$('demandComparison');comparison.replaceChildren();
 add(comparison,'strong','',revealed?'Sorpresa revelada: nueva demanda real':'Diagnóstico del plan antes de conocer la demanda real');
 add(comparison,'p','','Plan base: '+fmt(initial.plannedDemand)+' unidades · Pronóstico ajustado: '+fmt(initial.estimated)+(revealed?' · Demanda observada (unidades equivalentes): '+fmt(initial.demand):' · Demanda real: todavía desconocida')+'.');
 if(revealed)add(comparison,'p','','Antes de la sorpresa: '+fmt(initialPlan.dispatched)+' / '+fmt(initialPlan.demand)+' unidades ('+percent(initialPlan.dispatched,initialPlan.demand)+'). Tras la sorpresa y antes de recuperar: '+fmt(initial.dispatched)+' / '+fmt(initial.demand)+' unidades ('+percent(initial.dispatched,initial.demand)+'). La capacidad, el abastecimiento y el costo inicial se mantienen; cambia el volumen de pedidos.');
 if(revealed){
  const journey=demandJourney(decisions,actions,effectiveScenario());
  const line=(title,v)=>{const p=add(comparison,'p','');add(p,'strong','',title+' · ');add(p,'span','',fmt(v.dispatched)+' / '+fmt(v.demand)+' unidades · servicio '+v.fulfillment.toFixed(1)+' % · resultado '+cash(v.margin));};
  add(comparison,'strong','','Tres momentos de la misma campaña');
  line('1. Plan inicial',journey.plan);
  line('2. Demanda observada sin recuperar',journey.surprise);
  line('3. Después de tus intervenciones',journey.recovery);
  add(comparison,'p','muted','Efecto exclusivo de la recuperación: '+(journey.recoveryImpact.dispatched>=0?'+':'')+fmt(journey.recoveryImpact.dispatched)+' unidades expedibles · '+(journey.recoveryImpact.servicePoints>=0?'+':'')+journey.recoveryImpact.servicePoints.toFixed(1)+' puntos de servicio · variación del resultado '+cash(journey.recoveryImpact.marginChange)+'. Es una comparación de escenarios, no una reconstrucción de movimientos físicos por hora.');
 }
 add(comparison,'p','muted',revealed?'Desviación real vs. plan: '+((initial.demand/initial.plannedDemand-1)*100).toFixed(1)+' %. Las compras originales se mantienen.':'Este diagnóstico usa la demanda prevista. Pulsa «Revelar sorpresa» para descubrir la demanda efectiva y decidir cómo responder.');
 $('revealDemand').hidden=revealed;
 $('startRecovery').hidden=!revealed;
 const preSummary=$('preliminarySummary');preSummary.replaceChildren();
 const initialAssessment=strategyAssessment(initial, effectiveScenario(),strategy);
 add(preSummary,'strong','',revealed?'Situación después de la sorpresa':'Lectura inicial de la empresa (demanda prevista)');
 add(preSummary,'p','','Meta de servicio: '+scenario.targetFulfillment+' %. Resultado: '+percent(initial.dispatched,initial.demand)+'. Brecha para cumplir: '+fmt(Math.max(0,Math.ceil(initial.demand*scenario.targetFulfillment/100)-initial.dispatched))+' unidades.');
 add(preSummary,'p','muted',initialAssessment.service>=initialAssessment.goal?'El nivel de servicio alcanza el objetivo. Evalúa ahora si el costo es sostenible.':'El servicio está bajo la meta. Revisa restricciones aguas arriba antes de reforzar capacidades locales.');
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
 const initialCausal=causalAudit(decisions,{},effectiveScenario());
 const prelimCausal=$('preliminaryCausal');prelimCausal.replaceChildren();
 add(prelimCausal,'strong','','¿Dónde conviene investigar primero?');
 add(prelimCausal,'p','',initialCausal.summary);
 add(prelimCausal,'small','','Análisis de intervenciones individuales bajo supuestos ficticios. No confundir con causa raíz verificada.');
 const root=$('preliminaryFindings');root.replaceChildren();
 for(const f of diagnose(decisions,{},effectiveScenario()).findings){
 const box=add(root,'div','diagnosis-card');add(box,'strong','',f.icon+' '+f.title);
 const st=f.stage,util=percent(st.output,st.capacity);
 add(box,'p','',descriptions[f.id]);
 const indicators=areaKpis(initial,effectiveScenario())[f.id];
 const kpiGrid=add(box,'div','area-kpi-grid');
 for(const indicator of indicators){
  const tile=add(kpiGrid,'div','area-kpi-tile');
  add(tile,'small','',indicator.label);
  add(tile,'strong','',indicator.value);
 }
 add(box,'p','muted',f.id==='commercial'||f.id==='planning'?'Indicadores de planificación; no son utilización de capacidad física.':'Entrada '+fmt(st.input)+' · salida '+fmt(st.output)+' · capacidad '+fmt(st.capacity)+' · utilización '+util+'.');
 if(f.inherited&&['receiving','picking','transport'].includes(f.id))add(box,'p','diagnosis-note','Esta área dispone de más capacidad que unidades recibidas. Reforzarla sin corregir las restricciones anteriores puede aumentar costos sin mejorar el despacho.');
 if(['commercial','planning','purchasing'].includes(f.id)){
  add(box,'p','diagnosis-note','Decisión de planificación histórica. Después de revelar demanda no puedes modificar aquí el pronóstico ni la compra original. La alternativa de compra nueva se estudia en el laboratorio SKU; su integración completa está pendiente.');
 }else{
  const button=add(box,'button','mini','Investigar intervención en '+f.title);
  button.onclick=()=>{active=NODES.findIndex(n=>n.id===f.id);showSection('recovery')};
 }
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
 add(insight,'p','muted','El resultado operacional modelado cambia '+cash(newCost.margin-oldCost.margin)+'. No es utilidad neta ni equivale al desembolso de la jornada.');
 renderAssessment(initial,current);
 const rec=$('recoverySummary');rec.replaceChildren();
 add(rec,'p','summary','Antes: '+fmt(initial.dispatched)+' unidades. Ahora: '+fmt(current.dispatched)+'. Recuperadas: '+fmt(extra)+'. Costo incremental: '+cash(cost)+'.');
 if(extra===0)add(rec,'p','diagnosis-note','No existe mejora global con las medidas actuales. Revisa otras restricciones antes de agregar recursos.');
}
function renderAssessment(initial,current){
 const root=$('strategyScore');root.replaceChildren();
 const previous=strategyAssessment(initial,effectiveScenario(),strategy),now=strategyAssessment(current,effectiveScenario(),strategy);
 const labels={service:'Servicio al cliente',balanced:'Equilibrio entre servicio y costo',cost:'Eficiencia económica'};
 add(root,'h3','','Evaluación del criterio · '+labels[strategy]);
 add(root,'p','','Índice pedagógico inicial '+previous.score+'/100 → final '+now.score+'/100. No representa una calificación laboral ni existe una decisión perfecta para todos los escenarios.');
 const rows=[['Servicio vs. meta',now.serviceScore],['Costo unitario vs. meta',now.costScore],['Resultado económico',now.profitability]];
 const weight={service:[65,20,15],balanced:[45,35,20],cost:[25,55,20]}[strategy];
 for(let i=0;i<rows.length;i++){
 const [name,value]=rows[i],row=add(root,'div','score-row');
 const header=add(row,'div','score-head');add(header,'span','',name+' · peso '+weight[i]+'%');add(header,'strong','',value.toFixed(0)+'/100');
 const bar=add(row,'div','score-track');const fill=add(bar,'div','score-fill');fill.style.width=Math.max(0,Math.min(100,value))+'%';
 }
 const serviceGap=Math.max(0,Math.ceil(current.demand*scenario.targetFulfillment/100)-current.dispatched);
 const f=finance(current,effectiveScenario()),base=finance(initial,effectiveScenario());
 if(serviceGap>0)add(root,'p','diagnosis-note','Faltan '+fmt(serviceGap)+' unidades para la meta de servicio. Identifica la restricción efectiva antes de gastar más.');
 else add(root,'p','kpi-strategy','La meta de servicio se cumple. Considera si los costos y la utilización justifican la capacidad elegida.');
 if(f.costPerUnit!==null&&f.costPerUnit>scenario.maxCostPerUnit)add(root,'p','diagnosis-note','El costo unitario excede la meta en CLP '+fmt(f.costPerUnit-scenario.maxCostPerUnit)+'.');
 if(f.margin<base.margin)add(root,'p','diagnosis-note','El resultado operacional es CLP '+fmt(base.margin-f.margin)+' inferior al escenario sin recuperación. Revisa el retorno de las medidas.');
 add(root,'small','','Cálculo didáctico: servicio = mínimo(100, cumplimiento/meta × 100). Costo = mínimo(100, meta de costo/costo unitario × 100). Resultado = valor limitado entre 0 y 100 de [50 + 50 × resultado operacional/ingresos potenciales]. Se ponderan con los pesos indicados. No mide habilidades personales ni identifica una solución óptima.');
}
function renderKpiLesson(r){
 const id=NODES[active].id,root=$('kpiLesson');
 root.replaceChildren();
 const indicators=areaKpis(r,effectiveScenario())[id];
 for(const indicator of indicators){
  const section=add(root,'section','kpi-explainer');
  const lead=add(section,'div','kpi-lead');
  add(lead,'span','muted',indicator.label);
  add(lead,'strong','',indicator.value);
  add(section,'p','','Cómo se calcula: '+indicator.formula+'.');
  add(section,'p','',indicator.meaning);
 }
 add(root,'small','','Datos de una jornada ficticia. Los indicadores cambian con las decisiones y no sustituyen métricas históricas, por SKU, por hora ni por pedido.');
}

function renderLabor(){
 const root=$('laborAudit');root.replaceChildren();
 const report=laborAudit(decisions,actions,effectiveScenario());
 for(const a of report.result){
  const card=add(root,'div','area-kpi-tile');
  add(card,'strong','',a.name+' · '+a.staff+' personas');
  add(card,'small','','Capacidad '+fmt(a.capacity)+' · entrada '+fmt(a.inflow)+' · procesadas '+fmt(a.processed));
  add(card,'small','','Productividad '+(a.productivity===null?'N/D':a.productivity.toFixed(1))+' unid./hora-persona · utilización '+(100*a.utilization).toFixed(1)+' %');
  add(card,'small','','Dotación teórica para el flujo: '+a.staffRequired+' · exposición indicativa por capacidad no requerida: CLP '+fmt(a.idleCostIndicator));
 }
}
function renderCanonicalAreasFromSku(model){
 const stageActive=model.pickingLedger?.stage==='independent-staging';
 const host=$('canonicalAreaView');host.replaceChildren();
 const intro=add(host,'div','canonical-area-heading');
 add(intro,'span','canonical-kicker','MISIÓN 4 DE 4 · ENTENDER EL IMPACTO');
 add(intro,'h2','','🔗 Cómo operaron las ocho áreas');
 add(intro,'p','','Una misma campaña SKU, con '+fmt(model.metrics.actualOrders)+' pedidos y '+model.horizonDays+' días. Cada área explica su papel usando los mismos pedidos, compras, recepciones, lotes e inventario; no son ocho simulaciones diferentes.');
 const numbers=add(host,'div','canonical-area-numbers');
 const areaCounts=stageActive?[
  ['Sin preparar',model.metrics.unpickedOrders,'pedidos'],
  ['En staging',model.metrics.stagedOrders,'pedidos preparados'],
  ['Salieron del CD',model.metrics.shippedOrders,'pedidos expedidos']
 ]:[
  ['Pedidos reales',model.metrics.actualOrders,'pedidos'],
  ['Salieron del CD',model.metrics.shippedOrders,'pedidos completos'],
  ['Pendientes al cierre',model.metrics.pendingOrders,'pedidos sin fecha confirmada']
 ];
 for(const [name,value,unit] of areaCounts){
  const tile=add(numbers,'div','canonical-area-stat');
  add(tile,'span','',name);add(tile,'strong','',fmt(value));add(tile,'small','',unit);
 }
 const info=add(host,'p','canonical-boundary','Esta vista pertenece al libro físico SKU de '+model.horizonDays+' días. Las unidades SKU, pedidos completos y CLP no se suman a los indicadores agregados de una jornada. Tampoco acredita entrega al cliente.');
 add(host,'h3','canonical-list-title','Recorrido entre áreas');
 const grid=add(host,'div','canonical-area-stages');
 for(const [index,stage] of model.stages.entries()){
  const details=add(grid,'details','canonical-area-step '+(stage.signal==='warning'?'attention':''));
  details.setAttribute('data-area-id',stage.id);
  const summary=add(details,'summary','canonical-area-summary');
  const code=add(summary,'span','canonical-area-index',String(index+1).padStart(2,'0'));
  const heading=add(summary,'span','canonical-area-text');
  add(heading,'strong','',stage.title);
  add(heading,'small','',stage.headline);
  const marker=add(summary,'span','canonical-area-marker',stage.signal==='warning'?'Revisar':'Observado');
  marker.setAttribute('aria-label',stage.signal==='warning'?'Señal de revisión del escenario':'Dato observado en el modelo');
  const expanded=add(details,'div','canonical-area-expand');
  add(expanded,'p','',stage.detail);
  add(expanded,'p','canonical-area-cause','Por qué importa: '+stage.causal);
  add(expanded,'small','canonical-area-evidence','Trazabilidad: '+stage.evidence.join(' · ')+'. Unidad: '+stage.unit+'.');
 }
 const timeline=add(host,'details','canonical-day-detail');
 add(timeline,'summary','','📆 Ver los movimientos diarios que explican el resultado');
 add(timeline,'p','',stageActive?'Picking deja pedidos completos en STAGING-CD hasta que Transporte pueda despacharlos. Espera simulada, no promesa de entrega.':'Son salidas del CD y movimientos internos de la misma cohorte; los pendientes no tienen entrega prometida.');
 const days=add(timeline,'div','canonical-day-grid');
 for(const day of model.days){
  const card=add(days,'div','canonical-day-row');
  add(card,'strong','',stageActive?'Día '+day.day+' · '+fmt(day.pickedOrders)+' preparados · '+fmt(day.awaitingTransportOrders)+' esperan camión · '+fmt(day.shippedOrders)+' expedidos':'Día '+day.day+' · '+fmt(day.shippedOrders)+' pedidos expedidos · '+fmt(day.remainingOrders)+' pendientes');
  add(card,'small','','Muelle +'+fmt(day.dockArrivedSkuUnits)+' SKU · recibido '+fmt(day.receivedSkuUnits)+' SKU · cola '+fmt(day.receivingQueueSkuUnits)+' SKU');
  add(card,'small','','Calidad liberó '+fmt(day.releasedSkuUnits)+' SKU · retenido '+fmt(day.qualityHeldSkuUnits)+' SKU · reserva trasladada '+fmt(day.movedReserveSkuUnits)+' SKU');
  add(card,'small','','Picking '+fmt(day.pickedOrders)+' pedidos · '+fmt(day.pickedSkuUnits)+' SKU preparados · expedidos '+fmt(day.shippedOrders)+' pedidos');
  if(stageActive)add(card,'small','','STAGING-CD '+fmt(day.closingStagingSkuUnits)+' SKU · espera máxima '+fmt(day.oldestStagingDays)+' días');
  add(card,'small','','PICK-FACE '+fmt(day.closingPickFaceSkuUnits)+' SKU · RESERVA-CD '+fmt(day.closingReserveSkuUnits)+' SKU · verificable '+fmt(day.closingVerifiedSkuUnits)+' SKU · sin verificar '+fmt(day.closingUnverifiedSkuUnits)+' SKU');
 }
 add(host,'p','canonical-boundary',stageActive?'Nota de realismo: un pedido preparado queda en STAGING-CD hasta su despacho real. No se simulan carga detallada ni entrega confirmada al cliente. Comercial y Planning no son ingresos físicos.':'Nota de realismo: Picking ahora registra cada preparación por separado, pero se despacha el mismo día. Todavía no se simulan staging, espera de transporte ni prueba de entrega. Comercial y Planning son compromisos de gestión, no eventos de ingreso de productos.');
 return model;
}
function renderPrimarySkuSummary(model){
 const panel=$('primarySkuSummary'),metrics=$('primarySkuMetrics'),insight=$('primarySkuInsight');
 panel.hidden=false;metrics.replaceChildren();insight.replaceChildren();
 const total=model.metrics.actualOrders,shipped=model.metrics.shippedOrders,pending=model.metrics.pendingOrders;
 const stageActive=model.pickingLedger?.stage==='independent-staging';
 const percent=total?100*shipped/total:100;
 $('primarySkuHeading').textContent=stageActive&&model.metrics.stagedOrders?'📦 Pedidos preparados esperan Transporte':pending?'📦 Aún quedan pedidos pendientes':'📦 La cohorte de pedidos fue expedida';
 $('primarySkuIntro').textContent='Resultado de '+fmt(total)+' pedidos completos de la cohorte SKU, observados del día 0 al '+model.horizonDays+'. La misma información alimenta las ocho áreas.';
 const summaryCounts=stageActive?[
  ['Sin preparar',model.metrics.unpickedOrders,'pedidos completos'],
  ['En staging',model.metrics.stagedOrders,'pedidos preparados'],
  ['Despachados CD',shipped,percent.toFixed(1).replace('.',',')+' % del total']
 ]:[
  ['Pedidos solicitados',total,'pedidos completos'],
  ['Despachados desde CD',shipped,percent.toFixed(1).replace('.',',')+' % de la cohorte'],
  ['Pendientes al corte',pending,'sin fecha de entrega confirmada']
 ];
 for(const [title,n,unit] of summaryCounts){
  const tile=add(metrics,'div','canonical-area-stat');
  add(tile,'span','',title);add(tile,'strong','',fmt(n));add(tile,'small','',unit);
 }
 add(insight,'strong','',pending?'Prioridad de gerencia: recuperar pedidos sin inventar existencias':'Prioridad de gerencia: sostener el servicio y revisar el costo');
 add(insight,'p','',stageActive&&model.metrics.stagedOrders?'Hay '+fmt(model.metrics.stagedOrders)+' pedidos listos en staging y '+fmt(model.metrics.unpickedOrders)+' sin preparar. Revisa la capacidad de Transporte antes de comprar más: preparar no equivale a despachar ni a entregar al cliente.':pending
  ? 'Se pueden investigar compras, reserva física y capacidad por área. La vista de las ocho áreas permite ver qué ingresó, qué se liberó y qué salió realmente del CD. Ninguna expedición equivale a entrega confirmada.'
  : 'Los pedidos de esta cohorte salieron del CD dentro del horizonte simulado. El costo de la campaña y la recepción por parte del cliente todavía requieren datos adicionales.');
}
function renderSkuLab(contract=currentCampaignContract()){
 // The SKU/day limits inherited from the aggregate shift are DIDACTIC
 // hypotheses rather than physically calibrated productivity rates.
 // M2-04d: consume the same immutable contract as the main render.
 // Standalone policy controls create a fresh contract after changing settings.
 const {area,commercialForecast,planningCoverage,supplierRate,skuAreaCapacity}=contract;
 const currentSkuDecision=activeSkuDecision(contract),skuLocked=!!currentSkuDecision;
 const input=skuContractInputs(contract);
 if(currentSkuDecision){skuRecovery=currentSkuDecision.option;skuUrgentArrival=currentSkuDecision.urgentArrivalDay;skuPurchaseCoverage=currentSkuDecision.purchaseCoveragePercent;skuReservePercent=currentSkuDecision.reservePercent??0}
 let plannedSkuRun=null;
 currentSkuAreaModel=null;currentSkuProjection=null;
 const root=$('skuLab');root.replaceChildren();
 if(currentSkuDecision){const stamp=add(root,'div','sku-decision-stamp');add(stamp,'strong','','✓ Decisión SKU confirmada en simulación');add(stamp,'p','',(currentSkuDecision.option==='emergency'?'Compra extraordinaria de '+fmt(currentSkuDecision.orderedExtraUnits)+' unidades SKU.':currentSkuDecision.option==='reserve'?'Traslado interno de '+fmt(currentSkuDecision.releasedReserveUnits)+' unidades desde RESERVA-CD.':'Sin compra adicional.')+' Recuperación: '+fmt(currentSkuDecision.recoveredOrders)+' pedidos completos adicionales al día '+fmt(currentSkuDecision.horizonDays)+'. Consulta su trazabilidad en Recuperación.');}
 const controls=$('skuPolicyControls');controls.replaceChildren();
 for(const [id,p] of Object.entries(POLICY_PRESETS)){
  const button=add(controls,'button',id===skuPolicy?'btn':'btn secondary',p.label);
  button.type='button';button.disabled=skuLocked;button.setAttribute('aria-pressed',String(id===skuPolicy));
  button.onclick=()=>{skuPolicy=id;save();renderSkuLab()};
 }
 const delayButton=add(controls,'button',skuSupplierDelay?'btn':'btn secondary',skuSupplierDelay?'Demora SKU A: +8 días':'Simular atraso SKU A (+8 días)');
 delayButton.type='button';delayButton.disabled=skuLocked;delayButton.setAttribute('aria-pressed',String(skuSupplierDelay));
 delayButton.onclick=()=>{skuSupplierDelay=!skuSupplierDelay;save();renderSkuLab()};
 const stageToggle=add(controls,'button',skuSeparateTransport?'btn':'btn secondary',
  skuSeparateTransport?'🚚 Staging activo · separar Picking y Transporte':'🚚 Activar staging de pedidos preparados');
 stageToggle.type='button';
 stageToggle.setAttribute('aria-pressed',String(skuSeparateTransport));
 stageToggle.setAttribute('aria-label','Separar Picking y Transporte con pedidos preparados en staging');
 stageToggle.onclick=()=>{skuSeparateTransport=!skuSeparateTransport;save();renderSkuLab()};
 add(controls,'small','','Con staging, un pedido preparado espera camión dentro del CD. Puedes activarlo o volver al despacho del mismo día; no cambia las compras originales.');
 if(!revealed){$('canonicalAreaView').replaceChildren();$('primarySkuSummary').hidden=true;for(const id of ['primarySkuSummary','canonicalAreaView']){delete $(id).dataset.campaignId;delete $(id).dataset.projectionStamp;}}
 if(revealed){
  const actualOrders=contract.actualSampleOrders;
  // The selected comparison is shared between the operational trace and SKU audit.
  const projection=skuSession.getProjection({contract,skuInputs:input,option:skuRecovery,urgentArrivalDay:skuUrgentArrival,purchaseCoveragePercent:skuPurchaseCoverage});
  const recovery=projection.comparison;
  const integrated=recovery.integrated;
  plannedSkuRun=integrated.planned;
  const chain=projection.chain;
  const physicalAreas=renderCanonicalAreasFromSku(projection.areaModel);
  currentSkuProjection=projection;
  for(const id of ['primarySkuSummary','canonicalAreaView']){$(id).dataset.campaignId=projection.campaignId;$(id).dataset.projectionStamp=projection.stamp;}
  // Reuse one immutable SKU projection for preliminary and final screens.
  currentSkuAreaModel=physicalAreas;
  renderPrimarySkuSummary(physicalAreas);
  const trace=add(root,'div','area-kpi-tile supply-trace');
  add(trace,'strong','','🔗 Cómo se conectan las áreas');
  add(trace,'small','','Comercial → Planeación: pronóstico '+commercialForecast.toFixed(1)+' % de 200 pedidos · cobertura planificada '+planningCoverage.toFixed(1)+' %. La orden de compra SKU original queda congelada y la demanda sorpresa no la recalcula.');
  add(trace,'small','','La cohorte de '+fmt(contract.plannedSampleOrders)+' pedidos SKU representa solo una muestra; la campaña principal trabaja con '+fmt(contract.trace.plannedCampaignUnits)+' unidades agregadas. Stock y costos todavía no son intercambiables entre motores.');
  // Trace only existing ledger outcomes; never recompute their physical events.
  const coverage=decisionPhysicalCoverage({boundaryAudit:contract.boundaryAudit,areaModel:physicalAreas});
  add(trace,'small','','Decisiones: supuestos didácticos. Movimientos: registro físico SKU simulado; capacidad SKU/día todavía sin calibración independiente.');
  const evidencePanel=add(trace,'details','manager-po-detail');
  evidencePanel.dataset.decisionCoverage='sku-events';
  add(evidencePanel,'summary','','Ver origen de decisiones y evidencia de las ocho áreas');
  for(const item of coverage.areas){
   const line=add(evidencePanel,'p','manager-fineprint');
   line.dataset.areaId=item.area;
   line.dataset.evidenceClass=item.evidenceClass;
   const title={commercial:'Comercial',planning:'Planificación',purchasing:'Compras',receiving:'Recepción',quality:'Calidad',inventory:'Inventario',picking:'Picking',transport:'Transporte'}[item.area];
   add(line,'strong','',title);
   add(line,'span','',': '+item.explanation+'. '+(item.evidenceClass==='managerial-plan'?'Compromiso de planificación.':'Evento simulado por SKU/día.'));
  }
  add(trace,'small','','Manifiesto SKU comprometido: '+Object.entries(chain.purchasing.originalPurchase).map(([id,qty])=>'SKU '+id+' '+fmt(qty)).join(' · ')+'.');
  add(trace,'small','','Compras: proveedor cumple '+supplierRate.toFixed(1)+' % de las unidades de compra ordinaria. Solicitadas SKU '+fmt(chain.purchasing.originalOrdered)+' · entregadas '+fmt(chain.purchasing.originalDelivered)+' · faltantes definitivos '+fmt(chain.purchasing.originalUnfilled)+'.');
  add(trace,'small','','Calidad: libera '+fmt(chain.quality.releasePercent)+' % diario del stock retenido · quedan '+fmt(chain.quality.waiting)+' unidades pendientes de liberar.');
  add(trace,'small','','Límites SKU/día asumidos desde la jornada agregada (sin calibrar): Recepción '+fmt(area.receivingCapacity)+' · Picking '+fmt(area.pickingCapacity)+' · Transporte '+fmt(area.stages[7].capacity)+'. '+(skuSeparateTransport?'Staging independiente habilitado.':'Picking y Transporte despachan el mismo día.'));
  if(chain.receiving.waitingReceiving)add(trace,'small','','⚠ Quedan '+fmt(chain.receiving.waitingReceiving)+' unidades por ingresar al término del horizonte por restricciones de recepción.');
  add(trace,'small','','Compras: '+fmt(chain.purchasing.extraUnits)+' unidades extraordinarias · costo CLP '+fmt(chain.purchasing.extraCost));
  add(trace,'small','','Recepción: '+fmt(chain.receiving.receivedExtraUnits)+' unidades llegan dentro de 12 días · '+fmt(chain.receiving.outsideHorizonUnits)+' no ingresadas al corte');
  add(trace,'small','','Reserva interna sin habilitar: '+Object.entries(chain.inventory.reserved).map(([id,n])=>'SKU '+id+' '+fmt(n)).join(' · ')+'. Es stock inicial separado, no una compra.');
  add(trace,'small','','Inventario físico después de Calidad: '+Object.entries(chain.inventory.ending).map(([id,n])=>'SKU '+id+' '+fmt(n)).join(' · '));
  add(trace,'small','','Exactitud de Inventario '+fmt(chain.inventory.accuracyPercent)+' % → stock verificable para picking: '+Object.entries(chain.inventory.pickable).map(([id,n])=>'SKU '+id+' '+fmt(n)).join(' · ')+'.');
  add(trace,'small','','Stock físico no verificable: '+Object.entries(chain.inventory.unverified).map(([id,n])=>'SKU '+id+' '+fmt(n)).join(' · ')+'. No es pérdida ni rechazo de Calidad. La acción de reserva de la campaña agregada aún no modifica la muestra SKU.');
  add(trace,'small','',skuSeparateTransport?'Picking: '+fmt(physicalAreas.metrics.pickedOrders)+' preparados · '+fmt(physicalAreas.metrics.stagedOrders)+' en staging esperando Transporte · '+fmt(physicalAreas.metrics.shippedOrders)+' expedidos · '+fmt(physicalAreas.metrics.unpickedOrders)+' sin preparar.':'Picking y despacho: '+fmt(chain.picking.completed)+' pedidos completos · '+fmt(chain.picking.pending)+' pendientes · mejora '+fmt(chain.picking.improvement));
  add(trace,'small','','Comparador incremental hipotético (no caja real): flujo proxy CLP '+fmt(chain.finance.incrementalCash)+' · efecto económico proxy CLP '+fmt(chain.finance.economicProxy)+'.');
  // M4-14: explain rates only on demand; never add them to the aggregate P&L.
  const costRates=skuCostCatalogReadModel({catalog:SKU_CATALOG});
  const costsPanel=add(trace,'details','supply-trace-detail sku-cost-catalog');
  costsPanel.dataset.costScope='sku-cohort';
  add(costsPanel,'summary','','💰 Ver tarifas y supuestos SKU (CLP)');
  add(costsPanel,'p','manager-fineprint','Estos valores son ejemplos para la cohorte SKU de 12 días, no pagos ni utilidad. Solo se valorizan movimientos registrados. No sumarlos al resultado de una jornada.');
  for(const sku of costRates.productCosts){
   const line=add(costsPanel,'p','manager-fineprint');
   line.dataset.skuCostId=sku.id;
   add(line,'strong','','SKU '+sku.id+': ');
   add(line,'span','','CLP '+fmt(sku.rateCLPPerPhysicalUnit)+' por unidad física · costo estándar de inventario, no desembolso.');
  }
  for(const rule of costRates.activityRates){
   const line=add(costsPanel,'p','manager-fineprint');
   line.dataset.activityCostId=rule.id;
   const displayed=rule.id==='urgent-surcharge'||rule.id==='inventory-holding'
    ?(100*rule.rate).toLocaleString('es-CL')+' %'
    :'CLP '+fmt(rule.rate);
   add(line,'span','',rule.label+': '+displayed+' · '+rule.basis+'.');
  }
  add(costsPanel,'p','manager-fineprint','Aún sin tarifa física validada: '+costRates.unpricedOperations.map(x=>x.label).join(', ')+'. Las tasas por defecto son supuestos; faltan costos completos por actividad y pagos comprobados.');

  // M4-15: identical physical SKU ledger already rendered in this campaign.
  // The valuation is read-only and cannot introduce stock or customer payments.
  const valuation=chain.campaign.inventoryValuation;
  const valuePanel=add(trace,'details','supply-trace-detail sku-inventory-valuation');
  valuePanel.dataset.valuationScope='sku-cohort';
  const valueSummary=add(valuePanel,'summary','','📦 Ver valor del inventario por SKU y día (CLP)');
  add(valuePanel,'p','manager-fineprint',
   'Apertura CLP '+fmt(valuation.totals.openingCLP)+' + recibido CLP '+fmt(valuation.totals.receivedToDateCLP)+
   ' − expedido CLP '+fmt(valuation.totals.shippedToDateCLP)+' = stock físico CLP '+fmt(valuation.totals.closingPhysicalCLP)+'.');
  add(valuePanel,'p','manager-fineprint',
   'Al cierre: disponible CLP '+fmt(valuation.totals.pickFaceCLP)+' · Calidad CLP '+fmt(valuation.totals.qualityHeldCLP)+
   ' · reserva CLP '+fmt(valuation.totals.reserveCLP)+' · staging CLP '+fmt(valuation.totals.stagingCLP)+'.');
  add(valuePanel,'p','manager-fineprint',
   'Stock verificable y no verificable ya están incluidos en disponible. Traslados y liberaciones no crean inventario, compras ni pagos.');
  const skuBreakdown=add(valuePanel,'details','supply-trace-detail');
  add(skuBreakdown,'summary','','Ver valor final de los tres SKU');
  for(const line of valuation.daily.at(-1).bySku){
   const item=add(skuBreakdown,'p','manager-fineprint');
   item.dataset.valuationSku=line.skuId;
   add(item,'strong','','SKU '+line.skuId+' · ');
   add(item,'span','','CLP '+fmt(line.closingPhysicalCLP)+' en stock físico = disponible '+fmt(line.pickFaceCLP)+
    ' + Calidad '+fmt(line.qualityHeldCLP)+' + reserva '+fmt(line.reserveCLP)+' + staging '+fmt(line.stagingCLP)+'.');
  }
  const dailyValues=add(valuePanel,'details','supply-trace-detail');
  add(dailyValues,'summary','','Ver saldos y entradas por día');
  for(const day of valuation.daily){
   const line=add(dailyValues,'p','manager-fineprint');
   line.dataset.valuationDay=String(day.day);
   add(line,'strong','','Día '+day.day+' · ');
   add(line,'span','','recibido '+fmt(day.totals.receivedTodayCLP)+
    ' · expedido '+fmt(day.totals.shippedTodayCLP)+' · stock final CLP '+fmt(day.totals.closingPhysicalCLP));
  }
  add(valuePanel,'p','manager-fineprint',
   'Importes a costo estándar ilustrativo, no ingresos, gastos operacionales, flujo de caja ni entrega confirmada al cliente. No sumar al motor de jornada agregada.');


  const canonical=chain.campaign;
  const campaignCard=add(trace,'details','supply-trace-detail');
  add(campaignCard,'summary','','🧾 Ver campaña única de pedidos y movimientos SKU');
  add(campaignCard,'small','','Identificador '+canonical.campaignId+' · '+fmt(canonical.orders.length)+' pedidos identificables · '+(skuSeparateTransport?fmt(canonical.picks.length)+' preparaciones · ':'')+fmt(canonical.shipments.length)+' despachos trazados · '+fmt(canonical.receipts.length)+' ingresos a CD · '+fmt(canonical.qualityReleases.length)+' liberaciones registradas.');
  add(campaignCard,'small','',canonical.passed?'✓ Eventos por pedido, recepción, calidad y stock reconciliados':'⚠ Inconsistencias en los eventos detallados; revisar auditoría.');
  add(campaignCard,'small','','Las compras originales permanecen congeladas. Esta cohorte SKU todavía no sustituye el cálculo agregado del resultado final.');
  const commitment=chain.procurementLedger;
  // M4-16: monetary states tied to the SAME canonical PO and receipt events.
  const poCost=canonical.purchaseCost;
  const poPanel=add(trace,'details','supply-trace-detail sku-purchase-cost');
  poPanel.dataset.purchaseCostScope='sku-cohort';
  add(poPanel,'summary','','💳 Compras: compromiso, recepción y caja (CLP)');
  add(poPanel,'p','manager-fineprint',
   'Compromiso original CLP '+fmt(poCost.totals.originalCommitmentCLP)+
   ' · compra urgente CLP '+fmt(poCost.totals.urgentCommitmentCLP)+
   ' · recargo supuesto CLP '+fmt(poCost.proxy.urgentSurchargeCLP)+'.');
  add(poPanel,'p','manager-fineprint',
   'Del valor comprado (sin recargo): proveedor incumple CLP '+fmt(poCost.totals.supplierShortfallCLP)+
   ' · en tránsito CLP '+fmt(poCost.totals.inTransitCLP)+
   ' · espera en Recepción CLP '+fmt(poCost.totals.waitingWarehouseCLP)+
   ' · ingresado al CD CLP '+fmt(poCost.totals.warehouseReceivedCLP)+'.');
  add(poPanel,'p','manager-fineprint',
   'Material expedido a costo estándar CLP '+fmt(poCost.totals.shippedMaterialAtStandardCostCLP)+
   '. Incluye stock inicial y no se puede atribuir completo a compras nuevas.');
  add(poPanel,'p','manager-fineprint',
   'Salida de caja supuesta por compra urgente y recargo: CLP '+
    fmt(poCost.proxy.incrementalPurchaseOutflowAssumptionCLP)+
   '. Pago real: sin comprobante. La compra original tampoco acredita pago, factura ni vencimiento.');
  const poOrders=add(poPanel,'details','supply-trace-detail');
  add(poOrders,'summary','','Ver cada orden y su estado en CLP');
  for(const item of poCost.byPurchaseOrder){
   const line=add(poOrders,'p','manager-fineprint');
   line.dataset.purchaseOrderId=item.purchaseOrderId;
   add(line,'strong','',(item.source==='original'?'Original':'Urgente')+' · SKU '+item.skuId+' · ');
   add(line,'span','','comprometido CLP '+fmt(item.committedCLP)+
    ' · faltante '+fmt(item.supplierShortfallCLP)+' · tránsito '+fmt(item.inTransitCLP)+
    ' · cola '+fmt(item.waitingWarehouseCLP)+
    ' · recibido '+fmt(item.warehouseReceivedCLP)+'.');
  }
  const poDays=add(poPanel,'details','supply-trace-detail');
  add(poDays,'summary','','Ver recepción valorizada por día');
  for(const day of poCost.daily){
   const line=add(poDays,'p','manager-fineprint');
   line.dataset.purchaseCostDay=String(day.day);
   add(line,'strong','','Día '+day.day+' · ');
   add(line,'span','','ingreso CLP '+fmt(day.receivedTodayCLP)+
    ' · acumulado CLP '+fmt(day.receivedToDateCLP)+
    ' · pago real no confirmado.');
  }
  add(poPanel,'p','manager-fineprint',
   'Se valorizan solo las recepciones físicas. Compra comprometida, material expedido y salida de caja simulada son conceptos distintos; no sumar estos valores entre sí ni a la jornada agregada.');

  // M5-22: compact PO-to-dock-to-warehouse-to-Quality trace, with no fake ETA.
  if(['emergency','combined'].includes(recovery.option)){
   const urgent=canonical.urgentPurchase;
   const urgentPanel=add(trace,'details','supply-trace-detail sku-urgent-purchase-trace');
   urgentPanel.dataset.urgentPoScope='sku-cohort';
   add(urgentPanel,'summary','','🚚 Compra urgente: del proveedor al stock SKU');
   add(urgentPanel,'p','manager-fineprint',
    'Compra simulada: '+fmt(urgent.totals.committedSkuUnits)+' unidades SKU · '+
    'costo base comprometido CLP '+fmt(urgent.totals.principalCommitmentCLP)+
    ' + recargo supuesto CLP '+fmt(urgent.totals.surchargeAssumptionCLP)+'.');
   add(urgentPanel,'p','manager-fineprint',
    'Llegó al muelle '+fmt(urgent.totals.modeledDockArrivalsSkuUnits)+
    ' · ingresó a bodega '+fmt(urgent.totals.warehouseReceivedSkuUnits)+
    ' · en tránsito '+fmt(urgent.totals.inTransitAtCutoffSkuUnits)+
    ' · espera Recepción '+fmt(urgent.totals.waitingWarehouseAtCutoffSkuUnits)+'.');
   add(urgentPanel,'p','manager-fineprint',
    'De lo ingresado, Calidad liberó '+fmt(urgent.totals.releasedFromQualitySkuUnits)+
    ' y mantiene '+fmt(urgent.totals.heldAtQualitySkuUnits)+
    ' unidades retenidas. Liberado no siempre significa listo para picking.');
   const urgentBySku=add(urgentPanel,'details','supply-trace-detail');
   add(urgentBySku,'summary','','Ver las órdenes y fechas por SKU');
   for(const line of urgent.bySku){
    const item=add(urgentBySku,'p','manager-fineprint');
    item.dataset.urgentSku=line.skuId;
    add(item,'strong','','SKU '+line.skuId+' · ');
    add(item,'span','',line.committedSkuUnits
     ?'PO '+line.purchaseOrderId+' · '+fmt(line.committedSkuUnits)+' uds · llegada prevista al muelle día '+
      line.modeledDockArrivalDay+' · primera recepción '+(line.firstWarehouseReceiptDay===null?'sin registro':'día '+line.firstWarehouseReceiptDay)+
      ' · ingreso '+fmt(line.warehouseReceivedSkuUnits)+' · liberación Calidad '+
      fmt(line.releasedFromQualitySkuUnits)+' · pendiente muelle '+fmt(line.waitingWarehouseAtCutoffSkuUnits)+'.'
     :'sin compra extraordinaria (faltante o cobertura 0 %).');
   }
   const urgentDays=add(urgentPanel,'details','supply-trace-detail');
   add(urgentDays,'summary','','Ver llegadas y recepciones por día');
   for(const day of urgent.daily){
    const item=add(urgentDays,'p','manager-fineprint');
    item.dataset.urgentDay=String(day.day);
    add(item,'strong','','Día '+day.day+' · ');
    add(item,'span','','llegó al muelle '+fmt(day.arrivedAtDockSkuUnits)+
     ' · recibió bodega '+fmt(day.warehouseReceivedSkuUnits)+'.');
   }
   add(urgentPanel,'p','manager-fineprint',
    'La fecha del proveedor es una suposición y solo marca llegada al muelle. Recepción y Calidad pueden demorar el uso del SKU. '+
    'El compromiso y recargo NO acreditan factura ni pago. No asumir que cada pedido adicional usó material de esta compra.');
  }

  // M5-23: physical RESERVA-CD → PICK-FACE; the value moved is not a fee.
   if(recovery.option==='reserve'){
    const reserve=canonical.reserveTrace;
    const panel=add(trace,'details','supply-trace-detail sku-reserve-transfer-trace');
    panel.dataset.reserveTraceScope='sku-cohort';
    add(panel,'summary','','📦 Reserva interna: traslado por SKU');
    add(panel,'p','manager-fineprint',
     'En RESERVA-CD al inicio '+fmt(reserve.totals.openingReserveSkuUnits)+
     ' · trasladado '+fmt(reserve.totals.transferredSkuUnits)+
     ' · permanece reservado '+fmt(reserve.totals.remainingReserveSkuUnits)+' SKU.');
    add(panel,'p','manager-fineprint',
     'Valor estándar reclasificado CLP '+fmt(reserve.totals.standardInventoryValueReclassifiedCLP)+
     '. No es compra ni gasto. Costo operativo del traslado: sin tarifa calibrada, NO equivale a CLP 0.');
    const skus=add(panel,'details','supply-trace-detail');
    add(skus,'summary','','Ver unidades y ubicación por SKU');
    for(const row of reserve.bySku){
     const line=add(skus,'p','manager-fineprint');
     line.dataset.reserveSku=row.skuId;
     add(line,'strong','','SKU '+row.skuId+' · ');
     add(line,'span','',fmt(row.transferredSkuUnits)+' movidos'+
      (row.effectiveTransferDay===null?' (sin traslado hasta el corte)':' día '+row.effectiveTransferDay)+
      ' · quedan '+fmt(row.remainingReserveSkuUnits)+
      ' en RESERVA-CD · CLP '+fmt(row.standardValueReclassifiedCLP)+' reclasificados.');
    }
    const days=add(panel,'details','supply-trace-detail');
    add(days,'summary','','Ver traslado y reserva por día');
    for(const day of reserve.daily){
     const line=add(days,'p','manager-fineprint');
     line.dataset.reserveDay=String(day.day);
     add(line,'strong','','Día '+day.day+' · ');
     add(line,'span','','trasladado '+fmt(day.transferredSkuUnits)+
      ' · pendiente reserva '+fmt(day.remainingReserveSkuUnits)+' SKU.');
    }
    add(panel,'p','manager-fineprint',
     'El inventario de apertura no tiene lote individual identificado. La reserva solo pasa a PICK-FACE en el día simulado; su uso requiere exactitud de inventario, Picking y Transporte. No equivale a una entrega confirmada al cliente.');
   }

   // M4-17: distinct from purchases, stock valuation and the aggregate day.
  const labor=canonical.operationalCost,resource=canonical.capacityTrace;
  const laborPanel=add(trace,'details','supply-trace-detail sku-operational-cost');
  laborPanel.dataset.operationalCostScope='sku-cohort';
  add(laborPanel,'summary','','🛠️ Refuerzo: jornadas y capacidad ociosa (CLP)');
  add(laborPanel,'p','manager-fineprint',
   'Jornadas de refuerzo activadas '+fmt(labor.totals.chargeableShifts)+
   ' / '+fmt(labor.daily.length)+' · tarifa CLP '+fmt(labor.rateCLPPerActivatedShift)+
   ' por jornada activada · costo modelado CLP '+fmt(labor.totals.totalCostCLP)+'.');
  add(laborPanel,'p','manager-fineprint',
   'Cupos adicionales asignados '+fmt(labor.totals.assignedExtraSlots)+
   ' · utilizados sobre capacidad base '+fmt(labor.totals.utilizedExtraSlots)+
   ' · ociosos '+fmt(labor.totals.idleExtraSlots)+'.');
  if(['overtime','combined'].includes(recovery.option)){
   add(laborPanel,'p','manager-fineprint',
    'Pedidos que salen del CD: '+fmt(resource.totals.baseDispatchedOrders)+
    ' sin intervención → '+fmt(resource.totals.alternativeDispatchedOrders)+
    ' con esta alternativa ('+(resource.totals.netDispatchChangeOrders>=0?'+':'')+
    fmt(resource.totals.netDispatchChangeOrders)+').');
   if(resource.totals.netDispatchChangeOrders<=0)add(laborPanel,'p','manager-warning',
    '⚠ El refuerzo no aumenta los pedidos expedidos dentro del horizonte. Revisa inventario, Calidad, Picking y Transporte antes de contratar capacidad.');
   if(recovery.option==='combined')add(laborPanel,'p','manager-fineprint',
    'La alternativa también compra SKU urgentes: no atribuir todos los pedidos adicionales al refuerzo.');
  }
  add(laborPanel,'p','manager-fineprint',
   labor.extraCapacityOrdersPerDay
    ?'Solo se activa refuerzo en días con picking o expedición. Si se activa, se paga la jornada incluso con cupos ociosos; días sin actividad no se contratan.'
    :'No se solicitó refuerzo adicional de capacidad: no hay jornadas ni cargos extra.');
  const laborDays=add(laborPanel,'details','supply-trace-detail');
  add(laborDays,'summary','','Ver activación y costo por día');
  for(const day of labor.daily){
   const line=add(laborDays,'p','manager-fineprint');
   line.dataset.operationalCostDay=String(day.day);
   add(line,'strong','','Día '+day.day+' · ');
   const evidence=resource.daily[day.day];
   add(line,'span','',(day.activated?'refuerzo activado':'sin refuerzo')+
    ' · usados '+fmt(evidence.extraOrderSlotsUsed)+
    ' / '+fmt(evidence.extraOrderSlotsAssigned)+
    ' · ociosos '+fmt(evidence.extraOrderSlotsIdle)+
    ' · preparados '+fmt(evidence.pickedCompleteOrders)+
    ' · expedidos '+fmt(evidence.dispatchedCompleteOrders)+
    ' (base '+fmt(evidence.baselineDispatchedCompleteOrders)+')'+
    ' · CLP '+fmt(evidence.dailyIncrementalCostCLP)+'.');
  }
  add(laborPanel,'p','manager-fineprint',
   'El refuerzo amplía un mismo límite didáctico de pedidos para Picking y salida del CD: no crea stock ni mejora automáticamente Recepción o Calidad. El turno se cobra cuando hubo actividad, incluso si no se superó la capacidad base. Los cupos utilizados NO son pedidos atribuibles al refuerzo. Sin dotación, horas o nómina real verificadas.');

  // M4-18: illustrative partial contribution only, not a customer invoice or P&L.
  const economics=canonical.economicResult;
  const economicPanel=add(trace,'details','supply-trace-detail sku-campaign-economics');
  economicPanel.dataset.economicScope='sku-cohort';
  add(economicPanel,'summary','','📊 Resultado parcial de pedidos expedidos (CLP)');
  add(economicPanel,'p','manager-fineprint',
   'Pedidos completos expedidos '+fmt(economics.totals.shippedOrders)+
   ' · valor ilustrativo por pedido CLP '+fmt(economics.revenueRateCLPPerCompleteShippedOrder)+'.');
  add(economicPanel,'p','manager-fineprint',
   'Valor potencial de expediciones CLP '+fmt(economics.totals.potentialDispatchValueCLP)+
   ' − costo estándar de SKU expedidos CLP '+fmt(economics.totals.dispatchedMaterialCostCLP)+
   ' − refuerzo activado CLP '+fmt(economics.totals.incrementalOperatingCostCLP)+'.');
  add(economicPanel,'p','manager-fineprint',
   'Contribución parcial estimada CLP '+fmt(economics.totals.partialContributionCLP)+
   '. Puede ser negativa; NO es utilidad, EBITDA, venta cobrada ni caja real.');
  add(economicPanel,'p','manager-fineprint',
   'Excluidos de la resta: compras comprometidas (original CLP '+
    fmt(economics.excludedCommitments.originalPurchaseCommitmentCLP)+
   ', urgente CLP '+fmt(economics.excludedCommitments.urgentPurchaseCommitmentCLP)+
   '), recargo sin factura CLP '+fmt(economics.excludedCommitments.urgentSurchargeCommitmentCLP)+
   ' y existencias al cierre CLP '+fmt(economics.excludedCommitments.stockStillOnHandCLP)+'.');
  const economicDays=add(economicPanel,'details','supply-trace-detail');
  add(economicDays,'summary','','Ver ingresos potenciales y costos por día');
  for(const day of economics.daily){
   const line=add(economicDays,'p','manager-fineprint');
   line.dataset.economicDay=String(day.day);
   add(line,'strong','','Día '+day.day+' · ');
   add(line,'span','',fmt(day.shippedOrders)+' pedidos · valor '+fmt(day.potentialDispatchValueCLP)+
    ' − SKU '+fmt(day.dispatchedMaterialCostCLP)+
    ' − refuerzo '+fmt(day.incrementalOperatingCostCLP)+
    ' = contribución CLP '+fmt(day.partialContributionCLP)+'.');
  }
  const excludedProxies=add(economicPanel,'details','supply-trace-detail');
  add(excludedProxies,'summary','','Qué cifras no son costos contables confirmados');
  add(excludedProxies,'p','manager-fineprint',
   'Penalidad hipotética por atraso CLP '+fmt(economics.decisionProxies.backlogPenaltyAssumptionCLP)+
   ' y tenencia hipotética de stock CLP '+fmt(economics.decisionProxies.inventoryHoldingAssumptionCLP)+
   ': solo para comparar decisiones, no descontadas como gastos verificados.');
  add(excludedProxies,'p','manager-fineprint',
   'Sin datos de facturas de venta, cobro al cliente, pago al proveedor, dotación base, flete, impuestos, devoluciones ni depreciación. Expedición desde el CD no prueba entrega al cliente.');

  // M4-19: a SECOND-LINE audit of the same receipt/shipment event sources.
  // Distinct name from the existing legacy skuAudit() reading below.
  const financialAudit=canonical.economicAudit;
  const auditPanel=add(trace,'details','supply-trace-detail sku-economic-audit');
  auditPanel.dataset.financialAuditScope='sku-cohort';
  add(auditPanel,'summary','','✅ Auditoría: ¿los montos cuadran sin duplicarse?');
  add(auditPanel,'p','manager-fineprint',
   '✓ '+fmt(Object.values(financialAudit.checks).filter(Boolean).length)+' comprobaciones · '+
   fmt(financialAudit.totals.completeShipments)+' pedidos expedidos · CLP '+
   fmt(financialAudit.totals.partialContributionCLP)+' de contribución parcial conciliada.');
  add(auditPanel,'p','manager-fineprint',
   'Un solo origen por monto: pedidos realmente expedidos, costo de sus SKU y jornadas de refuerzo activadas.');
  const auditIncluded=add(auditPanel,'details','supply-trace-detail');
  add(auditIncluded,'summary','','Ver 3 conceptos del resultado');
  for(const line of financialAudit.recognised){
   const p=add(auditIncluded,'p','manager-fineprint');
   p.dataset.auditIncluded=line.id;
   add(p,'strong','',(line.signedFactor<0?'− ':'+ ')+line.meaning+': ');
   add(p,'span','','CLP '+fmt(line.amountCLP)+'.');
  }
  const auditExcluded=add(auditPanel,'details','supply-trace-detail');
  add(auditExcluded,'summary','','Ver 6 conceptos excluidos');
  const auditLabels={
   'original-purchase':'Compra original','urgent-purchase':'Compra urgente',
   'urgent-surcharge':'Recargo urgente','closing-inventory':'Stock en bodega',
   'backlog-proxy':'Retrasos hipotéticos','holding-proxy':'Tenencia hipotética'
  };
  for(const line of financialAudit.excluded){
   const p=add(auditExcluded,'p','manager-fineprint');
   p.dataset.auditExcluded=line.id;
   add(p,'strong','',(auditLabels[line.id]||line.id)+' · ');
   add(p,'span','','CLP '+fmt(line.amountCLP)+' · '+line.reason+'.');
  }
  add(auditPanel,'p','manager-fineprint',
   'No se cobran nuevamente compras comprometidas ni stock aún guardado. Reserva, Calidad y staging son ubicaciones, no entradas de caja.');
  add(auditPanel,'p','manager-fineprint',
   'Importante: auditoría de simulación, no auditoría contable. Sin facturas, cobros, pagos ni entrega al cliente comprobados.');



  add(trace,'small','','Abastecimiento pendiente de ingresar: '+fmt(commitment.totals.originalInTransit+commitment.totals.urgentInTransit)+' unidades aún no arribadas · '+fmt(commitment.totals.waitingReceiving)+' en cola de Recepción · '+fmt(commitment.totals.originalSupplierShortfall)+' unidades incumplidas por proveedor.');
  const commitmentDetail=add(trace,'details','supply-trace-detail');
  add(commitmentDetail,'summary','','Ver conciliación de compras por SKU');
  for(const item of commitment.bySku){
   const line=add(commitmentDetail,'div','supply-trace-day');
   add(line,'strong','','SKU '+item.id+' · pedido original '+fmt(item.originalOrdered)+' · urgente '+fmt(item.urgentOrdered));
   add(line,'small','','Proveedor incumple '+fmt(item.originalSupplierShortfall)+' · aún por arribar '+fmt(item.originalInTransit+item.urgentInTransit)+' · cola Recepción '+fmt(item.waitingReceiving));
   add(line,'small','','Recibido CD '+fmt(item.inventory.received)+' · retenido Calidad '+fmt(item.inventory.held)+' · físico en PICK-FACE '+fmt(item.inventory.available)+(skuSeparateTransport?' · en staging '+fmt(item.inventory.staged):'')+' = verificable '+fmt(item.inventory.pickable)+' + no verificable '+fmt(item.inventory.unverified)+(item.balanced?' ✓':' ⚠'));
  }
  const verdict=add(trace,'div','supply-verdict '+chain.decision.quality);
  add(verdict,'strong','',chain.decision.quality==='effective'?'Compra con impacto operativo':chain.decision.quality==='late'?'Atención: reposición fuera de plazo':chain.decision.quality==='no-gain'?'Compra sin mejora de servicio':chain.decision.quality==='receiving-blocked'?'Recepción bloquea la compra':chain.decision.quality==='no-order'?'Sin reposición extraordinaria':'No es necesaria una compra adicional');
  add(verdict,'p','',chain.decision.advice);

  const detail=add(trace,'details','supply-trace-detail');
  add(detail,'summary','','Ver recepción, stock y pedidos por día');
  const table=add(detail,'div','supply-trace-days');
  for(const day of chain.receipts){
   const row=add(table,'div','supply-trace-day');
   add(row,'strong','','Día '+day.day+' · '+fmt(day.shipped)+' pedidos · '+fmt(day.shippedUnits)+' unidades SKU');
   add(row,'small','','Recepción: '+Object.entries(day.received).map(([id,qty])=>id+' '+fmt(qty)).join(' · ')+(day.waitingReceiving?' · espera de recepción '+fmt(day.waitingReceiving):''));
   add(row,'small','','Verificable para picking: '+Object.entries(day.pickableStock).map(([id,qty])=>id+' '+fmt(qty)).join(' · ')+' · no verificable '+fmt(Object.values(day.unverifiedStock).reduce((sum,v)=>sum+v,0))+' unidades.');
   add(row,'small','','Liberado por Calidad: '+Object.entries(day.released).map(([id,qty])=>id+' '+fmt(qty)).join(' · ')+(day.waitingQuality?' · retenido '+fmt(day.waitingQuality):''));
   add(row,'small','','Stock PICK-FACE: '+Object.entries(day.stock).map(([id,qty])=>id+' '+fmt(qty)).join(' · '));
    if(skuSeparateTransport)add(row,'small','','STAGING-CD '+fmt(day.stagingUnits)+' SKU · '+fmt(day.stagingOrders)+' pedidos esperando camión');
   add(row,'small','','Completados acumulados: '+fmt(day.completed)+' · pendientes: '+fmt(day.pending));
  }
  add(trace,'small','muted',chain.assumptions);
  const bridge=add(root,'div','area-kpi-tile');
  add(bridge,'strong','','Demanda sorpresa aplicada al laboratorio SKU · compras congeladas');
  add(bridge,'small','','Plan original: 200 pedidos · pronóstico de compra: '+fmt(integrated.forecastOrders)+' pedidos · demanda real revelada: '+fmt(actualOrders)+' pedidos · compra comprometida CLP '+fmt(integrated.committedPurchaseValue));
  add(bridge,'small','','Plan al día 12: '+fmt(integrated.planned.completed)+' completos / '+fmt(integrated.planned.pending)+' pendientes · real al día 12: '+fmt(integrated.actual.completed)+' completos / '+fmt(integrated.actual.pending)+' pendientes');
  if(recovery.recovered.ledger.some(day=>day.reserveEvents.length))add(bridge,'small','','Traslados internos de RESERVA-CD: '+fmt(recovery.recovered.ledger.reduce((n,day)=>n+day.reserveEvents.reduce((t,e)=>t+e.qty,0),0))+' unidades; sin nuevas compras.');
  add(bridge,'small','','Diferencia en pendientes: '+(integrated.impact.pending>=0?'+':'')+fmt(integrated.impact.pending)+' pedidos. La sorpresa no recalcula las compras originales.');
  add(bridge,'small','',integrated.assumptions);
  const recoveryControls=add(bridge,'div','buttons');
  for(const [id,option] of Object.entries(RECOVERY_OPTIONS)){
   const button=add(recoveryControls,'button',id===skuRecovery?'btn':'btn secondary',option.label);
   button.type='button';button.disabled=skuLocked;button.setAttribute('aria-pressed',String(id===skuRecovery));
   button.onclick=()=>{skuRecovery=id;save();renderSkuLab()};
  }
  const arrivalRow=add(bridge,'div','sku-purchase-decision');
  add(arrivalRow,'strong','','Compras ↔ Inventario: ¿llegará la reposición a tiempo?');
  add(arrivalRow,'p','muted','Define cuánto del faltante físico cubrir y cuándo llega. Se descuentan el stock inicial y las compras ya comprometidas; comprar más no garantiza despachar más.');
  const coverRow=add(arrivalRow,'div','purchase-coverage-control');
  add(coverRow,'label','','¿Qué porcentaje del faltante comprar?');
  const coverInput=add(coverRow,'select','numeric-input');coverInput.setAttribute('aria-label','Cobertura de compra urgente sobre faltante SKU');
  for(const pct of [0,25,50,75,100]){const opt=add(coverInput,'option','',pct+' % del faltante');opt.value=String(pct);}
  coverInput.value=String(skuPurchaseCoverage);coverInput.disabled=skuLocked;
  coverInput.onchange=()=>{skuPurchaseCoverage=Number(coverInput.value);save();renderSkuLab()};
  add(coverRow,'small','','0 % evita compras extraordinarias; 100 % cubre el faltante teórico por SKU. Revisa despachos y caja antes de elegir.');
  const arrivalControl=add(arrivalRow,'div','surprise-controls');
  const arrivalLabel=add(arrivalControl,'label','','Día previsto de llegada al muelle');
  const arrivalInput=add(arrivalControl,'select','numeric-input');arrivalInput.setAttribute('aria-label','Día previsto de llegada al muelle');
  for(const d of [1,2,5,10,13]){const opt=add(arrivalInput,'option','',d===13?'Día 13 · fuera del horizonte':'Día '+d);opt.value=String(d);}
  arrivalInput.value=String(skuUrgentArrival);arrivalInput.disabled=skuLocked;
  arrivalInput.onchange=()=>{skuUrgentArrival=Number(arrivalInput.value);save();renderSkuLab()};
  // Do not replay the selected option: it was calculated above.
  add(arrivalRow,'small','',skuUrgentArrival>12?'⚠ La compra llegaría después del horizonte: crea un compromiso, no un pago ni stock disponible dentro del período.':'Llegada prevista al muelle día '+skuUrgentArrival+'. Recepción y Calidad pueden retrasar cuándo el stock realmente estará disponible para Picking.');
  if(recovery.urgent.length){
    const purchased=recovery.urgent.reduce((n,p)=>n+p.qty,0);
    const received=recovery.recovered.ledger.reduce((n,e)=>n+Object.values(e.receivedUrgent).reduce((a,qty)=>a+qty,0),0);
    add(arrivalRow,'small','','Reposición extraordinaria '+fmt(purchased)+' unidades SKU · recibidas dentro del horizonte '+fmt(received)+' · pedidos adicionales completos '+fmt(recovery.recovered.completed-recovery.base.completed)+'.');
    if(recovery.recovered.completed===recovery.base.completed)add(arrivalRow,'small','','⚠ La compra no mejora los pedidos completos dentro del horizonte. Revisa plazo de llegada, capacidad de picking y stock remanente antes de comprometer el gasto.');
  }
  const comparisons=Object.keys(RECOVERY_OPTIONS).map(id=>id===skuRecovery?recovery:skuSession.getComparison({contract,skuInputs:input,option:id,urgentArrivalDay:skuUrgentArrival,purchaseCoveragePercent:skuPurchaseCoverage}));
  const candidates=comparisons.filter(x=>x.recovered.completed>recovery.base.completed);
  const recommended=[...candidates].sort((a,b)=>b.economicProxyDelta-a.economicProxyDelta||b.recovered.completed-a.recovered.completed)[0]||null;
  const advisor=add(bridge,'div','sku-advisor');
  add(advisor,'strong','','Comparador de decisiones · Compras, Inventario y capacidad');
  add(advisor,'p','muted','Las alternativas comparten demanda, compras originales, fecha de llegada y cobertura del faltante. Se comparan pedidos completos y caja incremental, no margen contable.');
  // M5-20: each alternative must reuse the very same frozen scenario object.
  const frozenBase=recovery.baselineSnapshot;
  if(!frozenBase||frozenBase.scope!=='sku-cohort'
   ||comparisons.some(trial=>trial.baselineSnapshot!==frozenBase
    ||trial.base!==frozenBase.integrated.actual
    ||trial.integrated!==frozenBase.integrated)){
   throw new Error('El comparador debe partir del mismo baseline SKU congelado');
  }
  const baseDisclosure=add(advisor,'details','supply-trace-detail sku-common-baseline');
  baseDisclosure.dataset.baselineScope='sku-cohort';
  add(baseDisclosure,'summary','','🔒 Misma base para las 5 alternativas');
  add(baseDisclosure,'p','manager-fineprint',
   'Demanda real: '+fmt(frozenBase.actualOrders)+' pedidos · '+
   'stock inicial: '+fmt(frozenBase.openingState.totals.physicalSkuUnits)+' SKU, de ellos '+
   fmt(frozenBase.openingState.totals.reserveSkuUnits)+' en RESERVA-CD.');
  add(baseDisclosure,'p','manager-fineprint',
   'Sin intervenir: '+fmt(frozenBase.integrated.actual.completed)+' pedidos expedidos y '+
   fmt(frozenBase.integrated.actual.pending)+' pendientes en '+
   fmt(frozenBase.days+1)+' días de simulación.');
  add(baseDisclosure,'p','manager-fineprint',
   'Compra original comprometida: CLP '+
   fmt(frozenBase.integrated.committedPurchaseValue)+
   ' · no cambia al elegir compra urgente, espera, reserva o refuerzo.');
  add(baseDisclosure,'p','manager-fineprint',
   'Cambiar demanda, política, abastecimiento, capacidad base o % inicial reservado '+
   'crea otro escenario de partida. Cambiar solo la recuperación NO modifica esta base.');
  // M5-21: waiting is a deliberate ZERO-action result on the same frozen base.
  const waitingTrial=comparisons.find(trial=>trial.option==='wait');
  const waiting=waitingTrial?.waitEvidence;
  if(!waiting?.passed||waitingTrial.recovered!==frozenBase.integrated.actual
   ||waiting.totals.pendingAfterHorizon!==frozenBase.integrated.actual.pending){
   throw new Error('Espera no reproduce exactamente el baseline sin intervenir');
  }
  const waitPanel=add(advisor,'details','supply-trace-detail sku-wait-evidence');
  waitPanel.dataset.waitScope='sku-cohort';
  add(waitPanel,'summary','','⏳ Esperar sin intervenir · ver pedidos y plazos');
  add(waitPanel,'p','manager-fineprint',
   'Sin nuevas compras, traslados ni refuerzos: costo incremental CLP 0. '+
   fmt(waiting.totals.shippedCompleteOrders)+' pedidos expedidos · '+
   fmt(waiting.totals.pendingAfterHorizon)+' pendientes al cierre.');
  add(waitPanel,'p','manager-fineprint',
   'Expedidos el día 0: '+fmt(waiting.totals.shippedOnDayZero)+
   ' · expedidos después: '+fmt(waiting.totals.shippedAfterDayZero)+
   ' · días-pedido de espera: '+fmt(waiting.totals.backlogOrderDaysBeforeFinalCutoff)+'.');
  add(waitPanel,'p','manager-fineprint',
   'Los pedidos pendientes NO tienen fecha de salida prometida fuera del período. '+
   'La expedición desde el CD tampoco confirma entrega al cliente.');
  const waitDaily=add(waitPanel,'details','supply-trace-detail');
  add(waitDaily,'summary','','Ver backlog y expediciones por día');
  for(const row of waiting.daily){
   const p=add(waitDaily,'p','manager-fineprint');
   p.dataset.waitDay=String(row.day);
   add(p,'strong','','Día '+row.day+' · ');
   add(p,'span','',fmt(row.shippedOrders)+' expedidos · '+
    fmt(row.pendingAtDayEnd)+' pendientes'+
    (waiting.transportMode==='picking-staging-transport'
     ?' · '+fmt(row.stagedWaitingTransport)+' preparados esperando transporte':'')+'.');
  }
  for(const trial of comparisons){
   const optionCard=add(advisor,'div','sku-advisor-option'+(trial.option===skuRecovery?' current':''));
   const headline=add(optionCard,'div','sku-advisor-head');
   add(headline,'strong','',trial.label+(trial.option===skuRecovery?' · seleccionada':''));
   add(headline,'small','',fmt(trial.recovered.completed)+' / '+fmt(actualOrders)+' pedidos · '+fmt(trial.recovered.pending)+' pendientes');
   add(optionCard,'small','','Mejora '+(trial.recovered.completed-trial.base.completed>=0?'+':'')+fmt(trial.recovered.completed-trial.base.completed)+' pedidos · desembolso adicional CLP '+fmt(trial.incrementalExpense));
   add(optionCard,'small','','Caja incremental CLP '+fmt(trial.netCashDelta)+' · resultado proxy CLP '+fmt(trial.economicProxyDelta));
   const choose=add(optionCard,'button',trial.option===skuRecovery?'btn':'btn secondary',trial.option===skuRecovery?'Alternativa actual':'Comparar esta alternativa');
   choose.type='button';choose.disabled=skuLocked||trial.option===skuRecovery;choose.onclick=()=>{skuRecovery=trial.option;save();renderSkuLab()};
  }
  add(advisor,'p','sku-advisor-insight',recommended?'Mayor resultado económico proxy entre opciones que mejoran servicio: '+recommended.label+' · CLP '+fmt(recommended.economicProxyDelta)+'. Revisa también la caja y el plazo antes de decidir.':'Ninguna intervención mejora pedidos completados dentro del horizonte. Evita comprometer compras solo por aumentar stock.');
  add(bridge,'strong','','Recuperación: '+recovery.label);
  add(bridge,'small','','Pedidos finales '+fmt(recovery.recovered.completed)+' / '+fmt(actualOrders)+' · pendientes '+fmt(recovery.recovered.pending)+' · mejora '+fmt(recovery.recovered.completed-recovery.base.completed));
  if(skuRecovery==='reserve')add(bridge,'small','','Reserva ubicada: '+fmt(Object.values(recovery.reserveStock).reduce((n,x)=>n+x,0))+' unidades del stock inicial · traslado en día '+skuUrgentArrival+'.');
  add(bridge,'small','','Compra urgente '+recovery.urgent.map(p=>p.id+': '+fmt(p.qty)).join(', ')+(recovery.urgent.length?'':' ninguna')+' · desembolso incremental CLP '+fmt(recovery.incrementalExpense));
  add(bridge,'small','','Flujo de caja incremental simplificado CLP '+fmt(recovery.netCashDelta)+' · NO es margen neto');
  add(bridge,'small','','Días-pedido de atraso evitados: '+fmt(recovery.backlogDaysBase-recovery.backlogDaysRecovered)+' · penalidad ilustrativa evitada CLP '+fmt(recovery.penaltySaved)+' · variación costo de tenencia CLP '+fmt(recovery.holdingDelta));
  add(bridge,'strong','','Resultado económico proxy incremental CLP '+fmt(recovery.economicProxyDelta));
  add(bridge,'small','',recovery.assumptions);
  const audit=skuAudit({...input,option:skuRecovery,urgentArrivalDay:skuUrgentArrival,purchaseCoveragePercent:skuPurchaseCoverage,comparisonResult:recovery});
  const auditCard=add(bridge,'div','area-kpi-tile');
  add(auditCard,'strong','',audit.passed?'✓ Conciliación física y económica SKU correcta':'⚠ Inconsistencia en conciliación SKU');
  add(auditCard,'small','','Auditoría de productos disponibles y pendientes en Calidad, por SKU.');
  if(audit.orders.completed!==chain.picking.completed)add(auditCard,'small','','⚠ Auditoría y traza operativa no coinciden.');
  for(const p of audit.bySku)add(auditCard,'small','','SKU '+p.id+' · inicial '+fmt(p.opening)+' + recibido '+fmt(p.received)+' − despachado '+fmt(p.shipped)+' − retenido Calidad '+fmt(p.held)+' − reserva '+fmt(p.reserved)+(skuSeparateTransport?' − staging '+fmt(p.staged):'')+' = disponible '+fmt(p.closing)+(p.balanced?' ✓':' ⚠'));
  add(auditCard,'small','','El valor CLP por SKU, día y ubicación está conciliado en el apartado desplegable de Inventario. Su cálculo proviene de los mismos movimientos físicos.');
  add(auditCard,'small','',skuSeparateTransport?'Pedidos: '+fmt(audit.orders.requested)+' solicitados = '+fmt(physicalAreas.metrics.unpickedOrders)+' sin preparar + '+fmt(physicalAreas.metrics.stagedOrders)+' en staging + '+fmt(audit.orders.completed)+' expedidos':'Pedidos: '+fmt(audit.orders.requested)+' solicitados = '+fmt(audit.orders.completed)+' completos + '+fmt(audit.orders.pending)+' pendientes');
  add(auditCard,'small','',audit.procurement.passed?'✓ Compras, proveedor, tránsito, recepción y stock reconciliados':'⚠ Descuadre entre compromisos y movimientos de inventario');
  add(auditCard,'small','',audit.assumptions);
  // Put cross-area explanation after the user selects recovery inputs.
  root.append(trace);
 }
 const events=plannedSkuRun??eventSimulation({policy:skuPolicy,orders:contract.plannedSampleOrders,delayDays:skuSupplierDelay?{A:8}:{},...skuAreaCapacity});
 const eventCard=add(root,'div','area-kpi-tile');
 add(eventCard,'strong','','Escenario base de 200 pedidos · operación cronológica');
 add(eventCard,'small','','La referencia usa la misma entrega de proveedor, liberación de Calidad y capacidades de las áreas; no corresponde a los pedidos adicionales del shock.');
 add(eventCard,'small','','En plazo (día 0): '+fmt(events.onTime)+' · entregados tarde: '+fmt(events.late)+' · pendientes al día '+events.days+': '+fmt(events.pending));
 add(eventCard,'small','','Demora media de pedidos tardíos: '+events.averageDelayDays.toFixed(1)+' días');
 for(const e of events.ledger.filter(x=>x.day===0||x.shipped>0||[2,5,10,12].includes(x.day)))add(eventCard,'small','','Día '+e.day+' · despachados hoy '+fmt(e.shipped)+' · acumulados '+fmt(e.completed)+' · pendientes '+fmt(e.backlog)+' · retenidos en Calidad '+fmt(e.waitingQuality));
 add(eventCard,'small','',events.assumptions);
 const supplementary=add(root,'details','sku-supplementary');
 add(supplementary,'summary','','Explorar modelos teóricos complementarios (sin capacidades físicas)');
 const timeline=deliveryTimeline({policy:skuPolicy,delayDays:skuSupplierDelay?{A:8}:{}});
 const timelineCard=add(supplementary,'div','area-kpi-tile');
 add(timelineCard,'strong','','Fechas teóricas de recepción sin restricciones de Calidad o capacidad');
 for(const snap of timeline.snapshots)add(timelineCard,'small','','Día '+snap.day+' · pedidos completos posibles '+fmt(snap.complete)+' / '+fmt(timeline.orders)+' · recibidos A '+fmt(snap.receipts.A)+', B '+fmt(snap.receipts.B)+', C '+fmt(snap.receipts.C));
 add(timelineCard,'small','',timeline.assumptions);
 const policy=inventoryPolicy({policy:skuPolicy});
 const policySummary=add(supplementary,'div','area-kpi-tile');
 add(policySummary,'strong','','Política '+policy.label+' · pedidos futuros de reposición');
 add(policySummary,'small','','Compra planificada CLP '+fmt(policy.orderValue)+' · cumplimiento con recepción futura hipotética '+policy.eventual.fulfillment.toFixed(1)+' % (base '+policy.baseline.fulfillment.toFixed(1)+' %)');
 add(policySummary,'small','','Costo mensual de mantener stock remanente, ilustrativo: CLP '+fmt(policy.eventual.holdingCost)+' · ventas brutas incrementales hipotéticas CLP '+fmt(policy.delta.revenue));
 for(const p of policy.perSku)add(policySummary,'small','','SKU '+p.id+' ('+p.rotation+'): objetivo '+p.targetDays+' días · compra '+fmt(p.ordered)+' unid. · plazo '+p.leadDays+' días · '+(p.reorder?'alerta punto de pedido':'sin alerta por punto de pedido'));
 add(policySummary,'small','',policy.assumptions);
 const report=skuOrderLab();
 const summary=add(supplementary,'div','area-kpi-tile');
 add(summary,'strong','','Pedidos completos: '+fmt(report.complete)+' / '+fmt(report.orders)+' · '+report.fulfillment.toFixed(1)+' %');
 add(summary,'small','','Pendientes '+fmt(report.pending)+' · bloqueo por stock '+fmt(report.blockedByStock)+' · por capacidad '+fmt(report.blockedByCapacity));
 for(const p of report.rows){
  const card=add(supplementary,'div','area-kpi-tile');
  add(card,'strong','',p.name);
  add(card,'small','','Pedidos '+fmt(p.requested)+' · completos '+fmt(p.complete)+' · pendientes '+fmt(p.unfulfilled));
 }
 const stock=add(supplementary,'div','area-kpi-tile');
 add(stock,'strong','','Stock por SKU al cierre del ejercicio piloto');
 for(const p of report.skuMetrics){
  add(stock,'strong','',p.name+' · rotación '+p.rotation+' · ABC por valor '+p.abc);
  add(stock,'small','','Demanda mensual simulada '+fmt(p.demand)+' unid. · stock '+fmt(p.onHand)+' · consumido '+fmt(p.consumed)+' · restante '+fmt(p.remaining));
  add(stock,'small','','Cobertura '+(p.daysCover===null?'N/D':p.daysCover.toFixed(1)+' días')+' · punto de pedido '+fmt(p.reorderPoint)+' unid. · plazo proveedor '+p.leadDays+' días + seguridad '+p.safetyDays+' días');
  add(stock,'small','',p.reorderSuggested?'🟠 Stock en o bajo punto de reposición':'🟢 Stock sobre punto de reposición');
 }
 add(supplementary,'p','muted','Asignación determinista por tipo de pedido en orden de mezcla. Los pedidos son completos o pendientes. Los bloqueos por SKU pueden coincidir; no se deben sumar. La demanda mensual es una hipótesis de análisis para calcular cobertura y reposición, no la duración de la campaña de un día. La clasificación ABC se calcula por valor demandado (unidades × costo ilustrativo) y puede diferir de la rotación física. Estos ejercicios de referencia son hipótesis aisladas; no usan las capacidades compartidas ni forman parte de la conciliación principal de la campaña SKU.');
}
function renderSkuRecoveryMission(contract=null){
 const root=$('skuRecoveryDecision');if(!revealed||currentSection!=='recovery'){root.replaceChildren();return}
 // Reuse the currently rendered contract; only standalone calls rebuild it.
 contract=contract??currentCampaignContract();
 const confirmed=activeSkuDecision(contract),input=skuContractInputs(contract);
 root.replaceChildren();
 if(confirmed){
  const success=add(root,'div','manager-po-confirmed');
  add(success,'strong','','✓ Decisión confirmada para esta cohorte SKU');
  add(success,'p','',confirmed.action==='extraordinary-purchase'?'Nueva orden de compra extraordinaria, separada de la orden original.':confirmed.action==='release-on-site-reserve'?'Se autorizó el traslado de stock ubicado en RESERVA-CD. No es una compra.':'Se ha decidido continuar sin compra extraordinaria.');
  add(success,'p','manager-confirmed-impact','Pedidos que salen del CD: '+fmt(confirmed.completedBefore)+' → '+fmt(confirmed.completedAfter)+' · siguen pendientes '+fmt(confirmed.pendingAfter)+'.');
  const commitDetails=add(success,'details','manager-po-detail');
  add(commitDetails,'summary','','Ver costos y cantidades confirmadas en el simulador');
  add(commitDetails,'p','','Compra prevista: CLP '+fmt(confirmed.urgentOrderCommitmentCLP)+' (sin pago real). Cantidad comprada: '+fmt(confirmed.orderedExtraUnits)+' productos; recibidos durante el ejercicio: '+fmt(confirmed.receivedExtraUnits)+'.');
  if(confirmed.action==='release-on-site-reserve'){
   add(success,'p','','Traslado interno de '+fmt(confirmed.releasedReserveUnits)+' unidades SKU desde el día '+(confirmed.firstReserveTransferDay??'no realizado')+'. Reserva pendiente al corte '+fmt(Object.values(confirmed.closingReserve).reduce((a,b)=>a+b,0))+'.');
   const moveDetail=add(success,'details','manager-po-detail');add(moveDetail,'summary','','Ver movimientos internos identificados por SKU');
   for(const mv of confirmed.reserveTransfers)add(moveDetail,'div','manager-po-line',mv.id+' · SKU '+mv.skuId+' · '+fmt(mv.qty)+' unidades · día '+mv.day+' · '+mv.from+' → '+mv.to);
  }
  if(confirmed.urgentPurchaseOrders.length){
   const details=add(success,'details','manager-po-detail');add(details,'summary','','Ver identificadores, cantidades, origen y plazos de la nueva orden');
   for(const po of confirmed.urgentPurchaseOrders){
    const item=add(details,'div','manager-po-line');
    add(item,'strong','',po.id+' · SKU '+po.skuId+' · '+fmt(po.quantity)+' unidades');
    add(item,'p','','Costo estándar CLP '+fmt(po.orderCommitmentCLP)+' · llegada supuesta día '+po.expectedArrivalDay+'. '+po.supplier);
   }
  }
  add(success,'p','manager-fineprint','Decisión guardada para esta campaña de práctica. La compra original no cambia. Para ensayar otra alternativa, inicia una nueva campaña.');
  const resultBtn=add(root,'button','btn manager-primary','Ver resultado y trazabilidad SKU →');
  resultBtn.type='button';resultBtn.onclick=()=>{showSection('dashboard');showResultView('inventory',true)};
  return;
 }
 if(skuDecisions.length)add(root,'p','manager-warning','Hay una decisión registrada para una configuración anterior. Se conserva como histórica, pero no se aplica a este escenario actualizado. Puedes confirmar una decisión nueva sin modificar la anterior.');
 const selected=['emergency','reserve'].includes(skuRecovery)?skuRecovery:'wait';
 const preview=skuSession.getComparison({contract,skuInputs:input,option:selected,urgentArrivalDay:skuUrgentArrival,purchaseCoveragePercent:skuPurchaseCoverage});
 const initial=preview.base.initial;
 const stockBox=add(root,'section','manager-inventory-review');
 add(stockBox,'h3','','1 · ¿Con qué contamos?');
 add(stockBox,'p','manager-stock-lead','Inventario físico inicial: '+fmt(Object.values(initial).reduce((n,x)=>n+x,0))+' SKU para una muestra de '+fmt(contract.actualSampleOrders)+' pedidos.');
 const stockDetail=add(stockBox,'details','manager-stock-details');
 add(stockDetail,'summary','','Ver existencias y ubicaciones por producto');
 add(stockDetail,'p','manager-fineprint','SKU significa tipo de producto. La reserva es parte del stock inicial, no inventario adicional.');
 const stockGrid=add(stockDetail,'div','manager-stock-grid');
 for(const p of SKU_CATALOG){
  const item=add(stockGrid,'div','manager-stock-item');
  add(item,'strong','','SKU '+p.id+' · '+fmt(initial[p.id])+' unidades');
  add(item,'small','',p.rotation+' rotación · costo estándar CLP '+fmt(p.unitCost));
  if(preview.reserveStock[p.id]>0)add(item,'small','',fmt(preview.reserveStock[p.id])+' en RESERVA-CD · '+fmt(initial[p.id]-preview.reserveStock[p.id])+' en PICK-FACE al inicio. Es el mismo inventario físico, no unidades extra.');
 }
 const original=add(stockBox,'p','manager-stock-commitment','Compra original comprometida: '+SKU_CATALOG.map(p=>'SKU '+p.id+' '+fmt(preview.originalPurchase[p.id])).join(' · ')+'. No cambia después de la sorpresa.');
 add(stockDetail,'p','manager-fineprint','Solo se preparan pedidos con productos verificados y liberados por Calidad. La reserva se utiliza después de trasladarla. Esta es una muestra de 12 días, distinta de la jornada agregada.');

 const decide=add(root,'section','manager-purchase-options');
 add(decide,'h3','','2 · ¿Qué harás como gerente?');
 add(decide,'p','','Prueba una opción. Aún no comprometes ninguna compra.');
 const cards=add(decide,'div','manager-option-grid');
 for(const [option,title,note] of [
  ['wait','Mantener compras originales','No cambiar el plan; esperar.'],
  ['emergency','Solicitar reposición extraordinaria','Comprar productos faltantes.'],
  ['reserve','Habilitar reserva ubicada en el CD','Usar productos guardados en el CD.']
 ]){
  const button=add(cards,'button','manager-option-btn'+(selected===option?' chosen':''));
  button.type='button';button.setAttribute('aria-pressed',String(selected===option));
  add(button,'strong','',title);add(button,'span','',note);
  button.onclick=()=>{skuRecovery=option;if(option==='reserve'&&skuReservePercent===0)skuReservePercent=20;save();render()};
 }
 add(decide,'p','manager-selected-meaning',selected==='emergency'?'Vas a evaluar una compra nueva. Los productos deben llegar y pasar por Calidad antes de usarlos.':selected==='reserve'?'Vas a trasladar productos que ya están en otra ubicación de este mismo centro. No es una compra.':'Mantienes el abastecimiento original. Los pedidos que falten seguirán pendientes.');
 if(selected==='reserve'){
  const reserveRow=add(decide,'div','manager-purchase-settings');
  add(reserveRow,'label','','¿Cuánto stock inicial está en la reserva del CD?');
  const reserveControl=add(reserveRow,'select','numeric-input');reserveControl.setAttribute('aria-label','Porcentaje del stock inicial ubicado en RESERVA-CD');
  for(const n of [0,10,20,30]){const op=add(reserveControl,'option','',n===0?'0 % · sin reserva interna':n+' % del stock en reserva');op.value=String(n)}
  reserveControl.value=String(skuReservePercent);reserveControl.onchange=()=>{skuReservePercent=Number(reserveControl.value);if(skuReservePercent===0&&skuRecovery==='reserve')skuRecovery='wait';save();render()};
 }
 if(selected==='emergency'||selected==='reserve'){
  const row=add(decide,'div','manager-purchase-settings');
  if(selected==='emergency'){
  const qty=add(row,'label','','¿Qué fracción del faltante físico comprar?');
  const coverage=add(row,'select','numeric-input');coverage.setAttribute('aria-label','Porcentaje de reposición extraordinaria en Recuperación');
  for(const n of [0,25,50,75,100]){const op=add(coverage,'option','',n+' % del faltante por SKU');op.value=String(n)}
  coverage.value=String(skuPurchaseCoverage);
  coverage.onchange=()=>{skuPurchaseCoverage=Number(coverage.value);save();render()};
  }
  const date=add(row,'label','',selected==='reserve'?'¿En qué día se habilitará físicamente la reserva?':'¿Qué día llegaría al muelle? (supuesto, no confirmación)');
  const arrival=add(row,'select','numeric-input');arrival.setAttribute('aria-label',selected==='reserve'?'Día de habilitación de la reserva ubicada':'Día previsto de compra extraordinaria en Recuperación');
  for(const d of [1,2,5,10,13]){const op=add(arrival,'option','',d===13?'Día 13 · fuera del horizonte':'Día '+d);op.value=String(d)}
  arrival.value=String(skuUrgentArrival);
  arrival.onchange=()=>{skuUrgentArrival=Number(arrival.value);save();render()};
 }
 const previewCard=add(root,'section','manager-purchase-preview');
 add(previewCard,'h3','','3 · ¿Qué cambia si eliges esto?');
 add(previewCard,'p','manager-preview-hint','Pedidos completos que podrían salir del CD en 12 días:');
 const numbers=add(previewCard,'div','manager-preview-stats');
 for(const [label,value,sub] of [
  ['Antes',preview.base.completed,''],
  ['Con tu opción',preview.recovered.completed,''],
  ['Recuperas',preview.recovered.completed-preview.base.completed,'']
 ]){
  const stat=add(numbers,'div','manager-preview-stat');add(stat,'span','',label);add(stat,'strong','',fmt(value));
 }
 add(previewCard,'p','manager-pending-summary','Quedarían '+fmt(preview.recovered.pending)+' pedidos pendientes de '+fmt(preview.recovered.orders)+'. La entrega al cliente todavía no está confirmada.');
 if(selected==='reserve'){
  const moves=preview.recovered.ledger.flatMap(x=>x.reserveEvents);
  const block=add(previewCard,'div','manager-purchase-lines');add(block,'strong','','Productos que moverías desde la reserva:');
  for(const p of SKU_CATALOG)add(block,'p','','SKU '+p.id+': '+fmt(preview.reserveStock[p.id])+' unidades'+(moves.some(x=>x.skuId===p.id)?' · día '+skuUrgentArrival:' · no salen aún'));
  add(previewCard,'p','','Se moverían '+fmt(moves.reduce((n,x)=>n+x.qty,0))+' productos. No se realiza una compra.');
  if(skuUrgentArrival>preview.recovered.days)add(previewCard,'p','manager-warning','⚠ El traslado llega fuera del horizonte: no recupera pedidos durante la campaña.');
 }
 if(preview.urgent.length){
  const items=add(previewCard,'div','manager-purchase-lines');
  add(items,'strong','','Nueva orden propuesta, separada del manifiesto inicial:');
  for(const po of preview.urgent)add(items,'p','','SKU '+po.id+' · '+fmt(po.qty)+' unidades · llegada teórica día '+po.day+' · valor CLP '+fmt(po.qty*po.unitCost));
  add(previewCard,'p','','Costo previsto de la compra: CLP '+fmt(preview.urgentBase+preview.urgentSurcharge)+' (sin pago real).');
  if(preview.urgentArrivalDay>preview.recovered.days)add(previewCard,'p','manager-warning','⚠ La nueva compra llega después del corte: genera compromiso, pero no recupera pedidos dentro de los 12 días.');
 }
 if(['emergency','reserve'].includes(selected)&&preview.recovered.completed<=preview.base.completed)add(previewCard,'p','manager-warning','⚠ Esta intervención no rescata pedidos en el horizonte actual. Revisa fecha, Recepción, Calidad, Picking y Transporte antes de comprometer recursos.');
 if(selected==='wait'){
  add(previewCard,'p','manager-warning',
   'Esperar no agrega compras, personal ni traslados: costo incremental CLP 0. '+
   fmt(preview.waitEvidence.totals.pendingAfterHorizon)+
   ' pedidos seguirán pendientes al terminar la campaña y no tienen fecha de salida prometida.');
 }
 const timeline=add(previewCard,'details','manager-po-detail');
 add(timeline,'summary','','¿Cuándo podrían salir los pedidos?');
 add(timeline,'p','manager-timeline-explain','Este calendario ayuda a ver cuándo avanza el trabajo y cuándo quedan pedidos esperando. No confirma su entrega al cliente.');
 const daily=add(timeline,'div','manager-shipment-timeline');
 const inactive=add(timeline,'details','manager-zero-days');
 add(inactive,'summary','','Ver también días sin despachos · detalle completo');
 const quiet=add(inactive,'div','manager-shipment-timeline');
 for(const day of preview.recovered.ledger){
  const parent=(day.shipped>0||day.reserveEvents.length>0)?daily:quiet;
  const entry=add(parent,'div','manager-shipment-day');
  add(entry,'strong','','Día '+day.day+' · '+fmt(day.shipped)+' pedidos expedidos');
  add(entry,'small','','Pendientes al terminar: '+fmt(day.backlog)+(day.reserveEvents.length?' · reserva movida: '+fmt(day.reserveEvents.reduce((n,x)=>n+x.qty,0))+' productos':''));
 }
 if(!daily.children.length)add(daily,'p','manager-fineprint','No se expiden pedidos en los días de esta campaña.');
 add(timeline,'p','manager-warning','Al final quedan '+fmt(preview.recovered.pending)+' pedidos sin fecha de entrega confirmada.');

 const confirmBtn=add(root,'button','btn manager-primary','Confirmar decisión en simulación →');
 confirmBtn.type='button';confirmBtn.id='confirmSkuDecision';
 confirmBtn.disabled=(selected==='emergency'&&!preview.urgent.length)||(selected==='reserve'&&skuReservePercent===0);
 confirmBtn.onclick=()=>{
  if(activeSkuDecision(contract))return;
  const extra=selected==='emergency'&&preview.recovered.completed<=preview.base.completed?' ATENCIÓN: esta compra tiene costo y no recupera pedidos dentro del período.':selected==='reserve'&&preview.recovered.completed<=preview.base.completed?' ATENCIÓN: este traslado no recupera pedidos dentro del período.':'';
  if(!confirm('¿Registrar esta decisión en la campaña SKU? La orden original no cambiará y la acción quedará confirmada en esta simulación.'+extra))return;
  const record=createSkuRecoveryDecision({campaignId,skuInputs:input,option:selected,urgentArrivalDay:skuUrgentArrival,purchaseCoveragePercent:skuPurchaseCoverage,comparisonResult:preview});
  skuDecisions=[...skuDecisions,record].slice(-25);
  skuRecovery=selected;save();render();
 };
 const limits=add(root,'details','manager-scope-detail');
 add(limits,'summary','','Qué supone este ejercicio · detalles técnicos');
 add(limits,'p','','La reserva es una ubicación de ejemplo, no un conteo real. Las compras no se envían a proveedores. Una compra comprometida no es un pago. El resultado es para pedidos de 12 días y no se suma al modelo agregado de una jornada.');
}

function renderAttention(){
 const root=$('attentionSummary'),costs=$('areaCostCards');root.replaceChildren();costs.replaceChildren();
 const report=attentionSignals(decisions,actions,effectiveScenario());
 for(const m of report.messages){
  const card=add(root,'div','attention-item '+m.level);
  add(card,'strong','',(m.level==='danger'?'🔴 ':m.level==='warning'?'🟠 ':'🟢 ')+m.title);
  if(m.level!=='good')card.children[0].textContent=(m.level==='danger'?'🔴 ':'🟠 ')+m.title;
  add(card,'p','',m.description);
 }
 for(const c of report.economics.result){
  const card=add(costs,'div','area-kpi-tile '+(c.over?'cost-over':''));
  add(card,'small','',c.title+' · '+(c.over?'🟠 Sobre referencia':'Dentro de referencia'));
  add(card,'strong','','CLP '+fmt(c.cost));
  add(card,'small','','Presupuesto flexible: CLP '+fmt(c.reference)+' · desv. gasto '+(c.delta>=0?'+':'')+fmt(c.delta));
  add(card,'small','','Efecto volumen vs. presupuesto estático: '+(c.volumeVariance>=0?'+':'')+fmt(c.volumeVariance)+' CLP');
 }
 add(root,'small','','Referencia flexible: dotación estándar más gastos variables ajustados al volumen efectivamente procesado. La diferencia contra la referencia fija se muestra como efecto volumen. Incluye dotación base y gastos variables asignables; excluye costos fijos compartidos y costo de mercancía para evitar asignaciones arbitrarias. Tolerancia configurable: '+scenario.areaCostTolerance+' %. Un gasto menor por bajo volumen no se considera ahorro de eficiencia.');
}
function render(){
$('sessionStatus').textContent='Campaña '+campaignId+' · '+({setup:'Configuración',operations:revealed?'Plan original':'Operación',preliminary:'Diagnóstico',recovery:'Recuperación',dashboard:'Resultados'}[currentSection]);
$('strategyCurrent').textContent='Estrategia: '+({service:'servicio',balanced:'equilibrio',cost:'eficiencia económica'}[strategy])+' · meta de cumplimiento '+scenario.targetFulfillment+' %';
// One aggregate read (as decision input), one frozen SKU contract for this UI render.
 // Economics and historical heuristics remain explicitly aggregate, not SKU facts.
const contract=currentCampaignContract(),r=contract.area,diag=diagnose(decisions,actions,effectiveScenario()),n=NODES[active],st=r.stages[active];setup();dashboard(r);renderKpiLesson(r);renderAttention();renderLabor();renderSkuLab(contract);renderSkuRecoveryMission(contract);
$('completed').textContent=fmt(r.dispatched);$('pending').textContent=fmt(r.pending);$('fulfillment').textContent=(r.dispatched/r.demand*100).toFixed(1).replace('.',',')+'%';
$('forecastNotice').textContent='Resultado simulado con los datos y decisiones actuales. No representa entregas confirmadas.';
$('progressText').textContent=NODES.filter(x=>decisions[x.id]).length+' de 8 áreas planificadas · '+(phase==='plan'?(revealed?'Plan cerrado · consulta':'Planificación'):'Recuperación');
$('progressFill').style.width=NODES.filter(x=>decisions[x.id]).length/8*100+'%';
const map=$('roadmap');map.replaceChildren();NODES.forEach((x,i)=>{const b=add(map,'button','node '+(i===active?'current':decisions[x.id]?'done':''));add(b,'span','node-icon',x.icon);const c=add(b,'span','node-content');add(c,'strong','',String(i+1).padStart(2,'0')+' · '+x.title);add(c,'small','',actions[x.id]?'Recuperación aplicada: '+actions[x.id]+' '+ACTIONS[x.id][1]:decisions[x.id]?'Planificado':'Pendiente');add(b,'span','node-state',i===active?'●':'→');b.setAttribute('aria-current',i===active?'step':'false');b.onclick=()=>nav(i)});
$('missionNumber').textContent=(phase==='plan'?(revealed?'PLAN ORIGINAL · SOLO LECTURA':'PLANIFICAR'):'RECUPERAR')+' · '+(active+1)+' / 8';$('missionTitle').textContent=n.icon+' '+n.title;$('missionDescription').textContent=n.desc;$('missionKpi').textContent='Área '+(active+1)+' de 8';
const choices=$('choices');choices.replaceChildren();const planFrozen=phase==='plan'&&revealed;
if(planFrozen)add(choices,'p','diagnosis-note','Decisiones originales cerradas tras conocer la demanda real. Puedes revisar todas las áreas sin modificar el plan ni sus compras. Los KPI muestran la demanda revelada y las recuperaciones que ya hayas aplicado. Para cambiar el plan, pulsa «Nueva campaña»; para intervenir, entra en Recuperación.');
if(phase==='plan'){add(choices,'h3','','Decisión inicial');n.choices.forEach(c=>{const b=add(choices,'button','choice '+((decisions[n.id]??DEFAULTS[n.id])===c.id?'selected':''));add(b,'strong','',c.label);add(b,'small','',c.note);b.setAttribute('aria-pressed',String((decisions[n.id]??DEFAULTS[n.id])===c.id));b.disabled=planFrozen;b.onclick=()=>{if(planFrozen)return;decisions[n.id]=c.id;decisions.values[n.id]=c[PARAMETERS[n.id].key];save();render()}});
const p=PARAMETERS[n.id],control=add(choices,'div','numeric-control');control.hidden=phase==='recover';add(control,'label','',p.label+' ('+p.unit.trim()+')');add(control,'p','muted',p.hint);const row=add(control,'div','numeric-row'),input=add(row,'input','numeric-input');input.type='number';input.setAttribute('aria-label',p.label+' ('+p.unit.trim()+')');input.min=p.min;input.max=p.max;input.step=p.step;input.value=numericValue(n.id,decisions);input.disabled=planFrozen;input.onchange=()=>{if(planFrozen)return;const v=+input.value;if(input.value===''||!Number.isFinite(v)||v<p.min||v>p.max){alert('Valor permitido: '+p.min+' a '+p.max);return}decisions[n.id]=decisions[n.id]??DEFAULTS[n.id];decisions.values[n.id]=v;save();render()};
}const box=add(choices,'div','flow-summary compact-flow');
 add(box,'strong','',phase==='plan'?'Resultado de tu elección':'Efecto de las decisiones');
 add(box,'p','','Llegan '+fmt(st.input)+' → siguen '+fmt(st.output)+' hacia la próxima área.');
 const delta=Math.max(0,st.input-st.output);
 add(box,'small','',delta?'Aquí se detienen '+fmt(delta)+' unidades equivalentes.':'Esta área no reduce el flujo que recibe.');
 const technical=add(box,'details','flow-technical');
 add(technical,'summary','','Ver capacidad y explicación');
 add(technical,'p','','Capacidad modelada: '+fmt(st.capacity)+' unidades. '+st.detail);
if(phase==='recover'&&['commercial','planning','purchasing'].includes(n.id)){
 add(choices,'h3','','Decisión de planificación cerrada');
 add(choices,'p','muted','El pronóstico, la compra y la entrega comprometida ya ocurrieron antes de revelar la demanda. No puedes reescribirlos retroactivamente. Evalúa intervenciones físicas posteriores o reinicia el ejercicio para probar otro plan.');
}
if(phase==='recover'&&!['commercial','planning','purchasing'].includes(n.id)){
 const cfg=ACTIONS[n.id],selected=actions[n.id]||0;
 const before=flow(decisions,actions,effectiveScenario()),baseCost=finance(before,effectiveScenario()).total;
 add(choices,'h3','','Decide si intervenir');
 add(choices,'p','muted','Todas las medidas son opcionales. Puedes mantener la situación o ajustar cuánto esfuerzo aplicar.');
 const opts=[
 ['Mantener como está',0,'Sin recursos adicionales. Conserva los indicadores actuales.'],
 ['Mejora puntual',Math.round(cfg[2]*.25/cfg[3])*cfg[3],'Recuperación acotada.'],
 ['Mejora equilibrada',Math.round(cfg[2]*.6/cfg[3])*cfg[3],'Refuerzo intermedio.'],
 ['Intervención intensiva',cfg[2],'Mayor esfuerzo disponible; puede tener costo sin beneficio global.']
 ];
 for(const [title,value,description] of opts){
 const trial=flow(decisions,{...actions,[n.id]:value},effectiveScenario());
 const difference=trial.dispatched-before.dispatched;
 const extraCost=finance(trial,effectiveScenario()).total-baseCost;
 const button=add(choices,'button','choice recovery-option '+(selected===value?'selected':''));
 add(button,'strong','',title+' · '+value+' '+cfg[1]);
 add(button,'small','',description);
 add(button,'small','','Cambio vs. ahora: '+(difference>=0?'+':'')+fmt(difference)+' unidades expedibles · costo '+(extraCost>=0?'+':'')+fmt(extraCost)+' CLP.');
 button.setAttribute('aria-pressed',String(selected===value));
 button.onclick=()=>{actions[n.id]=value;save();render()};
 }
 const control=add(choices,'div','numeric-control');
 add(control,'label','','O define una cantidad propia ('+cfg[1]+')');
 const num=add(control,'input','numeric-input');num.type='number';num.setAttribute('aria-label','Cantidad de recuperación para '+n.title+' ('+cfg[1]+')');num.min=0;num.max=cfg[2];num.step=cfg[3];num.value=selected;
 num.onchange=()=>{const v=Number(num.value);if(num.value===''||!Number.isFinite(v)||v<0||v>cfg[2]){num.value=selected;return}actions[n.id]=v;save();render()};
 const noAction=flow(decisions,{...actions,[n.id]:0},effectiveScenario());
 const contribution=before.dispatched-noAction.dispatched;
 add(control,'p','muted',selected===0?'Sin intervención: la operación mantiene sus restricciones actuales.':contribution>0?'La intervención seleccionada aporta '+fmt(contribution)+' unidades expedibles con las demás decisiones actuales.':'Esta medida todavía no aumenta la expedición global; puede haber otra restricción que debas resolver.');
}
$('nodeResult').textContent='Antes de esta área: '+fmt(st.input)+' · después: '+fmt(st.output)+' · capacidad máxima: '+fmt(st.capacity)+'. '+(st.input<st.capacity?'Puede haber capacidad sin uso porque llegaron menos productos.':st.output<st.input?'Aquí parte del flujo se detiene antes de la siguiente área.':'Aquí no se pierden unidades del flujo recibido.');
$('prev').disabled=active===0;$('next').textContent=active===7?(phase==='plan'?'Ver diagnóstico preliminar →':'Ver resultado final →'):'Siguiente área →';
const list=$('results');list.replaceChildren();
r.stages.forEach((stage,i)=>{
 const area=NODES[i],lost=Math.max(0,stage.input-stage.output);
 const card=add(list,'div','flow-step');
 const summary=add(card,'div','flow-step-summary');
 add(summary,'span','flow-step-index',String(i+1).padStart(2,'0'));
 const label=add(summary,'span','flow-step-title');
 add(label,'strong','',area.icon+' '+area.title);
 add(label,'small','',lost>0?'Reduce '+fmt(lost)+' unidades en esta etapa':'Sin pérdida de entrada');
 add(summary,'span','flow-step-value',fmt(stage.output)+' unid.');
 const body=add(card,'div','flow-step-detail');
 const stats=add(body,'div','flow-step-stats');
 for(const [name,amount] of [['Entrada',stage.input],['Salida',stage.output],['Capacidad',stage.capacity]]){const cell=add(stats,'div','');add(cell,'small','',name);add(cell,'strong','',fmt(amount))}
 add(body,'p','muted',stage.detail);if(stage.id==='picking')add(body,'p','muted','Productividad observada: '+(scenario.pickingOperators?(stage.output/scenario.pickingOperators).toFixed(1)+' unidades por operario':'N/D')+'. Utilización: '+(stage.capacity?(stage.output/stage.capacity*100).toFixed(1)+'%':'N/D')+'.');if(stage.id==='receiving')add(body,'p','muted','Productividad observada: '+(scenario.receivingOperators?(stage.output/scenario.receivingOperators).toFixed(1)+' unidades por operario':'N/D')+'.');
 add(body,'p','muted',i===5?'Inventario combina stock inicial, unidades liberadas y reservas elegibles.':i>0?'La entrada depende de lo entregado por el área anterior.':'Comercial establece el pronóstico para la planificación.');
 if(stage.input>0&&i>2&&i!==5){const bar=add(body,'div','flow-bar'),fill=add(bar,'div','flow-bar-fill');fill.style.width=Math.min(100,stage.output/stage.input*100)+'%'}
});
$('sku').replaceChildren();
for(const [label,value] of [['Demanda real',r.demand],['Stock inicial',r.stock],['Compra solicitada',r.ordered],['Entrega proveedor',r.delivered],['Recepción',r.received],['Liberación Calidad',r.released],['Stock disponible',r.available],['Preparado',r.picked],['Expedido',r.dispatched]]){
 const item=add($('sku'),'div','stage-result');add(item,'span','',label);add(item,'strong','',fmt(value)+' unid.');
}
$('cause').textContent='Transporte recibe '+fmt(r.picked)+' unidades desde Picking y despacha '+fmt(r.dispatched)+'. Su capacidad es '+fmt(r.stages[7].capacity)+'. '+(r.picked<r.stages[7].capacity?'Capacidad ociosa por falta de flujo o demanda aguas arriba.':'El despacho está limitado por capacidad o disponibilidad.');
renderDiagnosis(r);const causes=$('rootCauses');causes.replaceChildren();
const causal=causalAudit(decisions,actions,effectiveScenario()),causalSummary=$('causalSummary');causalSummary.replaceChildren();
add(causalSummary,'strong','','Diagnóstico de restricciones y efecto económico');
add(causalSummary,'p','',causal.summary);
add(causalSummary,'small','','Se prueba cada medida por separado con las demás decisiones constantes. Una restricción simultánea puede ocultar mejoras que solo funcionan en conjunto.');
const initial=flow(decisions,{},effectiveScenario());
const explanations={commercial:'El pronóstico afecta la necesidad calculada para reponer.',planning:'La cobertura determina cuánto se compra para cerrar la brecha.',purchasing:'El cumplimiento del proveedor condiciona la llegada de unidades.',receiving:'La productividad de recepción depende de dotación y entregas recibidas.',quality:'La tasa de liberación define cuánto inventario queda autorizado.',inventory:'La disponibilidad combina stock inicial, calidad y reserva.',picking:'La productividad puede estar limitada por el abastecimiento anterior.',transport:'El cumplimiento de expedición depende del preparado y de la capacidad de salida.'};
for(const f of diag.findings){
 const counter=causal.evidence.find(x=>x.id===f.id);
 const item=add(causes,'div','diagnosis-card'),before=initial.stages.find(x=>x.id===f.id),after=f.stage;
 add(item,'strong','',f.icon+' '+f.title);
 add(item,'p','',explanations[f.id]);
 const utilization=after.capacity?((after.output/after.capacity)*100).toFixed(1)+'%':'N/D';
 add(item,'p','muted','Salida inicial '+fmt(before.output)+' → salida final '+fmt(after.output)+' unidades. Utilización final '+utilization+'. Recuperación aplicada: '+fmt(actions[f.id]||0)+' '+ACTIONS[f.id][1]+'.');
 if(f.inherited&&['receiving','picking','transport'].includes(f.id))add(item,'p','diagnosis-note','Existe capacidad sin utilizar. Puede ser por flujo insuficiente aguas arriba; verifica las etapas anteriores antes de invertir.');
 add(item,'p','kpi-strategy','Prueba de intervención aislada: '+(counter.delta>0?'+':'')+fmt(counter.delta)+' unidades expedibles · cambio en resultado '+(counter.net>=0?'+':'')+fmt(counter.net)+' CLP.');
 add(item,'p','muted',counter.warning);
 const decisionRow=add(item,'div','improvement-decision');
 const preview=add(decisionRow,'div','improvement-preview');
 add(preview,'strong','',f.potential>0?'Oportunidad estimada: +'+fmt(f.potential)+' unidades':'Sin mejora aislada de expedición');
 add(preview,'small','',f.potential>0?'La intervención depende de las restricciones de las otras áreas.':'Revisa las áreas aguas arriba antes de aumentar recursos.');
 const actionButton=add(decisionRow,'button','btn secondary',actions[f.id]?'Revisar intervención →':'Explorar intervención →');
 actionButton.type='button';actionButton.setAttribute('aria-label','Explorar mejora de '+f.title);
 actionButton.onclick=()=>{phase='recover';showSection('recovery');nav(NODES.findIndex(n=>n.id===f.id));$('mission').scrollIntoView({behavior:'smooth',block:'start'})};

 if(f.potential>0){
 const projected=flow(decisions,{...actions,[f.id]:ACTIONS[f.id][2]},effectiveScenario());
 const costChange=finance(projected,effectiveScenario()).total-finance(r,effectiveScenario()).total;
 const localGap=Math.max(0,after.input-after.output);
 add(item,'p','diagnosis-note','Si mantienes la decisión actual en '+f.title+', esta etapa seguirá procesando '+fmt(after.output)+' de '+fmt(after.input)+' unidades de entrada'+(localGap?' (brecha de '+fmt(localGap)+').':'.')+' La campaña conservaría '+fmt(r.pending)+' unidades pendientes. Una medida adicional podría aumentar la expedición global en '+fmt(f.potential)+' unidades, con una variación de costo modelada de '+fmt(costChange)+' CLP. Compara ese costo con el beneficio antes de intervenir.');
}
 else if(!actions[f.id]){add(item,'p','muted','Mantener esta área no reduce por sí solo el despacho actual. Reforzarla aisladamente tampoco mejoraría el cumplimiento mientras exista otra restricción.');}
}
const opts=$('actions');opts.replaceChildren();diag.findings.forEach(f=>{const item=add(opts,'div','action'),body=add(item,'div','');add(body,'strong','',f.title+' · '+ACTIONS[f.id][0]);add(body,'small','','Elegido: '+(actions[f.id]||0)+' / '+ACTIONS[f.id][2]+' '+ACTIONS[f.id][1]+' · Mejora potencial adicional: +'+fmt(f.potential));const b=add(item,'button','mini','Configurar');b.onclick=()=>{phase='recover';showSection('recovery');nav(NODES.findIndex(n=>n.id===f.id))}});
$('riskCount').textContent=String(diag.findings.filter(f=>f.stage.output<f.stage.input).length);$('focus').textContent=causal.focus?causal.focus.title+' · +'+fmt(causal.focus.delta)+' unid.':'Sin mejora individual';$('report').hidden=false;
}
$('prev').onclick=()=>nav(Math.max(0,active-1));
$('next').onclick=()=>{if(!revealed&&!decisions[NODES[active].id])decisions[NODES[active].id]=DEFAULTS[NODES[active].id];if(active<7)active++;else if(phase==='plan'){active=0;showSection('preliminary')}else{render();showSection('dashboard');$('report').scrollIntoView({behavior:'smooth',block:'start'});return}save();render();$('mission').scrollIntoView({behavior:'smooth',block:'start'})};
function restartCampaign(){if(!confirm('¿Iniciar una campaña nueva desde cero? Se perderán las decisiones y resultados actuales guardados en este navegador.'))return;skuSession.clear();currentSkuAreaModel=null;currentSkuProjection=null;campaignId=createCampaignId();decisions={...START,values:{}};actions={};active=0;phase='plan';revealed=false;shockDirection=null;scenario={...DEFAULT_SCENARIO};strategy='balanced';skuPolicy='balanced';skuSupplierDelay=false;skuSeparateTransport=false;skuRecovery='wait';skuUrgentArrival=1;skuPurchaseCoverage=100;skuReservePercent=0;skuDecisions=[];save();showSection('operations');if(typeof window!=='undefined')window.scrollTo?.({top:0,behavior:'smooth'})}
$('reset').onclick=restartCampaign;
$('restartFinal').onclick=restartCampaign;
$('resetAnytime').onclick=restartCampaign;
$('goToOperations').onclick=()=>{showSection('operations');$('operationsSection').scrollIntoView({behavior:'smooth',block:'start'})};
$('openReport').onclick=()=>{save();showSection('preliminary');$('preliminarySection').scrollIntoView({behavior:'smooth',block:'start'})};
$('export').onclick=()=>{
 // Export ONLY the educational one-shift flow. Do not silently label these
 // equivalent units as actual SKU order shipments or physical stock.
 const flowResult=flow(decisions,actions,effectiveScenario());
 const csv=aggregateFlowCsv({stages:flowResult.stages,areaNames:flowResult.stages.map(stage=>NODES.find(n=>n.id===stage.id).title),actions});
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='supply-chain-jornada-agregada.csv';
 document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
};
$('setupTab').onclick=()=>showSection('setup');
$('operationsTab').onclick=()=>showSection('operations');
$('preliminaryTab').onclick=()=>showSection('preliminary');
$('revealDemand').onclick=()=>{revealSurprise();showSection('preliminary');$('directorBriefing').scrollIntoView({behavior:'smooth',block:'start'})};
$('startRecovery').onclick=()=>{const signal=managerDiagnosis({decisions,scenario:effectiveScenario(),revealed});active=NODES.findIndex(n=>n.id===signal.area);if(active<0)active=5;showSection('recovery')};
$('directorPilot').onclick=()=>{skuRecovery='emergency';showSection('recovery');$('skuRecoveryMission').scrollIntoView({behavior:'smooth',block:'start'})};
$('skipRecovery').onclick=()=>{actions={};phase='recover';save();showSection('dashboard')};
$('recoveryTab').onclick=()=>showSection('recovery');
$('dashboardTab').onclick=()=>showSection('dashboard');
for(const button of $('resultTabs').children)button.onclick=()=>showResultView(button.getAttribute('data-result-target'),true);
$('primaryToAreas').onclick=()=>showResultView('areas',true);
for(const [id,view] of [['overviewToAreas','areas'],['areasToInventory','inventory'],['inventoryToEconomics','economics'],['economicsToImprovement','improvement']])$(id).onclick=()=>showResultView(view,true);
$('improvementToRecovery').onclick=()=>{showSection('recovery');$('recoverySection').scrollIntoView({behavior:'smooth',block:'start'})};
$('beginExercise').onclick=()=>showSection('operations');
$('resetScenario').onclick=()=>{skuSession.clear();currentSkuAreaModel=null;currentSkuProjection=null;scenario={...DEFAULT_SCENARIO};revealed=false;shockDirection=null;actions={};phase='plan';save();render();showSection('operations')};
load();showSection(currentSection);
