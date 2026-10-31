import {I2_NICO_MANAGER_TOUR} from '../src/i2-nico-manager-learning.js';
import {I2_NICO_LEVELS} from '../src/i2-nico-tutorial.js';

/**
 * I2-36.3: seven short, sequential managerial teaching steps in a real dialog.
 * Never reads actual demand, the exogenous seed, physical replay or results.
 * This is not a second game; it is a temporary modal layer that restores focus.
 */
export function openI2NicoJourney({source,portraitSrc='./nico.svg',level='novato',
 onLevel=()=>{},onStart=null}={}){
 if(!(source instanceof HTMLElement))throw new Error('I2-36: launcher required');
 const dialog=document.createElement('dialog');
 dialog.className='nico-journey-dialog';
 dialog.setAttribute('aria-labelledby','nico-journey-title');
 dialog.setAttribute('aria-describedby','nico-journey-progress');
 const build=(tag,cls='',text='')=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  el.textContent=text;return el;
 };
 let index=0,closed=false;
 const head=build('header','nico-journey-head');
 const close=build('button','nico-journey-close','Cerrar');
 close.type='button';close.setAttribute('aria-label','Cerrar el tutorial de Nico y volver al juego');
 const progress=build('p','nico-journey-progress');progress.id='nico-journey-progress';
 const content=build('section','nico-journey-body');
 const nav=build('footer','nico-journey-actions');
 const back=build('button','nico-journey-back','← Anterior');
 const next=build('button','nico-journey-next','Siguiente →');
 const skip=build('button','nico-journey-skip','Saltar y volver al juego');
 for(const btn of [back,next,skip])btn.type='button';
 const picture=build('img','nico-journey-portrait');
 picture.src=portraitSrc;picture.alt='Nico, tu mentor de operaciones';
 picture.width=160;picture.height=176;picture.decoding='async';
 picture.addEventListener('error',()=>{
  if(picture.getAttribute('src')!=='./nico.svg')picture.src='./nico.svg';
 });
 const avatar=build('div','nico-journey-art');avatar.append(picture);
 const title=build('h2','nico-journey-title');title.id='nico-journey-title';
 const controls=build('div','nico-journey-level');
 const lbl=build('label','', 'Profundidad de la explicación');
 const select=build('select');select.id='nicoLevel';lbl.htmlFor=select.id;
 for(const item of I2_NICO_LEVELS){
  const option=build('option','',item.label);
  option.value=item.id;option.selected=level===item.id;select.append(option);
 }
 select.addEventListener('change',()=>{level=select.value;onLevel(level);draw()});
 controls.append(lbl,select);
 head.append(progress,close);
 nav.append(back,next,skip);
 dialog.append(head,avatar,title,content,controls,nav);
 const stop=()=>{
  if(closed)return;closed=true;dialog.remove();
  if(source.isConnected)source.focus({preventScroll:true});
 };
 close.addEventListener('click',()=>dialog.close());
 skip.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',stop,{once:true});
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const r=dialog.getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||
     event.clientY<r.top||event.clientY>r.bottom)dialog.close();
 });
 function draw(){
  const part=I2_NICO_MANAGER_TOUR[index];
  progress.textContent='PASO '+(index+1)+' DE '+I2_NICO_MANAGER_TOUR.length;
  title.textContent=part.title.replace(/^\d+\.\s*/,'');
  content.replaceChildren();
  const bubble=build('p','nico-journey-bubble',part.body);
  const example=build('p','nico-journey-example','Imagina esto: '+part.example.replace(/^Ejemplo(?: didáctico basado en el catálogo)?:\s*/i,''));
  const question=build('p','nico-journey-question','Pregunta de gerente: '+part.watch);
  content.append(bubble,example,question);
  if(level==='avanzado'||level==='intermedio'){
   const depth=build('details','nico-journey-depth');
   const summary=build('summary','','¿Qué ocurre en la operación y el cliente?');
   depth.append(summary,build('p','',part.consumer));
   if(level==='avanzado')depth.open=true;
   content.append(depth);
  }
  back.disabled=index===0;
  next.textContent=index===I2_NICO_MANAGER_TOUR.length-1?'Terminar y volver al juego':'Siguiente →';
 }
 back.addEventListener('click',()=>{
  if(index>0){index--;draw();title.focus({preventScroll:true})}
 });
 next.addEventListener('click',()=>{
  if(index<I2_NICO_MANAGER_TOUR.length-1){
   index++;draw();title.focus({preventScroll:true});
  }else dialog.close();
 });
 title.tabIndex=-1;
 draw();
 document.body.append(dialog);
 try{dialog.showModal();next.focus({preventScroll:true})}
 catch(error){dialog.remove();throw error}
 return dialog;
}
