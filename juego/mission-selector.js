/**
 * Lab14: portada de selección de retos. Solo interfaz.
 * Seleccionar una misión nueva con planificación cerrada exige confirmación
 * explícita y no altera una partida hasta que el jugador acepte.
 */
export const I2_MISSION_MODES=Object.freeze([
 Object.freeze({id:'initial',name:'Primer turno',summary:'Aprende las ocho áreas y responde a una demanda distinta de la prevista.',icon:'🎓'}),
 Object.freeze({id:'picking',name:'Reto de Picking',summary:'Identifica un límite real de SKU por jornada antes de gastar en refuerzos.',icon:'📦'}),
 Object.freeze({id:'quality',name:'Reto de Calidad',summary:'Gestiona unidades retenidas y stock inicial reducido, sin confundir liberación con despacho.',icon:'🔎'}),
 Object.freeze({id:'incident',name:'Incidentes del CD',summary:'La operación revela interrupciones al avanzar las jornadas; solo puedes actuar cuando ocurren.',icon:'⚠️'})
]);

export function renderI2MissionHub({active='initial',locked=false,onSelect=()=>{}}={}){
 const section=document.createElement('section');
 section.className='i2-mission-hub';
 const tag=(kind,klass,txt)=>{
  const el=document.createElement(kind);el.className=klass;el.textContent=txt;return el;
 };
 const chosen=I2_MISSION_MODES.find(x=>x.id===active)??I2_MISSION_MODES[0];
 const top=tag('div','i2-mission-hub-title','ESCOGE TU EXPERIENCIA');
 const label=tag('strong','i2-mission-active','🎮 '+chosen.name);
 const info=tag('p','i2-mission-hub-description',chosen.summary);
 const status=tag('p','i2-mission-hub-status',locked
  ?'Tu planificación tiene decisiones confirmadas. Puedes cambiar de reto, pero deberás aceptar reiniciar el plan.'
  :'Todavía puedes probar otro reto antes de confirmar la primera área.');
 const trigger=tag('button','i2-mission-hub-trigger','Elegir o cambiar reto');
 trigger.type='button';trigger.setAttribute('aria-haspopup','dialog');
 trigger.addEventListener('click',()=>openMissionDialog(trigger));
 section.append(top,label,info,status,trigger);
 function openMissionDialog(source){
  const modal=tag('dialog','i2-mission-dialog','');
  modal.setAttribute('aria-labelledby','i2-mission-dialog-title');
  const head=tag('header','i2-mission-dialog-head','');
  const title=tag('h2','', '¿Qué misión quieres dirigir?');
  title.id='i2-mission-dialog-title';
  const close=tag('button','i2-mission-dialog-close','Cerrar');
  close.type='button';close.addEventListener('click',()=>modal.close());
  head.append(title,close);
  const message=tag('p','i2-mission-dialog-message',
   'Cada reto cambia las condiciones que aprenderás a gestionar. La demanda real permanece oculta hasta que cierres las ocho decisiones.');
  const options=tag('div','i2-mission-options','');
  const warning=tag('p','i2-mission-change-warning','');
  warning.setAttribute('role','status');
  const cancel=tag('button','i2-mission-cancel','Cancelar');
  cancel.type='button';
  const approve=tag('button','i2-mission-approve','Confirmar cambio y reiniciar plan');
  approve.type='button';
  const confirmBar=tag('div','i2-mission-confirm-bar','');
  confirmBar.hidden=true;
  let selected=null;
  const makeChoice=(mode)=>{
   const item=tag('button','i2-mission-choice','');
   item.type='button';item.dataset.mode=mode.id;
   item.setAttribute('aria-pressed',String(active===mode.id));
   item.append(tag('strong','',''+mode.icon+' '+mode.name),
    tag('span','',mode.summary));
   item.addEventListener('click',()=>{
    if(mode.id===active){modal.close();return}
    if(locked){
     selected=mode.id;
     warning.textContent='Atención: al pasar a «'+mode.name+
      '» se eliminan las ocho decisiones anteriores y cualquier recuperación. No cambia tu juego hasta confirmar.';
     confirmBar.hidden=false;approve.focus({preventScroll:true});
     return;
    }
    modal.close();onSelect(mode.id);
   });
   return item;
  };
  options.append(...I2_MISSION_MODES.map(makeChoice));
  cancel.addEventListener('click',()=>{selected=null;confirmBar.hidden=true});
  approve.addEventListener('click',()=>{
   if(!selected)return;
   const next=selected;selected=null;modal.close();onSelect(next);
  });
  confirmBar.append(warning,cancel,approve);
  modal.append(head,message,options,confirmBar);
  modal.addEventListener('close',()=>{
   modal.remove();
   if(source.isConnected)source.focus({preventScroll:true});
  },{once:true});
  document.body.append(modal);
  try{modal.showModal();close.focus({preventScroll:true})}
  catch(error){modal.remove();throw error}
 }
 return section;
}
