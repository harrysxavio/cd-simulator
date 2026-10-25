import {I2_AREAS} from './i2-product-contract.js';
import {normalizeI2GameState} from './i2-game-state.js';
import {i2GuideHint} from './i2-game-guide.js';

/**
 * I2-16 · Nico enseña, pero nunca evalúa ni lee el libro físico SKU.
 * El nivel solo cambia el lenguaje y la longitud de las explicaciones.
 */
export const I2_NICO_LEVEL_KEY='supply-lab-i2-nico-level-v1';
export const I2_NICO_LEVELS=Object.freeze([
 Object.freeze({id:'novato',label:'Estoy aprendiendo'}),
 Object.freeze({id:'intermedio',label:'Conozco lo básico'}),
 Object.freeze({id:'avanzado',label:'Quiero el detalle técnico'})
]);
export const I2_NICO_DEFAULT_LEVEL='novato';
const AREA_INTERMEDIATE=Object.freeze({
 commercial:'La calidad del pronóstico influye en cuánto planificas comprar.',
 planning:'Un plan exigente depende de abastecimiento y capacidad simultáneamente.',
 purchasing:'El proveedor condiciona cantidad disponible y fecha de llegada.',
 receiving:'El muelle puede retrasar unidades que el proveedor ya entregó.',
 quality:'Liberar mercancía no equivale a recibirla; son restricciones distintas.',
 inventory:'La exactitud afecta qué stock es seguro prometer para Picking.',
 picking:'La capacidad de preparación se mide antes del despacho.',
 transport:'Sin salida física del CD, un pedido preparado sigue pendiente.'
});
const AREA_ADVANCED=Object.freeze({
 commercial:'Distingue demanda prevista de demanda observada; no infieras causalidad.',
 planning:'Evalúa cobertura comprometida frente a disponibilidad y plazos reales.',
 purchasing:'Revisa fill rate del proveedor y lead time antes de inferir servicio.',
 receiving:'Contrasta SKU/día recibidos con unidades esperando en muelle.',
 quality:'Observa liberación temporal y stock retenido, no merma supuesta.',
 inventory:'Apertura SKU, reserva y stock verificable deben conciliar físicamente.',
 picking:'Un cuello de botella de SKU/día puede limitar pedidos completos.',
 transport:'La expedición no prueba entrega final ni costo logístico total.'
});
const TUTORIAL=Object.freeze({
 novato:Object.freeze([
  '1. Planifica: elige una opción por área. Puedes pedir una explicación antes de confirmar.',
  '2. Investiga: cuando cierres las ocho áreas, descubrirás una demanda distinta de la prevista.',
  '3. Recupera: compara pedidos expedidos, pendientes y gasto extra antes de cerrar.'
 ]),
 intermedio:Object.freeze([
  '1. Revisa pronóstico, compras, inventario y capacidad como una cadena conectada.',
  '2. Observa los efectos del plazo: la compra urgente no arregla días anteriores.',
  '3. Contrasta servicio y costo incremental: mejorar uno no garantiza mejorar ambos.'
 ]),
 avanzado:Object.freeze([
  '1. Formula hipótesis: cada decisión cambia supuestos del único motor SKU.',
  '2. Contrasta baseline y recuperación con compras originales congeladas.',
  '3. Audita unidades, horizonte de 12 días y costos parciales; sin costo total verificado.'
 ])
});
export function i2ValidateNicoLevel(level){
 if(!I2_NICO_LEVELS.some(x=>x.id===level))
  throw new Error('I2-16: nivel de Nico inválido');
 return level;
}
export function readI2NicoLevel(storage){
 try{return i2ValidateNicoLevel(storage.getItem(I2_NICO_LEVEL_KEY)||I2_NICO_DEFAULT_LEVEL)}
 catch{return I2_NICO_DEFAULT_LEVEL}
}
export function saveI2NicoLevel(storage,level){
 const safe=i2ValidateNicoLevel(level);
 storage.setItem(I2_NICO_LEVEL_KEY,safe);
 return safe;
}
export function i2NicoTutorial(level=I2_NICO_DEFAULT_LEVEL){
 return TUTORIAL[i2ValidateNicoLevel(level)];
}
/** Devuelve texto didáctico sin demanda real, expediciones, CLP ni replay. */
export function i2NicoCoachTip(raw,level=I2_NICO_DEFAULT_LEVEL){
 const state=normalizeI2GameState(raw);
 if(!state)throw new Error('I2-16: estado inválido');
 i2ValidateNicoLevel(level);
 if(level==='novato')return i2GuideHint(state);
 const base=i2GuideHint(state);
 if(state.phase!=='area')return base;
 const area=I2_AREAS[state.index].id;
 return Object.freeze({name:base.name,text:
  level==='intermedio'?AREA_INTERMEDIATE[area]:AREA_ADVANCED[area]});
}
