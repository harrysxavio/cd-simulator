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
import {I2_GOALS,I2_BUDGET_CHOICES,i2ReadObjectives,i2SaveObjectives,i2EvaluateObjectives} from '../src/i2-management-objectives.js';
import {I2_CHALLENGES,i2ChallengeForSeed,i2ChallengeReveal} from '../src/i2-challenge-config.js';
import {I2_NICO_LEVELS,readI2NicoLevel,saveI2NicoLevel,
 i2NicoTutorial,i2NicoCoachTip} from '../src/i2-nico-tutorial.js';
import {I2_ADVANCED_FIELDS,i2ValidateAdvanced} from '../src/i2-advanced-settings.js';
import {I2_AREA_TABS,i2AreaPlanningIndicators} from '../src/i2-area-planning-indicators.js';
import {i2CommercialForecastLesson} from '../src/i2-commercial-forecast-lesson.js';
import {i2PlanningCoveragePreview} from '../src/i2-planning-coverage.js';
import {i2SupplierCommitmentPreview} from '../src/i2-supplier-purchasing.js';
import {I2_NICO_ASSETS_READY,i2NicoPoseAsset,i2NicoPortraitAsset} from '../src/i2-nico-art.js';
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
let areaTab='decision'; // solo navegación visual; nunca persistir en campaña
let objectives=i2ReadObjectives(window.localStorage);
let showGuide=false;
try{showGuide=readI2GuidePreference(window.localStorage)}catch{}
let guideLevel=readI2NicoLevel(window.localStorage);

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
/** Only verified, user-supplied Nico art; recover gracefully from missing CDN files. */
function nicoImage(src,{className='',width=112,height=112}={}){
 const img=node('img',{className,attrs:{
  src,width:String(width),height:String(height),alt:'',loading:'lazy',decoding:'async'
 }});
 img.addEventListener('error',()=>{
  if(img.getAttribute('src')!=='./nico.svg')img.setAttribute('src','./nico.svg');
 });
 return img;
}
/** Art source PNGs are loaded only after hash-verified installation. */
function nicoScenePortrait(kind){
 if(!I2_NICO_ASSETS_READY)return null;
 const art=i2NicoPoseAsset(kind);
 return nicoImage(art.src,{className:'nico-scene-portrait'});
}
function guideElement(){
 const advice=i2NicoCoachTip(state,guideLevel);
 const wrapper=node('section',{className:'mentor-area',attrs:{id:'gameGuide'}});
 const toggle=node('button',{
  className:'mentor-toggle',
  text:showGuide?'Ocultar consejo de '+advice.name:'Ver consejo de '+advice.name,
  attrs:{type:'button','aria-expanded':String(showGuide),'aria-controls':'gameGuideText'}
 });
 const adviceText=section('mentor-response',[
  ...(showGuide?[nicoScenePortrait(advice.pose)]:[]),
  p(advice.text,'mentor-copy'),
  p('Por ejemplo: '+advice.example,'mentor-example'),
  p(advice.question,'mentor-question')
 ]);
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
function replace(children,{guide=true}={}){
 root.replaceChildren(...children);
 root.scrollTop=0;
 const title=root.querySelector('#step-title');
 if(title){
  if(guide)title.after(guideElement());
  title.focus({preventScroll:true});
 }
}
function saveAndRender(){persist();render();}
function gameTransition(action){
 try{
  state=navigateI2GameState(state,action);
  areaTab='decision';
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
function objectivesSummary(){
 return 'Meta de servicio '+I2_GOALS[objectives.goal].serviceTargetPercent+
 ' % · Límite extra '+money.format(objectives.incrementalBudgetCLP);
}
/** Selector de escenario: el signo de la demanda sigue oculto hasta Revelar. */
function challengeField(locked){
 const group=section('management-field');
 const select=node('select',{attrs:{id:'gameChallenge'}});
 for(const c of I2_CHALLENGES){
  const option=node('option',{text:c.level+' · '+c.label,attrs:{value:c.seed}});
  option.selected=c.seed===state.seed;
  select.append(option);
 }
 select.disabled=locked;
 select.addEventListener('change',()=>{
  if(state.confirmedAreas.length>0)return;
  try{
   // El escenario queda precomprometido antes de la primera confirmación.
   state.seed=i2ChallengeForSeed(select.value).seed;
   persist();
   const label=root.querySelector('#gameChallengeLabel');
   if(label)label.textContent='Reto activo: '+i2ChallengeForSeed(state.seed).level;
  }catch(e){showError(e)}
 });
 group.append(node('label',{text:'Reto y dificultad',attrs:{for:'gameChallenge'}}),
  select,p('La demanda real queda fijada por este reto antes de decidir. Su resultado se oculta hasta revelar.','footnote'));
 return group;
}
function objectivesSettings(){
 const locked=state.confirmedAreas.length>0,details=node('details',{className:'management-settings'});
 details.append(node('summary',{text:'Ajustar metas gerenciales'}));
 function field(label,id,options,current,key,convert){
  const group=section('management-field'),select=node('select',{attrs:{id}});
  for(const option of options){
   const o=node('option',{text:option.label,attrs:{value:option.value}});
   o.selected=option.value===current;select.append(o);
  }
  select.disabled=locked;
  select.addEventListener('change',()=>{
   if(locked)return;
   try{
    objectives=i2SaveObjectives(window.localStorage,{...objectives,[key]:convert(select.value)});
    const t=root.querySelector('#managementTarget');if(t)t.textContent=objectivesSummary();
   }catch(e){showError(e)}
  });
  group.append(node('label',{text:label,attrs:{for:id}}),select);
  return group;
 }
 details.append(
  p('Estas metas evalúan resultados. No cambian pronóstico, compras ni demanda.','footnote'),
  field('Objetivo gerencial','gameGoal',Object.entries(I2_GOALS).map(([value,v])=>({value,label:v.label})),objectives.goal,'goal',String),
  field('Límite de gasto incremental modelado','gameBudget',I2_BUDGET_CHOICES.map(value=>({value,label:money.format(value)})),objectives.incrementalBudgetCLP,'incrementalBudgetCLP',Number),
  challengeField(locked),
  ...(locked?[p('La meta está cerrada al confirmar la primera decisión.','note')]:[])
 );
 return details;
}
/** I2-15: edición transaccional; los cambios no afectan al motor hasta Guardar. */
function advancedSettings(){
 const locked=state.confirmedAreas.length>0;
 const details=node('details',{className:'advanced-settings'});
 details.append(node('summary',{text:'Configuración avanzada · stock, capacidad y costo'}));
 const draft={...state.advanced};
 const opts=[
  {key:'plannedOrders',id:'advancedOrders',label:'Pedidos planificados de muestra',
   note:'Cambiar el tamaño de la muestra modifica la planificación y las compras originales.',
   values:I2_ADVANCED_FIELDS.plannedOrders.map(x=>({value:x,label:x+' pedidos'}))},
  {key:'pickingLimitSkuPerDay',id:'advancedPicking',label:'Tope de Picking (SKU por jornada)',
   note:'Limita físicamente las unidades que se preparan al día; no representa operarios.',
   values:[{value:'base',label:'Según decisiones del CD'},
    {value:'10',label:'Estrés · 10 SKU / día'},
    {value:'40',label:'Restringido · 40 SKU / día'}]},
  {key:'stockProfile',id:'advancedStock',label:'Inventario físico inicial de los 3 SKU',
   note:'Perfil conjunto A/B/C, separado del stock agregado del simulador clásico.',
   values:[{value:'low',label:'Reducido · 75 %'},{value:'standard',label:'Base · 100 %'},
    {value:'high',label:'Alto · 125 %'}]},
  {key:'extraCapacityDailyCostCLP',id:'advancedCost',label:'Tarifa diaria de refuerzo',
   note:'Costo CLP simulado por turno de refuerzo activado; no es costo total.',
   values:I2_ADVANCED_FIELDS.extraCapacityDailyCostCLP.map(x=>({value:x,label:money.format(x)}))}
 ];
 const fields=opts.map(spec=>{
  const group=section('management-field');
  const input=node('select',{attrs:{id:spec.id}});
  for(const choice of spec.values){
   const option=node('option',{text:choice.label,attrs:{value:choice.value}});
   option.selected=choice.value===draft[spec.key];input.append(option);
  }
  input.disabled=locked;
  input.addEventListener('change',()=>{
   draft[spec.key]=typeof state.advanced[spec.key]==='number'?Number(input.value):input.value;
   message.textContent='Cambios sin guardar: pulsa Guardar para aplicarlos.';
  });
  group.append(node('label',{text:spec.label,attrs:{for:spec.id}}),input,
   p(spec.note,'footnote'));
  return group;
 });
 const message=p('Los cambios se aplican solo al guardar, antes de confirmar Comercial.','advanced-feedback');
 message.id='advancedFeedback';message.setAttribute('role','status');
 const actions=section('advanced-actions');
 const save=node('button',{text:'Guardar configuración',attrs:{type:'button',id:'advancedSave'}});
 const cancel=node('button',{text:'Cancelar cambios',attrs:{type:'button',id:'advancedCancel'}});
 save.disabled=locked;cancel.disabled=locked;
 save.addEventListener('click',()=>{
  if(state.confirmedAreas.length>0)return;
  try{
   const next=i2ValidateAdvanced(draft);
   state.advanced=next;
   persist();
   const label=root.querySelector('#advancedSummary');
   if(label)label.textContent=advancedSummary();
   const plan=root.querySelector('#gamePlanOrders');
   if(plan)plan.textContent='Partimos con '+num.format(next.plannedOrders)+
    ' pedidos previstos en una muestra. La demanda real sigue oculta.';
   message.textContent='Configuración guardada. La nueva base se aplicará a esta misión.';
  }catch(e){message.textContent='Revisa los valores: '+e.message}
 });
 cancel.addEventListener('click',()=>{
  for(const spec of opts){
   draft[spec.key]=state.advanced[spec.key];
   const input=details.querySelector('#'+spec.id);
   input.value=String(draft[spec.key]);
  }
  message.textContent='Edición descartada. La partida no cambió.';
 });
 actions.append(save,cancel);
 details.append(p('Al guardar, cambias la base operativa de la misión; no la puntuación visual. No modifica V1.','footnote'),
  ...fields,message,actions,
  ...(locked?[p('Plan bloqueado: ya confirmaste al menos una decisión. Reinicia para cambiar los supuestos.','note')]:[]));
 return details;
}
function advancedSummary(){
 const c=state.advanced;
 return 'Base: '+num.format(c.plannedOrders)+' pedidos · Picking '+
 (c.pickingLimitSkuPerDay==='base'?'según áreas':c.pickingLimitSkuPerDay+' SKU/día')+
 ' · Stock '+({low:'75 %',standard:'100 %',high:'125 %'}[c.stockProfile])+
 ' · Refuerzo '+money.format(c.extraCapacityDailyCostCLP)+'/turno';
}
/** Presentación breve, independiente de revelar resultados y sin forzar consejos. */
function nicoWelcome(){
 const avatar=section('nico-avatar',[
  node('span',{className:'nico-avatar-fallback',text:'NC',attrs:{'aria-hidden':'true'}}),
  nicoImage(i2NicoPortraitAsset().src,{width:76,height:92})
 ]);
 const intro=section('nico-intro-text',[
  node('strong',{text:'¡Hola! Soy Nico, tu compañero de misión'}),
  p('Vamos a recorrer el CD juntos. Te explicaré lo importante con ejemplos y tú tomarás las decisiones.','nico-intro-line')
 ]);
 const card=section('nico-welcome',[
  section('nico-welcome-head',[avatar,intro])
 ]);
 const detail=node('details',{className:'nico-lesson'});
 detail.append(node('summary',{text:'Elegir nivel y ver tutorial (opcional)'}));
 const group=section('management-field');
 const sel=node('select',{attrs:{id:'nicoLevel'}});
 for(const x of I2_NICO_LEVELS){
  const option=node('option',{attrs:{value:x.id},text:x.label});
  option.selected=x.id===guideLevel;
  sel.append(option);
 }
 const steps=section('nico-tutorial-steps',i2NicoTutorial(guideLevel).map(line=>p(line)));
 steps.id='nicoTutorialSteps';
 sel.addEventListener('change',()=>{
  try{
   guideLevel=saveI2NicoLevel(window.localStorage,sel.value);
   steps.replaceChildren(...i2NicoTutorial(guideLevel).map(line=>p(line)));
   const current=root.querySelector('#gameGuide');
   if(current)current.replaceWith(guideElement());
  }catch(e){showError(e)}
 });
 group.append(node('label',{text:'Experiencia con Nico',attrs:{for:'nicoLevel'}}),sel,
  p('El nivel modifica las explicaciones, no la dificultad ni el resultado.','footnote'));
 detail.append(group,steps);
 card.append(detail);
 return card;
}
function intro(){
 const brief=i2FirstMissionBriefing(state);
 stage.textContent='Misión 01 · Tu primer turno';
 replace([
  p('MISIÓN 01 · '+brief.role,'eyebrow'),
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
  nicoWelcome(),
  section('briefing-steps',[
   node('strong',{text:'Tu desafío en 3 pasos'}),
   ...brief.steps.map((step,index)=>section('briefing-step',[
    node('span',{className:'briefing-number',text:String(index+1)}),
    p(step)
   ]))
  ]),
  node('p',{className:'note',text:'Partimos con '+num.format(brief.plannedOrders)+' pedidos previstos en una muestra. La demanda real sigue oculta.',attrs:{id:'gamePlanOrders'}}),
  node('p',{className:'management-target',text:objectivesSummary(),attrs:{id:'managementTarget'}}),
  node('p',{className:'footnote',text:'Reto activo: '+i2ChallengeForSeed(state.seed).level,attrs:{id:'gameChallengeLabel'}}),
  objectivesSettings(),
  node('p',{className:'footnote',text:advancedSummary(),attrs:{id:'advancedSummary'}}),
  advancedSettings(),
  p(brief.warning,'footnote')
 ]);
 updateFooter();
}
/**
 * I2-18: solo planificación. El lector no conoce la semilla de demanda,
 * el libro de eventos ni el resultado físico (I2-18 contrato separado).
 */
function commercialForecastTeaching(){
 const lesson=i2CommercialForecastLesson(state);
 const chain=node('details',{className:'commercial-flow'},[
  node('summary',{text:'Cómo afecta Compras y al resto del CD'}),
  ...lesson.chain.map((step,i)=>p((i+1)+'. '+step,'commercial-flow-step')),
  p('Lead time nominal del catálogo SKU: '+lesson.leadTimes.map(x=>
   x.id+' '+x.nominalDays+' días').join(' · ')+'. Fecha efectiva sujeta a proveedor y proceso.','footnote')
 ]);
 return section('commercial-forecast-teaching',[
  node('strong',{text:lesson.main}),
  p(lesson.secondary,'commercial-forecast-sub'),
  p(lesson.whatIf,'note'),
  chain,
  p(lesson.warning,'footnote'),
  p('Fuente: '+lesson.source,'footnote')
 ]);
}
/** Planificación con compras proyectadas ANTES del shock (no PO emitida). */
function planningCoverageTeaching(){
 const model=i2PlanningCoveragePreview(state);
 const manifest=node('details',{className:'planning-sku-detail'},[
  node('summary',{text:'Revisar desglose de la compra por SKU'}),
  ...model.rows.map(row=>section('planning-sku-row',[
   node('strong',{text:'SKU '+row.skuId+' · '+num.format(row.plannedPurchaseSkuUnits)+' unidades'}),
   p('Inicio: '+num.format(row.openingSkuUnits)+' SKU · Necesidad calculada: '+
    num.format(row.policyNeedSkuUnits)+' SKU','footnote'),
   p('Compromiso proyectado: '+money.format(row.commitmentCLP)+
    ' · lead time nominal '+row.nominalLeadDays+' días','footnote')
  ]))
 ]);
 return section('planning-coverage-teaching',[
  node('strong',{text:'Cobertura '+model.coveragePercent+' % del faltante SKU'}),
  p('Pronóstico confirmado por Comercial: '+num.format(model.forecastOrders)+' pedidos de muestra.','note'),
  section('planning-coverage-numbers',[
   section('planning-coverage-number',[
    node('span',{text:'Compra original proyectada'}),
    node('strong',{text:num.format(model.totalCommittedSkuUnits)+' SKU'})
   ]),
   section('planning-coverage-number',[
    node('span',{text:'Compromiso valorizado'}),
    node('strong',{text:money.format(model.totalCommittedValueCLP)})
   ])
  ]),
  p(model.teaching,'note'),
  manifest,
  p(model.boundary,'footnote'),
  p('Fuente: '+model.source,'footnote')
 ]);
}
/** Compras: el proveedor puede cumplir sin que Recepción ingrese ni Calidad libere. */
function supplierPurchasingTeaching(){
 const model=i2SupplierCommitmentPreview(state);
 const detail=node('details',{className:'supplier-sku-detail'},[
  node('summary',{text:'Ver compromiso y abastecimiento por SKU'}),
  ...model.rows.map(row=>section('supplier-sku-row',[
   node('strong',{text:'SKU '+row.skuId}),
   p('Orden proyectada: '+num.format(row.orderedSkuUnits)+
    ' · cumplidas por proveedor (modelo): '+num.format(row.modeledSupplierFulfilledSkuUnits)),
   p('Faltante proveedor: '+num.format(row.modeledSupplierShortfallSkuUnits)+
    ' · plazo base '+row.standardLeadDays+' días','footnote')
  ]))
 ]);
 return section('supplier-purchasing-teaching',[
  node('strong',{text:'Proveedor: '+model.supplierFillPercent+' % de cumplimiento supuesto'}),
  p('Tasa efectiva aplicada a SKU tras redondear las unidades de V1: '+model.effectiveSkuFillPercent.toFixed(2).replace('.',',')+' %.','footnote'),
  section('supplier-purchasing-metrics',[
   section('supplier-metric',[node('span',{text:'Unidades comprometidas'}),
    node('strong',{text:num.format(model.originalCommittedSkuUnits)})]),
   section('supplier-metric',[node('span',{text:'Cumpliría el proveedor'}),
    node('strong',{text:num.format(model.modeledSupplierFulfilledSkuUnits)})]),
   section('supplier-metric',[node('span',{text:'No cumpliría'}),
    node('strong',{text:num.format(model.modeledSupplierShortfallSkuUnits)})])
  ]),
  p(model.lesson,'note'),
  detail,
  p(model.boundary,'footnote')
 ]);
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
 // Esta lectura es solo de opciones de V1. El motor SKU no se ejecuta aquí.
 const model=i2AreaPlanningIndicators(state);
 const compare=section('area-assumption-summary',[
  section('area-metric-pair',model.metrics.map(metric=>section('area-assumption-metric',[
   node('span',{text:metric.label}),node('strong',{text:metric.formatted})
  ]))),
  section('area-reference-row',[
   node('span',{className:'area-reference-light '+model.traffic.kind,
    text:model.traffic.label}),
   p('Referencia: '+model.threshold.formatted+' · '+model.threshold.definition)
  ]),
  p('Posible consecuencia: '+model.consequence,'note'),
  p('Fuente: '+model.threshold.source,'footnote'),
  ...model.boundaries.map(line=>p(line,'footnote'))
 ]);
 const decision=section('area-tab-panel',[
  p('Selecciona una alternativa','option-heading'),
  choiceList(area),
  ...(area.id==='purchasing'?[p('La entrega del proveedor es una hipótesis; solo Recepción registra unidades físicas. Mira Indicadores para separar compromiso, cumplimiento y plazo.','commercial-brief')]:[]),
  ...(area.id==='planning'?[p('La cobertura elegida modifica la compra SKU planificada, no el stock disponible hoy. Revisa Indicadores para evaluar unidades y compromiso.','commercial-brief')]:[]),
  ...(area.id==='commercial'?[p('El forecast es una hipótesis de compra, no una venta garantizada. Mira Indicadores para ver la equivalencia de tu muestra.','commercial-brief')]:[]),
  lesson,consequence
 ]);
 const indicators=section('area-tab-panel',[
  p('Entradas previstas, no resultados','option-heading'),compare,
  ...(area.id==='commercial'?[commercialForecastTeaching()]:[]),
  ...(area.id==='planning'?[planningCoverageTeaching()]:[]),
  ...(area.id==='purchasing'?[supplierPurchasingTeaching()]:[])
 ]);
 const nico=section('area-tab-panel',[
  p('Nico · coordinador ficticio del CD','option-heading'),
  p('¿Lo vemos juntos? Te cuento qué puede pasar con esta decisión y te dejo una pregunta para pensar.','note'),
  guideElement(),
  p('Si mis consejos no te sirven, puedes dejarlos ocultos y continuar.','footnote')
 ]);
 const content=[decision,indicators,nico];
 const tabList=node('div',{className:'area-tab-list',attrs:{
  role:'tablist','aria-label':'Vistas para decidir en '+original.title
 }});
 const tabs=I2_AREA_TABS.map((item,i)=>{
  const el=node('button',{className:'area-tab',text:item.label,attrs:{
   type:'button',role:'tab',id:'area-tab-'+item.id,
   'aria-controls':'area-panel-'+item.id,
   'aria-selected':String(item.id===areaTab),
   tabindex:item.id===areaTab?'0':'-1'
  }});
  content[i].id='area-panel-'+item.id;
  content[i].setAttribute('role','tabpanel');
  content[i].setAttribute('aria-labelledby','area-tab-'+item.id);
  content[i].setAttribute('tabindex','0');
  content[i].hidden=item.id!==areaTab;
  tabList.append(el);
  return el;
 });
 function activate(i,{focus=false}={}){
  if(i<0||i>=tabs.length)return;
  areaTab=I2_AREA_TABS[i].id;
  tabs.forEach((tab,j)=>{
   tab.setAttribute('aria-selected',String(i===j));
   tab.tabIndex=i===j?0:-1;
   content[j].hidden=i!==j;
  });
  // Solo se desplaza el contenedor interno, nunca la página ni el footer.
  root.scrollTop=0;
  if(focus)tabs[i].focus({preventScroll:true});
 }
 tabs.forEach((tab,i)=>{
  tab.addEventListener('click',()=>activate(i));
  tab.addEventListener('keydown',event=>{
   const next=event.key==='ArrowRight'?(i+1)%tabs.length
    :event.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length
    :event.key==='Home'?0:event.key==='End'?tabs.length-1:-1;
   if(next<0)return;
   event.preventDefault();activate(next,{focus:true});
  });
 });
 const shell=section('area-tabs-shell',[tabList,...content]);
 // Gesto opcional: ignorar controles, scroll vertical y bordes reservados al SO.
 // Siempre existe la alternativa explícita de pestañas clicables y teclado.
 let origin=null;
 shell.addEventListener('touchstart',event=>{
  origin=null;
  if(event.touches.length!==1)return;
  const touch=event.touches[0];
  if(touch.clientX<26||touch.clientX>innerWidth-26)return;
  if(event.target.closest('button,a,input,select,textarea,summary,[role="tab"]'))return;
  origin={x:touch.clientX,y:touch.clientY};
 },{passive:true});
 shell.addEventListener('touchend',event=>{
  if(!origin||event.changedTouches.length!==1)return;
  const dx=event.changedTouches[0].clientX-origin.x;
  const dy=event.changedTouches[0].clientY-origin.y;
  origin=null;
  if(Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.5)return;
  const current=I2_AREA_TABS.findIndex(item=>item.id===areaTab);
  activate(current+(dx<0?1:-1));
 },{passive:true});
 shell.addEventListener('touchcancel',()=>{origin=null},{passive:true});
 replace([
  p('DECISIÓN '+(state.index+1)+' DE 8','eyebrow'),
  heading(original.icon+' '+original.title),
  p(area.question,'lead'),
  shell
 ],{guide:false});
 updateFooter();
}
function revealScene(){
 stage.textContent='Diagnóstico · Sorpresa';progress.style.width='84%';
 replace([
  p('EL PLAN QUEDÓ CERRADO','eyebrow'),
  heading('Algo cambió mientras el CD se preparaba.'),
  ...(I2_NICO_ASSETS_READY?[nicoScenePortrait('alert')]:[]),
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
  urgentArrivalDay:state.arrivalDay,purchaseCoveragePercent:state.coverage,
  seed:state.seed,advanced:state.advanced
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
 const reveal=i2ChallengeReveal(state.seed,state.advanced.plannedOrders);
 stage.textContent='Crisis · Recuperación';progress.style.width='92%';
 replace([
  p('DEMANDA SORPRESA · CASO REPRODUCIBLE','eyebrow'),
  heading(reveal.heading),
  ...(I2_NICO_ASSETS_READY?[nicoScenePortrait('reveal')]:[]),
  p('Se planificó una muestra de '+num.format(reveal.plannedOrders)+' pedidos, pero se observaron '+num.format(reveal.actualOrders)+'. El plan original quedó congelado. Ahora debes elegir cómo responder.','lead'),
  p(reveal.context,'note'),
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
 let data,score,evaluation;
 try{data=resultFor();score=i2SafeScorecard(data);evaluation=i2EvaluateObjectives(score,objectives)}catch(e){showError(e);return}
 // Solo tras el reveal: lee el mismo compromiso original por SKU.
 const commercial=data.commercial;
 const forecast=section('commercial-result',[
  node('strong',{text:'Comercial · pronóstico versus realidad'}),
  section('commercial-result-pair',[
   p('Pronóstico: '+num.format(commercial.forecastOrders)+' pedidos de muestra'),
   p('Observados: '+num.format(commercial.actualOrders)+' pedidos')
  ]),
  p('Diferencia real − pronóstico: '+(commercial.varianceVsForecastOrders>0?'+':'')+
   num.format(commercial.varianceVsForecastOrders)+' pedidos. '+(
    commercial.errorDirection==='under'?'El plan subestimó la demanda.':
    commercial.errorDirection==='over'?'El plan sobreestimó la demanda.':
    'El pronóstico coincidió con la demanda observada.'
   )),
  p('Compras originales comprometidas: '+num.format(commercial.originalCommittedSkuUnits)+
   ' unidades SKU · '+money.format(commercial.originalCommittedValueCLP)+'.','note'),
  p('Compromiso no es pago ni gasto operativo total. Compras, capacidad y plazo también afectan el servicio.','footnote'),
  node('details',{className:'commercial-commitment-details'},[
   node('summary',{text:'Ver compras originales por SKU y día previsto'}),
   ...commercial.originalRows.map(row=>p(
    'SKU '+row.skuId+': '+num.format(row.committedSkuUnits)+
    ' unidades · llegada prevista día '+row.expectedArrivalDay
   ))
  ])
 ]);
 const planning=section('planning-outcome',[
  node('strong',{text:'Planificación · cobertura y compra original'}),
  p('Pronóstico utilizado: '+num.format(data.planning.forecastOrders)+' pedidos de muestra · cobertura '+data.planning.coveragePercent+' %.','note'),
  section('planning-coverage-numbers',[
   section('planning-coverage-number',[node('span',{text:'Unidades SKU comprometidas'}),
    node('strong',{text:num.format(data.planning.totalCommittedSkuUnits)})]),
   section('planning-coverage-number',[node('span',{text:'Valor de compromiso'}),
    node('strong',{text:money.format(data.planning.totalCommittedValueCLP)})])
  ]),
  p('El compromiso original se fijó antes de revelar la demanda y no cambió al seleccionar la recuperación. No equivale a pago ni costo total.','footnote'),
  node('details',{className:'planning-sku-detail'},[
   node('summary',{text:'Revisar el plan original por SKU'}),
   ...data.planning.rows.map(row=>p('SKU '+row.skuId+': '+num.format(row.originalCommittedSkuUnits)+
    ' unidades comprometidas · llegada prevista día '+row.nominalArrivalDay,'note'))
  ])
 ]);
 const purchasing=section('supplier-purchasing-outcome',[
  node('strong',{text:'Compras · ¿llegó realmente el abastecimiento?'}),
  p('Libro original del proveedor y Recepción, antes de cualquier recuperación.','note'),
  section('supplier-purchasing-metrics',[
   ...[['Comprometidas',data.purchasing.totals.orderedSkuUnits],
      ['Proveedor cumplió',data.purchasing.totals.fulfilledSkuUnits],
      ['Llegaron al CD',data.purchasing.totals.arrivedByCutoffSkuUnits],
      ['Recibidas en bodega',data.purchasing.totals.warehouseReceivedSkuUnits]]
     .map(([label,n])=>section('supplier-metric',[node('span',{text:label}),
      node('strong',{text:num.format(n)})]))
  ]),
  p('Faltante proveedor: '+num.format(data.purchasing.totals.supplierShortfallSkuUnits)+
   ' SKU · en tránsito al corte: '+num.format(data.purchasing.totals.inTransitSkuUnits)+
   ' SKU · esperando Recepción: '+num.format(data.purchasing.totals.waitingWarehouseSkuUnits)+' SKU.','note'),
  node('details',{className:'supplier-sku-detail'},[
   node('summary',{text:'Ver trazabilidad original por SKU'}),
   ...data.purchasing.rows.map(row=>section('supplier-sku-row',[
    node('strong',{text:'SKU '+row.skuId}),
    p('Pedidas '+num.format(row.orderedSkuUnits)+' · cumplidas '+num.format(row.fulfilledSkuUnits)+
     ' · llegada nominal día '+row.modeledArrivalDay),
    p('Recibidas físicamente '+num.format(row.warehouseReceivedSkuUnits)+
     ' · esperando muelle '+num.format(row.waitingWarehouseSkuUnits),'footnote')
   ]))
  ]),
  p(data.purchasing.boundary,'footnote')
 ]);
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
  ...(I2_NICO_ASSETS_READY?[nicoScenePortrait(evaluation.allGreen?'result':
   score.recoveredOrders.value>0?'improvement':'analysis')]:[]),
  p('Demanda real: '+num.format(score.actualOrders.value)+' pedidos completos. Resultados procedentes del mismo motor físico SKU de V1.','lead'),
  overview,
  forecast,
  planning,
  purchasing,
  section('management-evaluation',[
   node('strong',{text:'Tu gestión frente a las metas'}),
   ...[['Servicio de expedición',evaluation.service.status,
      evaluation.service.actualPercent.toFixed(1).replace('.',',')+' % / meta '+evaluation.service.targetPercent+' %',
      evaluation.service.description],
     ['Gasto extra modelado',evaluation.expense.status,
      money.format(evaluation.expense.valueCLP)+' / límite '+money.format(evaluation.expense.budgetCLP),
      evaluation.expense.description]].map(([label,status,value,description])=>
     section('management-traffic-row',[
      node('span',{className:'management-traffic status-'+status,text:
       status==='green'?'Adecuado':status==='amber'?'Atención':'Crítico'}),
      node('strong',{text:label}),p(value+' · '+description,'note')
     ])),
   p(evaluation.allGreen?'Las dos metas configuradas se cumplieron, sin afirmar rentabilidad total.':
     'Atención: un buen despacho no compensa una desviación crítica de costo o servicio.','note'),
   p('Evaluación didáctica de dos ejes. Costo total y productividad persona-hora: sin datos auditables.','footnote')
  ]),
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
 if(window.confirm('¿Reiniciar la campaña de Misión CD?')){state=init({seed:state.seed,advanced:state.advanced});preview=null;saveAndRender()}
});
render();
