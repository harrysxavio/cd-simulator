import {I2_AREAS} from './i2-product-contract.js';
import {normalizeI2GameState} from './i2-game-state.js';

/**
 * I2-11 · A read-only guide to four narrative chapters and eight operational
 * areas. No physical replay, no hidden demand or future recovery result.
 */
export const I2_CHAPTERS=Object.freeze([
 Object.freeze({number:1,title:'Prepararse',description:'Conoce tu rol y el centro de distribución.'}),
 Object.freeze({number:2,title:'Planificar',description:'Decide en las ocho áreas del CD.'}),
 Object.freeze({number:3,title:'Responder',description:'Analiza el imprevisto y elige una intervención.'}),
 Object.freeze({number:4,title:'Aprender',description:'Revisa las consecuencias del ejercicio.'})
]);

export function i2ProgressView(raw){
 const s=normalizeI2GameState(raw);
 if(!s)throw new Error('I2-11: estado de progreso inválido');
 const index=s.phase==='intro'?0:s.phase==='area'?1:s.phase==='result'?3:2;
 const areaCount=I2_AREAS.length;
 const confirmed=s.confirmedAreas.length;
 const progress=s.phase==='intro'?0
  :s.phase==='area'?10+confirmed*8
  :s.phase==='reveal'?78
  :s.phase==='result'?100:92;
 const areas=I2_AREAS.map((area,i)=>Object.freeze({
  id:area.id,title:area.title,number:i+1,
  status:s.confirmedAreas.includes(area.id)?'confirmada'
   :s.phase==='area'&&s.index===i?'actual':'pendiente'
 }));
 const current=s.phase==='area'
  ?'Área '+(s.index+1)+' de '+areaCount+' · '+I2_AREAS[s.index].title
  :s.phase==='intro'?'Introducción'
  :s.phase==='reveal'?'Plan confirmado; antes de revelar'
  :s.phase==='recover'?'Elegir intervención'
  :s.phase==='review'?'Revisión del plan cerrado'
  :'Conclusiones de campaña';
 return Object.freeze({
  chapter:index+1,chapterCount:4,
  chapterTitle:I2_CHAPTERS[index].title,
  chapterLabel:'Capítulo '+(index+1)+' de 4 · '+I2_CHAPTERS[index].title,
  current,
  confirmed,
  totalAreas:areaCount,
  percent:Math.max(0,Math.min(100,progress)),
  areas:Object.freeze(areas),
  mapParagraphs:Object.freeze([
   '1 · Prepararse: conoce tu papel y el escenario.',
   '2 · Planificar: '+areas.map(a=>a.number+'. '+a.title).join(' · ')+'.',
   '3 · Responder: interpreta el imprevisto y decide una recuperación.',
   '4 · Aprender: consulta expedidos, pendientes y límites del costo.',
   'Tu posición: '+current+'. Decisiones cerradas: '+confirmed+'/'+areaCount+'. El mapa es informativo y no permite saltar pasos.'
  ])
 });
}
