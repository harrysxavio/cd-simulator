import {i2CdSceneFor} from '../src/i2-cd-isometric-art.js';
import {i2NicoManagerGuide} from '../src/i2-nico-manager-learning.js';

/**
 * Lab14: vista de aprendizaje independiente de la pantalla de decisión.
 * No lee ni modifica partidas, demanda, compras ni indicadores calculados.
 */
export function openI2CdAreaGuide(areaId,{source,level='novato'}={}){
 if(!(source instanceof HTMLElement))throw new Error('Guía CD: origen inválido');
 const scene=i2CdSceneFor(areaId);
 const guide=i2NicoManagerGuide(areaId,level);
 const elem=(kind,cls='',text='')=>{
  const e=document.createElement(kind);e.className=cls;e.textContent=text;return e;
 };
 const modal=elem('dialog','i2-cd-area-guide-dialog');
 modal.setAttribute('aria-labelledby','i2-cd-area-title');
 const header=elem('header','i2-cd-area-guide-head');
 const titles=elem('div','');
 const title=elem('h2','',scene.title);title.id='i2-cd-area-title';
 titles.append(elem('span','i2-cd-area-eyebrow','EXPLORA TU CENTRO DE DISTRIBUCIÓN'),title);
 const close=elem('button','i2-cd-area-guide-close','Volver a la decisión');
 close.type='button';close.setAttribute('aria-label','Cerrar explicación del área y volver a la decisión');
 close.addEventListener('click',()=>modal.close());
 header.append(titles,close);
 const illustration=elem('div','i2-cd-area-guide-visual');
 const img=elem('img','i2-cd-area-guide-image');
 img.src=scene.src;img.alt=scene.alt;img.loading='lazy';img.decoding='async';
 img.addEventListener('error',()=>img.replaceWith(elem('p','note',
  'La imagen no se pudo cargar. '+scene.meaning)));
 illustration.append(img,elem('p','note',scene.meaning));
 const stages=[
  ['Qué ocurre aquí',guide.job],
  ['Qué decides tú como gerente',guide.controls],
  ['Qué indicador deberías vigilar',guide.metrics],
  ['Qué puede fallar y por qué',guide.risks],
  ['Ejemplo para entenderlo',guide.example],
  ['Pregunta de Nico antes de elegir',guide.question]
 ];
 const details=elem('div','i2-cd-area-guide-topics');
 for(const [heading,body] of stages){
  const card=elem('section','i2-cd-area-guide-topic');
  card.append(elem('strong','',heading),elem('p','',body));details.append(card);
 }
 modal.append(header,illustration,details,
  elem('p','footnote','Estas imágenes ayudan a comprender el proceso; las cifras y la capacidad de tu partida se calculan aparte.'));
 modal.addEventListener('close',()=>{
  modal.remove();if(source.isConnected)source.focus({preventScroll:true});
 },{once:true});
 document.body.append(modal);
 try{modal.showModal();close.focus({preventScroll:true})}
 catch(error){modal.remove();throw error}
 return modal;
}
