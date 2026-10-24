import {I2_AREAS} from './i2-product-contract.js';
import {normalizeI2GameState} from './i2-game-state.js';

/** I2-12 · Optional, read-only character. Never runs the SKU engine. */
export const I2_GUIDE_KEY='supply-lab-i2-guide-v1';
export const I2_GUIDE_NAME='Nico';
const AREA_HINTS=Object.freeze({
 commercial:'Pronostica con lo que sabes hoy: aún no conocemos los pedidos reales.',
 planning:'La cobertura comprometida no se convierte automáticamente en stock disponible.',
 purchasing:'Proveedor confiable no significa mercadería recibida el mismo día.',
 receiving:'Sin capacidad de recepción, lo que llega puede quedar esperando.',
 quality:'Un lote retenido puede liberarse más tarde; no lo trates como merma inmediata.',
 inventory:'Reubicar stock no crea nuevas unidades físicas en el CD.',
 picking:'Un pedido preparado todavía necesita capacidad para salir del centro.',
 transport:'Expedir desde el CD no prueba que el cliente ya recibió su pedido.'
});
export function i2GuideHint(raw){
 const s=normalizeI2GameState(raw);
 if(!s)throw new Error('I2-12: estado inválido');
 const hint=s.phase==='intro'?'Tu desafío es aprender a decidir, no encontrar una opción mágica.'
 :s.phase==='area'?AREA_HINTS[I2_AREAS[s.index].id]
 :s.phase==='reveal'?'Tu planificación ya quedó confirmada: revelar no permitirá rehacer compras.'
 :s.phase==='recover'?'Una intervención puede tener costo sin recuperar pedidos antes del corte.'
 :s.phase==='review'?'Estas decisiones son el plan original: consúltalas sin reescribirlas.'
 :'Fíjate en expedidos y pendientes, y recuerda que los costos son parciales.';
 return Object.freeze({name:I2_GUIDE_NAME,text:hint});
}
export function readI2GuidePreference(storage){
 try{return storage.getItem(I2_GUIDE_KEY)==='shown'}catch{return false}
}
export function saveI2GuidePreference(storage,shown){
 if(typeof shown!=='boolean')throw new Error('I2-12: preferencia inválida');
 storage.setItem(I2_GUIDE_KEY,shown?'shown':'hidden');
 return shown;
}
