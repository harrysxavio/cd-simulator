// Misión CD · MVP alfa: one focused mobile scene at a time.
// Existing src/i2-mvp-adapter.js owns the physical model; this file is UI only.
import {NODES} from '../src/engine.js';
import {I2_AREAS,I2_RECOVERIES} from '../src/i2-product-contract.js';
import {i2MvpPhysicalResult,I2_MVP_CASE} from '../src/i2-mvp-adapter.js';
import {newI2GameState,loadI2GameState,saveI2GameState} from '../src/i2-game-state.js';
import {i2SafeScorecard} from '../src/i2-result-boundary.js';
import {navigateI2GameState,i2FooterLabels} from '../src/i2-game-navigation.js';
import {openI2HelpDialog} from './help-dialog.js';
import {i2ProgressView} from '../src/i2-game-progress.js';
import {i2GuideHint,readI2GuidePreference,saveI2GuidePreference} from '../src/i2-game-guide.js';
import {i2FirstMissionBriefing} from '../src/i2-first-mission-briefing.js';
const root=document.querySelector('#gameScene');
const primary=document.querySelector('#gameNext');
const secondary=document.querySelector('#gameBack');
const progress=document.querySelector('#gameProgress');
const progressTrack=document.querySelector('#gameProgressTrack');
const chapter=document.querySelector('#gameChapter');
const mapOpen=document.querySelector('#gameMapOpen');
const stage=document.querySelector('#gameStage');
const reset=document.querySelector('#gameRestart');
const fail=document.querySelector('#gameError');
const money=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
const num=new Intl.NumberFormat('es-CL');
const init=newI2GameState;
let state;
try{state=loadI2GameState(window.localStorage)}catch{state=init()}
let preview=null;
let showGuide=false;
try{showGuide=readI2GuidePreference(window.localStorage)}catch{}

/** Separate versioned game storage. Never write V1 or the physical event ledger. */
function persist(){
 try{
  state=saveI2GameState(window.localStorage,state);
 }catch{
  fail.textContent='No se pudo guardar localmente. Puedes continuar, pero la partida puede perderse al recargar.';
 }
}
function node(tag,{className='',text='',attrs={}}={},children=[]){
 const e=document.createElement(tag);
 if(className)e.className=className;
 if(text!==undefined)e.textContent=text;
 for(const [name,value] of Object.entries(attrs))e.setAttribute(name,String(value));
 for(const child of children)e.append(child);
 return e;
}
const p=(text,className='')=>node('p',{text,className});
const heading=(text)=>node('h1',{text,attrs:{tabindex:'-1',id:'step-title'}});
const section=(className='',children=[])=>node('section',{className},children);
function button(label,handler,{selected=false,description=''}={}){
 const b=node('button',{className:'game-choice',attrs:{type:'button','aria-pressed':selected}},[
  node('strong',{text:label}),...(description?[p(description,'choice-note')]:[])
 ]);
 b.addEventListener('click',handler);
 if(selected)b.classList.add('chosen');
 return b;
}
function setActions({next='Continuar',onNext=null,back='',onBack=null}={}){
 primary.textContent=next;primary.disabled=!onNext;primary.hidden=!onNext;
 primary.onclick=onNext;
 secondary.textContent=back;secondary.hidden=!onBack;secondary.onclick=onBack;
}
function guideElement(){
 const advice=i2GuideHint(state);
 const wrapper=node('section',{className:'mentor-area',attrs:{id:'gameGuide'}});
 const toggle=node('button',{
  className:'mentor-toggle',
  text:showGuide?'Ocultar consejo de '+advice.name:'Ver consejo de '+advice.name,
  attrs:{type:'button','aria-expanded':String(showGuide),'aria-controls':'gameGuideText'}
 });
 const adviceText=p(advice.name+' · '+advice.text,'mentor-copy');
 adviceText.id='gameGuideText';
 adviceText.hidden=!showGuide;
 toggle.addEventListener('click',()=>{
  showGuide=!showGuide;
  try{saveI2GuidePreference(window.localStorage,showGuide)}catch{
   fail.textContent='No fue posible guardar tu preferencia de guía; se mantendrá en esta visita.';
  }
  wrapper.replaceWith(guideElement());
  root.querySelector('.mentor-toggle')?.focus({preventScroll:true});
 });
 wrapper.append(toggle,adviceText);
 return wrapper;
}
function replace(children){
 root.replaceChildren(...children);
 root.scrollTop=0;
 const title=root.querySelector('#step-title');
 if(title){
  title.after(guideElement());
  title.focus({preventScroll:true});
 }
}
function saveAndRender(){persist();render();}
function gameTransition(action){
 try{
  state=navigateI2GameState(state,action);
  preview=null;
  saveAndRender();
 }catch(e){showError(e)}
}
/** Single canonical footer contract for all six scene states. */
function updateFooter({beforeAdvance=null}={}){
 const labels=i2FooterLabels(state);
 setActions({
  next:labels.primary,
  onNext:()=>{
   if(beforeAdvance){
    try{beforeAdvance()}catch(e){showError(e);return}
   }
   gameTransition(labels.action);
  },
  back:labels.secondary??'',
  onBack:labels.back?()=>gameTransition(labels.back):null
 });
}
function choiceList(area){
 const locked=state.confirmedAreas.includes(area.id);
 const cards=area.choices.map(c=>{
  const option=button(c.label,()=>{
   if(locked)return;
   state.choices[area.id]=c.optionId;saveAndRender();
  },{selected:state.choices[area.id]===c.optionId,description:c.description});
  option.disabled=locked;
  return option;
 });
 const list=section('choice-list',cards);
 if(locked)list.append(p('Decisión confirmada. Puedes consultarla, pero para cambiarla debes reiniciar la campaña.','note'));
 return list;
}
function intro(){
 const brief=i2FirstMissionBriefing(state);
 stage.textContent='Misión 01 · Tu primer turno';
 replace([
  p('MISIÓN 01 · PRIMER DÍA AL MANDO','eyebrow'),
  heading(brief.title),
  p(brief.meaning,'intro-meaning'),
  p(brief.objective,'lead'),
  section('intro-facts',brief.quickFacts.map(fact=>
   section('intro-fact',[
    node('strong',{text:fact.value}),
    node('span',{text:fact.label})
   ])
  )),
  ...(brief.continuing?[
   p('PARTIDA EN CURSO','intro-resume-title'),
   p(brief.resumeLabel+'. Puedes continuar sin perder lo que ya decidiste.','intro-resume')
  ]:[]),
  section('briefing-steps',[
   node('strong',{text:'Tu desafío en 3 pasos'}),
   ...brief.steps.map((step,index)=>section('briefing-step',[
    node('span',{className:'briefing-number',text:String(index+1)}),
    p(step)
   ]))
  ]),
  p('Partimos con '+num.format(brief.plannedOrders)+' pedidos previstos en una muestra. La demanda real sigue oculta.','note'),
  p(brief.warning,'footnote')
 ]);
 updateFooter();
}
function areaScene(){
 const area=I2_AREAS[state.index],original=NODES[state.index];
 stage.textContent='Planificación · Área '+(state.index+1)+' de 8';
 progress.style.width=(100*(state.index+1)/10)+'%';
 const helpButton=(label,title,paragraphs)=>{
  const button=node('button',{
   className:'learn-more help-trigger',
   text:label,
   attrs:{type:'button','aria-haspopup':'dialog'}
  });
  button.addEventListener('click',()=>openI2HelpDialog({title,paragraphs},button));
  return button;
 };
 const lesson=helpButton('¿Qué significa esta área y su KPI?',
  original.title+' · Qué mide',[
   original.desc,
   'KPI a observar: '+original.kpi+'.',
   'Antes de revelar la demanda no mostramos resultados físicos futuros.'
  ]);
 const consequence=helpButton('¿Qué podría cambiar con mi decisión?',
  original.title+' · Impacto posible',[
   'Tu elección modifica los parámetros canónicos del simulador y puede afectar otras áreas.',
   'No garantiza que se expidan más pedidos.',
   'El efecto físico real solo se calcula y presenta después de revelar la demanda.'
  ]);
 replace([
  p('DECISIÓN '+(state.index+1)+' DE 8','eyebrow'),
  heading(original.icon+' '+original.title),
  p(area.question,'lead'),
  section('mini-kpi',[
   node('span',{text:'KPI que aprenderás'}),
   node('strong',{text:original.kpi}),
   node('small',{text:'Resultado oculto hasta conocer la demanda real'})
  ]),
  p('Selecciona una alternativa','option-heading'),
  choiceList(area),lesson,consequence
 ]);
 updateFooter();
}
function revealScene(){
 stage.textContent='Diagnóstico · Sorpresa';progress.style.width='84%';
 replace([
  p('EL PLAN QUEDÓ CERRADO','eyebrow'),
  heading('Algo cambió mientras el CD se preparaba.'),
  p('Tus decisiones comerciales, compras y capacidades ya están definidas. La demanda observada podría ser diferente del pronóstico.','lead'),
  section('guide-box',[
   node('strong',{text:'Mensaje del equipo'}),
   p('Gerencia, llegó el momento de comparar la planificación con lo que realmente ocurrió. Las órdenes de compra iniciales no pueden reescribirse retroactivamente.')
  ]),
  p('La sorpresa se revela solo cuando tú lo decides.','note')
 ]);
 updateFooter();
}
function resultFor(option){
 return i2MvpPhysicalResult({
  choices:state.choices,option:option??state.recovery,
  urgentArrivalDay:state.arrivalDay,purchaseCoveragePercent:state.coverage
 });
}
function labeledSelect(label,values,current,onChange){
 const id='select-'+label.replace(/[^a-z]/gi,'').toLowerCase();
 const wrap=section('select-group');
 const lab=node('label',{text:label,attrs:{for:id}});
 const select=node('select',{attrs:{id}});
 for(const value of values)select.append(node('option',{text:String(value),attrs:{value,selected:value===current?'selected':'false'}}));
 // Do not leave bogus selected="false" attributes (presence means selected).
 for(const option of select.options)option.selected=Number(option.value)===current;
 select.addEventListener('change',()=>onChange(Number(select.value)));
 wrap.append(lab,select);return wrap;
}
function recoveryScene(){
 if(!state.reveal){state.phase='reveal';render();return}
 stage.textContent='Crisis · Recuperación';progress.style.width='92%';
 replace([
  p('DEMANDA SORPRESA · CASO FIJO','eyebrow'),
  heading('¡La demanda aumentó un 40 %!'),
  p('Se planificó una muestra de '+num.format(I2_MVP_CASE.plannedOrders)+' pedidos, pero el ejercicio físico tiene '+num.format(280)+'. El plan original quedó congelado. Ahora debes elegir cómo responder.','lead'),
  section('guide-box',[node('strong',{text:'Tu guía'}),p('Elige una intervención. Puedes consultar el impacto estimado antes de confirmar. Algunas decisiones cuestan dinero y aun así podrían no recuperar pedidos.')]),
  p('Tu acción gerencial','option-heading'),
  section('choice-list',I2_RECOVERIES.map(c=>button(c.label,()=>{
   state.recovery=c.optionId;preview=null;saveAndRender();
  },{selected:state.recovery===c.optionId}))),
  labeledSelect('Día de llegada o traslado', [1,2,5,10,13],state.arrivalDay,x=>{state.arrivalDay=x;preview=null;saveAndRender()}),
  labeledSelect('Cobertura de compra extraordinaria (%)',[0,25,50,75,100],state.coverage,x=>{state.coverage=x;preview=null;saveAndRender()}),
  section('impact-wrap',[
   node('button',{className:'impact-btn',text:'Consultar impacto potencial',attrs:{type:'button'}})
  ])
 ]);
 const impact=root.querySelector('.impact-btn');
 impact.addEventListener('click',()=>{
  try{
   preview=resultFor();
   const safe=i2SafeScorecard(preview);
   const box=section('impact-result',[
    node('strong',{text:'Resultado estimado, no confirmado'}),
    p('Pedidos expedidos: '+num.format(safe.shippedOrders.value)+' / '+num.format(safe.actualOrders.value)),
    p('Mejora frente a no intervenir: '+num.format(safe.recoveredOrders.value)+' pedidos.'),
    p('Gasto incremental modelado: '+money.format(safe.incrementalExpense.value)+'.','note'),
    p('Costo total: desconocido. Expedición desde el CD no significa entrega al cliente.','footnote')
   ]);
   root.querySelector('.impact-wrap').append(box);
   impact.disabled=true;
  }catch(e){showError(e)}
 });
 updateFooter({beforeAdvance:()=>i2SafeScorecard(resultFor())});
}
/** After revealing, the manager can review decisions without revising the sealed plan. */
function reviewScene(){
 if(!state.reveal||state.confirmedAreas.length!==I2_AREAS.length){
  showError(new Error('No hay un plan confirmado para revisar'));
  return;
 }
 stage.textContent='Crisis · Plan confirmado';progress.style.width='92%';
 const chosen=I2_AREAS.map(area=>{
  const decision=area.choices.find(choice=>choice.optionId===state.choices[area.id]);
  return section('area-detail',[
   node('strong',{text:area.title}),
   p(decision?.label??'Decisión no disponible','note')
  ]);
 });
 replace([
  p('PLAN ORIGINAL · SOLO LECTURA','eyebrow'),
  heading('Estas fueron tus ocho decisiones.'),
  p('La demanda real ya fue revelada. Puedes revisar el plan, pero no modificarlo ni cambiar las compras originales retroactivamente.','lead'),
  section('guide-box',[node('strong',{text:'Resumen de planificación'}),...chosen]),
  p('Volverás a la misma estrategia de recuperación con los valores que habías seleccionado.','footnote')
 ]);
 updateFooter();
}
function resultsScene(){
 if(!state.reveal){state.phase='reveal';render();return}
 stage.textContent='Resultado · Aprendizaje';progress.style.width='100%';
 let data,score;
 try{data=resultFor();score=i2SafeScorecard(data)}catch(e){showError(e);return}
 const overview=section('metrics-grid',[
  section('metric-card',[node('span',{text:'Expedidos del CD'}),node('strong',{text:num.format(score.shippedOrders.value)})]),
  section('metric-card',[node('span',{text:'Pendientes'}),node('strong',{text:num.format(score.pendingOrders.value)})])
 ]);
 const detail=node('details',{className:'learn-more'},[
  node('summary',{text:'Consultar indicadores y áreas'}),
  p('Antes de tu recuperación se expidieron '+num.format(score.baselineShipped.value)+' pedidos; la intervención cambió ese resultado en '+num.format(score.recoveredOrders.value)+'.'),
  p('Gasto incremental modelado: '+money.format(score.incrementalExpense.value)+'. El costo operacional total es desconocido.'),
  p('Compromiso de compras originales: '+money.format(score.committedOriginalPurchases.value)+' (no equivale a pago ni se suma otra vez al costo).','note'),
  p('Variación del proxy económico: '+money.format(score.economicProxyDelta.value)+' (no representa utilidad ni EBITDA).','note'),
  ...data.areaRows.map(a=>section('area-detail',[
   node('strong',{text:a.title}),p(a.headline,'note')
  ]))
 ]);
 replace([
  p('CIERRE DE CAMPAÑA · DÍA 12','eyebrow'),
  heading('Estas fueron las consecuencias de tus decisiones.'),
  p('Demanda real: '+num.format(score.actualOrders.value)+' pedidos completos. Resultados procedentes del mismo motor físico SKU de V1.','lead'),
  overview,
  section('guide-box',[
   node('strong',{text:'Lección para gerencia'}),
   p(score.recoveredOrders.value>0?'La intervención recuperó pedidos frente a mantener el escenario sin actuar. Revisa también su costo.':'Esta decisión no recuperó pedidos adicionales antes del corte. A veces el plazo, el stock o varias restricciones simultáneas limitan la acción.'),
   p('Preparado no significa expedido. Salir del CD tampoco acredita entrega al cliente.'),
   p('El costo total, utilidad neta y EBITDA son desconocidos: sin datos contables completos, no son $0.','note')
  ]),
  detail,
  p('Simulación educativa, no operación real ni contabilidad completa.','footnote')
 ]);
 updateFooter();
}
function showError(e){
 console.error('Misión CD:',e);
 fail.textContent='No se pudo conciliar el resultado físico: '+(e?.message||'error desconocido');
}
function paintProgress(){
 const view=i2ProgressView(state);
 chapter.textContent=view.chapterLabel;
 progress.style.width=view.percent+'%';
 progressTrack.setAttribute('aria-valuenow',String(view.percent));
 progressTrack.setAttribute('aria-valuetext',view.chapterLabel+'; '+view.current+
  '; '+view.confirmed+' de '+view.totalAreas+' decisiones confirmadas');
}
function render(){
 fail.textContent='';
 reset.hidden=state.phase==='intro';
 if(state.phase==='intro')intro();
 else if(state.phase==='area')areaScene();
 else if(state.phase==='reveal')revealScene();
 else if(state.phase==='recover')recoveryScene();
 else if(state.phase==='review')reviewScene();
 else if(state.phase==='result')resultsScene();
 paintProgress();
}
mapOpen.addEventListener('click',()=>{
 const map=i2ProgressView(state);
 openI2HelpDialog({
  title:'Mapa de la misión · '+map.chapterLabel,
  paragraphs:[...map.mapParagraphs]
 },mapOpen);
});
reset.addEventListener('click',()=>{
 if(window.confirm('¿Reiniciar la campaña de Misión CD?')){state=init();preview=null;saveAndRender()}
});
render();
