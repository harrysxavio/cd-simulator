// Misión CD · MVP alfa: one focused mobile scene at a time.
// Existing src/i2-mvp-adapter.js owns the physical model; this file is UI only.
import {NODES} from '../src/engine.js';
import {I2_AREAS,I2_RECOVERIES} from '../src/i2-product-contract.js';
import {i2DefaultChoices,i2MvpPhysicalResult,I2_MVP_CASE} from '../src/i2-mvp-adapter.js';

const KEY='supply-lab-i2-v1';
const root=document.querySelector('#gameScene');
const primary=document.querySelector('#gameNext');
const secondary=document.querySelector('#gameBack');
const progress=document.querySelector('#gameProgress');
const stage=document.querySelector('#gameStage');
const reset=document.querySelector('#gameRestart');
const fail=document.querySelector('#gameError');
const money=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
const num=new Intl.NumberFormat('es-CL');
const init=()=>({
 schema:1,phase:'intro',index:0,
 choices:{...i2DefaultChoices()},recovery:'wait',arrivalDay:2,coverage:100,
 confirmedAreas:[],reveal:false
});
let state=load();
let preview=null;

/** Restore only whitelisted user choices. Never load a simulated stock ledger. */
function load(){
 try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!raw||raw.schema!==1||!['intro','area','reveal','recover','result'].includes(raw.phase))return init();
  if(!Number.isInteger(raw.index)||raw.index<0||raw.index>7)return init();
  const choices={...i2DefaultChoices()};
  for(const a of I2_AREAS){
   if(!a.choices.some(c=>c.optionId===raw.choices?.[a.id]))return init();
   choices[a.id]=raw.choices[a.id];
  }
  if(!I2_RECOVERIES.some(r=>r.optionId===raw.recovery))return init();
  if(![1,2,5,10,13].includes(raw.arrivalDay)||![0,25,50,75,100].includes(raw.coverage))return init();
  const confirmedAreas=Array.isArray(raw.confirmedAreas)
   ?raw.confirmedAreas.filter(id=>I2_AREAS.some(a=>a.id===id)):[];
  if(raw.phase!=='intro'&&raw.phase!=='area'&&confirmedAreas.length!==8)return init();
  return {
   schema:1,phase:raw.phase,index:raw.index,choices,recovery:raw.recovery,
   arrivalDay:raw.arrivalDay,coverage:raw.coverage,
   confirmedAreas,reveal:raw.reveal===true
  };
 }catch{return init()}
}
/** localStorage key is independent of V1 and stores only decisions, not events. */
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(state))}catch{
  fail.textContent='No se pudo guardar localmente. Puedes seguir jugando, pero la partida puede perderse al recargar.';
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
function replace(children){
 root.replaceChildren(...children);
 root.scrollTop=0;
 const title=root.querySelector('#step-title');
 if(title)title.focus({preventScroll:true});
}
function saveAndRender(){persist();render();}
function choiceList(area){
 return section('choice-list',area.choices.map(c=>button(c.label,()=>{
  state.choices[area.id]=c.optionId;saveAndRender();
 },{selected:state.choices[area.id]===c.optionId,description:c.description})));
}
function intro(){
 stage.textContent='MVP alfa · Presentación';progress.style.width='0%';
 replace([
  p('MISIÓN 01 · GERENTE DE CENTRO DE DISTRIBUCIÓN','eyebrow'),
  heading('Hoy tú diriges el centro de distribución.'),
  p('Decidirás en ocho áreas y luego descubrirás un cambio inesperado en la demanda. Tu desafío es gestionar el resultado, no adivinar la respuesta.','lead'),
  section('guide-box',[
   node('strong',{text:'Tu guía de operaciones'}),
   p('Primero observa el contexto. Después elige una alternativa por área. Si quieres, abre la explicación; no es obligatoria.'),
   p('Caso ficticio con 3 SKU, 200 pedidos planificados en una muestra y horizonte físico hasta el día 12. La demanda real se revelará después del plan.','note')
  ]),
  p('Las decisiones son educativas: no generan órdenes de compra ni costos reales.','footnote')
 ]);
 setActions({next:'Comenzar misión →',onNext:()=>{state.phase='area';state.index=0;saveAndRender()}});
}
function areaScene(){
 const area=I2_AREAS[state.index],original=NODES[state.index];
 stage.textContent='Planificación · Área '+(state.index+1)+' de 8';
 progress.style.width=(100*(state.index+1)/10)+'%';
 const lesson=node('details',{className:'learn-more'},[
  node('summary',{text:'¿Qué significa esta área y su KPI?'}),
  p(original.desc),
  p('KPI a observar: '+original.kpi+'. Antes de revelar la demanda no mostramos resultados físicos futuros.')
 ]);
 const consequence=node('details',{className:'learn-more'},[
  node('summary',{text:'¿Qué podría cambiar con mi decisión?'}),
  p('Tu elección modificará los parámetros canónicos del simulador. Puede tener efectos en otras áreas y no garantiza que se expidan más pedidos.'),
  p('El impacto medido se conocerá después de revelar la demanda y ejecutar la cohorte de pedidos.','note')
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
 const back=state.index>0?()=>{state.index--;saveAndRender()}:()=>{state.phase='intro';saveAndRender()};
 setActions({
  next:state.index===7?'Cerrar planificación →':'Confirmar y siguiente →',
  onNext:()=>{
   if(!state.confirmedAreas.includes(area.id))state.confirmedAreas.push(area.id);
   if(state.index<7)state.index++;
   else state.phase='reveal';
   saveAndRender();
  },
  back:'← Atrás',onBack:back
 });
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
 setActions({
  next:'Revelar demanda →',onNext:()=>{
   // Explicit reveal is the first permitted calculation of actual-demand KPI.
   state.reveal=true;state.phase='recover';preview=null;saveAndRender();
  },
  back:'← Revisar Transporte',onBack:()=>{state.phase='area';state.index=7;saveAndRender()}
 });
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
   const box=section('impact-result',[
    node('strong',{text:'Resultado estimado, no confirmado'}),
    p('Pedidos expedidos: '+num.format(preview.shippedOrders)+' / '+num.format(preview.actualOrders)),
    p('Mejora frente a no intervenir: '+num.format(preview.recoveredOrders)+' pedidos.'),
    p('Gasto incremental modelado: '+money.format(preview.incrementalExpenseCLP)+'.','note'),
    p('No representa costo operacional total ni entrega al cliente.','footnote')
   ]);
   root.querySelector('.impact-wrap').append(box);
   impact.disabled=true;
  }catch(e){showError(e)}
 });
 setActions({
  next:'Confirmar intervención →',
  onNext:()=>{
   try{resultFor();state.phase='result';saveAndRender()}
   catch(e){showError(e)}
  }
 });
}
function resultsScene(){
 if(!state.reveal){state.phase='reveal';render();return}
 stage.textContent='Resultado · Aprendizaje';progress.style.width='100%';
 let data;try{data=resultFor()}catch(e){showError(e);return}
 const overview=section('metrics-grid',[
  section('metric-card',[node('span',{text:'Expedidos del CD'}),node('strong',{text:num.format(data.shippedOrders)})]),
  section('metric-card',[node('span',{text:'Pendientes'}),node('strong',{text:num.format(data.pendingOrders)})])
 ]);
 const detail=node('details',{className:'learn-more'},[
  node('summary',{text:'Consultar indicadores y áreas'}),
  p('Antes de tu recuperación se expidieron '+num.format(data.baselineShipped)+' pedidos; la intervención cambió ese resultado en '+num.format(data.recoveredOrders)+'.'),
  p('Gasto incremental modelado: '+money.format(data.incrementalExpenseCLP)+'. El costo operacional total es desconocido.'),
  ...data.areaRows.map(a=>section('area-detail',[
   node('strong',{text:a.title}),p(a.headline,'note')
  ]))
 ]);
 replace([
  p('CIERRE DE CAMPAÑA · DÍA 12','eyebrow'),
  heading('Estas fueron las consecuencias de tus decisiones.'),
  p('Demanda real: '+num.format(data.actualOrders)+' pedidos completos. Resultados procedentes del mismo motor físico SKU de V1.','lead'),
  overview,
  section('guide-box',[
   node('strong',{text:'Lección para gerencia'}),
   p(data.recoveredOrders>0?'La intervención recuperó pedidos frente a mantener el escenario sin actuar. Revisa también su costo.':'Esta decisión no recuperó pedidos adicionales antes del corte. A veces el plazo, el stock o varias restricciones simultáneas limitan la acción.'),
   p('Preparado no significa expedido. Salir del CD tampoco acredita entrega al cliente.')
  ]),
  detail,
  p('Simulación educativa, no operación real ni contabilidad completa.','footnote')
 ]);
 setActions({next:'Jugar de nuevo ↻',onNext:()=>{state=init();preview=null;saveAndRender()}});
}
function showError(e){
 console.error('Misión CD:',e);
 fail.textContent='No se pudo conciliar el resultado físico: '+(e?.message||'error desconocido');
}
function render(){
 fail.textContent='';
 reset.hidden=state.phase==='intro';
 if(state.phase==='intro')intro();
 else if(state.phase==='area')areaScene();
 else if(state.phase==='reveal')revealScene();
 else if(state.phase==='recover')recoveryScene();
 else if(state.phase==='result')resultsScene();
}
reset.addEventListener('click',()=>{
 if(window.confirm('¿Reiniciar la campaña de Misión CD?')){state=init();preview=null;saveAndRender()}
});
render();
