import {i2CdSceneFor,I2_CD_AREA_ORDER,I2_CD_ART} from '../src/i2-cd-isometric-art.js';

/**
 * I2-36: solo DOM editorial. Nunca lee ni escribe partidas, KPI ni simulaciones.
 * Todas las imágenes usan carga diferida y dejan contenido comprensible si fallan.
 */
function el(tag,klass='',value=''){
 const node=document.createElement(tag);
 if(klass)node.className=klass;
 if(value)node.textContent=value;
 return node;
}

function cdImage(scene,{eager=false}={}){
 const img=el('img','cd-iso-image');
 img.src=scene.src;
 img.alt=scene.alt;
 img.loading=eager?'eager':'lazy';
 img.decoding='async';
 img.setAttribute('fetchpriority',eager?'auto':'low');
 img.addEventListener('error',()=>{
  // Explicar el flujo aunque falle una imagen. Nunca buscar otro archivo ficticio.
  img.hidden=true;
  const fallback=el('span','cd-iso-fallback',
   'Ilustración no disponible. '+scene.meaning);
  img.replaceWith(fallback);
 });
 return img;
}

/** Ampliación accesible, opcional; al cerrar devuelve el foco al botón. */
export function openI2CdSceneDialog(key,source){
 if(!(source instanceof HTMLElement))throw new Error('I2-36: origen visual inválido');
 const scene=i2CdSceneFor(key);
 const dialog=el('dialog','cd-iso-dialog');
 dialog.setAttribute('aria-labelledby','cd-iso-dialog-title');
 const header=el('div','cd-iso-dialog-head');
 const title=el('h2','',scene.title);title.id='cd-iso-dialog-title';
 const close=el('button','cd-iso-dialog-close','Cerrar imagen');
 close.type='button';close.setAttribute('aria-label','Cerrar ilustración y volver al juego');
 close.addEventListener('click',()=>dialog.close());
 header.append(title,close);
 const image=cdImage(scene,{eager:true});
 image.classList.add('cd-iso-dialog-image');
 dialog.append(header,image,el('p','note',scene.meaning),
  el('p','footnote','Nico pregunta: '+scene.question));
 let closed=false;
 dialog.addEventListener('close',()=>{
  if(closed)return;closed=true;dialog.remove();
  if(source.isConnected)source.focus({preventScroll:true});
 },{once:true});
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||
     event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
 });
 document.body.append(dialog);
 try{dialog.showModal();close.focus({preventScroll:true})}
 catch(error){dialog.remove();throw error}
 return dialog;
}

/**
 * Compacto: no desplaza las alternativas de decisión en teléfono.
 * Tutorial: mapa didáctico más amplio, siempre dentro de la ventana Nico.
 */
export function renderI2CdScene(key,{variant='compact',showQuestion=false}={}){
 if(!['compact','tutorial','monitor'].includes(variant))
  throw new Error('I2-36: variante visual inválida');
 const scene=i2CdSceneFor(key);
 const card=el('section','cd-iso-card cd-iso-'+variant);
 card.dataset.cdScene=key;
 const art=el('div','cd-iso-art');
 art.append(cdImage(scene));
 const copy=el('div','cd-iso-copy');
 const title=el('strong','cd-iso-title',scene.title);
 const meaning=el('p','cd-iso-meaning',scene.meaning);
 const action=el('button','cd-iso-expand','Ampliar escena');
 action.type='button';
 action.setAttribute('aria-haspopup','dialog');
 action.setAttribute('aria-label','Ampliar ilustración de '+scene.title);
 action.addEventListener('click',()=>openI2CdSceneDialog(key,action));
 copy.append(title,meaning);
 if(showQuestion)copy.append(el('p','cd-iso-question','Nico: '+scene.question));
 if(key==='monitoring')copy.append(el('p','cd-iso-boundary',
  'Los indicadores dibujados son ilustrativos. Los KPI de tu partida se calculan por separado.'));
 copy.append(action);
 card.append(art,copy);
 return card;
}

/** Etiquetas externas accesibles; nunca colocar hotspots arbitrarios en el arte. */
export function renderI2CdRoute(){
 const section=el('nav','cd-iso-route');
 section.setAttribute('aria-label','Recorrido conceptual de las ocho áreas del CD');
 const caption=el('p','cd-iso-route-caption','Del pronóstico al despacho:');
 const flow=el('ol','cd-iso-route-list');
 for(const key of I2_CD_AREA_ORDER){
  const item=el('li','',I2_CD_ART[key].title);
  item.dataset.kind=I2_CD_ART[key].kind;
  flow.append(item);
 }
 section.append(caption,flow,
  el('p','footnote','Comercial, Planificación y Compras son funciones de gestión; las demás etapas representan operaciones físicas.'));
 return section;
}
