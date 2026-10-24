import {I2_PRODUCT_SCOPE,I2_AREAS} from './i2-product-contract.js';
import {I2_MVP_CASE} from './i2-mvp-adapter.js';
import {normalizeI2GameState} from './i2-game-state.js';

/**
 * I2-13 · Presentation-only briefing, derived exclusively from public
 * planning configuration. Never read demand, receipts, ledgers or results.
 */
export function i2FirstMissionBriefing(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='intro')throw new Error('I2-13: briefing fuera de portada');
 const confirmed=state.confirmedAreas.length;
 const continuing=confirmed>0;
 const intro={
  title:'Hoy tú diriges el centro de distribución.',
  role:'Tu rol: jefe o jefa del CD',
  meaning:'Un centro de distribución (CD) recibe, organiza, prepara y despacha pedidos.',
  objective:'Tu misión es tomar decisiones con información incompleta y aprender de sus consecuencias.',
  plannedOrders:I2_MVP_CASE.plannedOrders,
  quickFacts:Object.freeze([
   Object.freeze({value:String(I2_AREAS.length),label:'áreas'}),
   Object.freeze({value:String(I2_PRODUCT_SCOPE.skuIds.length),label:'tipos de producto'}),
   Object.freeze({value:String(I2_PRODUCT_SCOPE.horizonDays),label:'días de simulación'})
  ]),
  steps:Object.freeze([
   'Elige una alternativa por área, de Comercial a Transporte.',
   'Descubre la demanda real cuando tu plan ya esté cerrado.',
   'Responde al imprevisto y revisa qué ocurrió.'
  ]),
  continuing,
  confirmed,
  action:continuing?'Continuar mi plan →':'Comenzar misión →',
  resumeLabel:continuing?confirmed+' de '+I2_AREAS.length+' decisiones ya confirmadas':null,
  warning:'Caso ficticio: no genera compras, costos ni despachos reales.'
 };
 return Object.freeze(intro);
}
