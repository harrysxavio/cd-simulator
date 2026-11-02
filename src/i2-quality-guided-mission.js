/**
 * I2-35.2 · Segundo reto guiado, ARC-05: Calidad y stock reducido.
 * Reutiliza el motor SKU canónico. El resultado alternativo solo se obtiene
 * después del cierre y NO modifica las decisiones que tomó el jugador.
 */
import {normalizeI2GameState} from './i2-game-state.js';
import {i2MvpPhysicalResult} from './i2-mvp-adapter.js';

export const I2_QUALITY_GUIDED=Object.freeze({
 id:'ARC-05-GUIDED',
 scenario:'quality-low-stock',
 seed:'alpha-case-01',
 title:'Reto guiado · Calidad y disponibilidad',
 intent:'Distinguir el inventario retenido de los pedidos que realmente pueden salir del CD.',
 boundary:'La comparación cambia una política de Calidad antes de ejecutar el plan; no es una acción retroactiva ni representa mercadería rechazada.'
});

export function i2IsQualityGuided(raw){
 return raw?.guidedScenario===I2_QUALITY_GUIDED.scenario;
}

/** Solo puede activarse antes de comprometer un área; el evento es excluyente. */
export function i2StartQualityGuided(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='intro'||state.confirmedAreas.length||state.eventSeed)
  throw new Error('I2-35.2: inicia Calidad antes de confirmar áreas y sin incidente');
 return normalizeI2GameState({...state,
  seed:I2_QUALITY_GUIDED.seed,
  advanced:{...state.advanced,stockProfile:'low',pickingLimitSkuPerDay:'base'},
  guidedScenario:I2_QUALITY_GUIDED.scenario
 });
}

/** La vuelta a la misión inicial no borra otras preferencias avanzadas. */
export function i2LeaveQualityGuided(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='intro'||state.confirmedAreas.length||!i2IsQualityGuided(state))
  throw new Error('I2-35.2: reto de Calidad confirmado o no activo');
 const {guidedScenario,...previous}=state;
 return normalizeI2GameState({...previous,seed:'alpha-case-01',
  advanced:{...state.advanced,stockProfile:'standard'}});
}

/**
 * Comparación transparente del plan original sin recuperación.
 * Si Calidad ya era prioritaria, contrasta con capacidad limitada.
 * Si no, contrasta con priorización. No supone que liberar más SKU
 * necesariamente aumentará los pedidos expedidos.
 */
export function i2QualityGuidedReflection(raw){
 const state=normalizeI2GameState(raw);
 if(!state||!i2IsQualityGuided(state)||state.phase!=='result'||!state.reveal||
  state.eventSeed)
  throw new Error('I2-35.2: reflexión de Calidad solo después del resultado');
 const chosen=state.choices.quality;
 const alternative=chosen==='priority'?'slow':'priority';
 const common={seed:state.seed,advanced:state.advanced,
  urgentArrivalDay:state.arrivalDay,
  purchaseCoveragePercent:state.coverage,option:'wait'};
 const actual=i2MvpPhysicalResult({...common,choices:state.choices});
 const counterfactual=i2MvpPhysicalResult({...common,
  choices:{...state.choices,quality:alternative}});
 if(actual.actualOrders!==counterfactual.actualOrders||
  JSON.stringify(actual.originalPurchaseOrders)!==
  JSON.stringify(counterfactual.originalPurchaseOrders))
  throw new Error('I2-35.2: el contraste de Calidad cambió demanda o compras originales');
 const shippedDelta=counterfactual.shippedOrders-actual.shippedOrders;
 const heldDelta=counterfactual.quality.totals.peakHeldSkuUnits-
  actual.quality.totals.peakHeldSkuUnits;
 return Object.freeze({
  chosenQuality:chosen,alternativeQuality:alternative,
  actualOrders:actual.actualOrders,
  chosenHeldSku:actual.quality.totals.peakHeldSkuUnits,
  alternativeHeldSku:counterfactual.quality.totals.peakHeldSkuUnits,
  chosenShipped:actual.shippedOrders,alternativeShipped:counterfactual.shippedOrders,
  heldDelta,shippedDelta,
  finding:shippedDelta===0
   ?'Cambiar la política de Calidad no modificó los pedidos expedidos en este plan. Otro cuello puede estar limitando el resultado.'
   :shippedDelta>0
    ?'La política alternativa expediría '+shippedDelta+' pedidos más en este plan, sujeto al resto de capacidades.'
    :'La política alternativa expediría '+Math.abs(shippedDelta)+' pedidos menos en este plan.',
  question:'¿La mejora de un indicador local justifica su costo si el servicio final no cambia?',
  boundary:I2_QUALITY_GUIDED.boundary+
   ' Se observa el plan original sin recuperación; las acciones posteriores no forman parte de este contraste. Expedición del CD no equivale a entrega al cliente.'
 });
}
