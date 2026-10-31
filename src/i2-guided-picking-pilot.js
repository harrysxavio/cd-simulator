/**
 * I2-35.2 · ARC-06 guided pilot.
 * This uses the existing canonical demand seed and its tested Picking SKU/day cap.
 * It is a discoverable preset, not a sixth shock seed or a new simulation engine.
 * Never calculate or disclose actual demand before the explicit game reveal.
 */
import {normalizeI2GameState} from './i2-game-state.js';
import {i2MvpPhysicalResult} from './i2-mvp-adapter.js';

export const I2_PICKING_PILOT=Object.freeze({
 id:'ARC-06-PILOT',seed:'alpha-case-04',
 fixedKnownCapSkuPerDay:10,
 title:'Reto guiado · Picking limitado',
 intent:'Identificar una restricción real antes de gastar en una solución que podría no ayudar.',
 limitation:'Piloto de diagnóstico: el tope conocido se configura antes de planificar. Quitar el tope es un contrafactual, no una intervención ejecutable durante el evento.'
});

export function i2IsPickingPilot(raw){
 return !!raw&&raw.seed===I2_PICKING_PILOT.seed&&
  raw.advanced?.pickingLimitSkuPerDay==='10';
}

/** Transactional, pre-confirmation-only preset. The schema and save key remain unchanged. */
export function i2StartPickingPilot(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='intro'||state.confirmedAreas.length)
  throw new Error('I2-35.2: entrenamiento solo antes de confirmar áreas');
 return normalizeI2GameState({...state,seed:I2_PICKING_PILOT.seed,
  advanced:{...state.advanced,pickingLimitSkuPerDay:'10'}});
}

/** Restores the original starting case, without changing other advanced inputs. */
export function i2LeavePickingPilot(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='intro'||state.confirmedAreas.length)
  throw new Error('I2-35.2: no se puede cambiar una misión confirmada');
 return normalizeI2GameState({...state,seed:'alpha-case-01',
  advanced:{...state.advanced,pickingLimitSkuPerDay:'base'}});
}

/**
 * Post-result laboratory: SAME plan/seed/POs, only the physical constraint
 * removed counterfactually. Not a real recovery action or forecast.
 */
export function i2PickingPilotReflection(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='result'||!state.reveal||!i2IsPickingPilot(state))
  throw new Error('I2-35.2: reflexión disponible después del resultado del reto');
 const args={seed:state.seed,choices:state.choices,
  urgentArrivalDay:state.arrivalDay,purchaseCoveragePercent:state.coverage,option:'wait'};
 const restricted=i2MvpPhysicalResult({...args,advanced:state.advanced});
 const counterfactual=i2MvpPhysicalResult({...args,
  advanced:{...state.advanced,pickingLimitSkuPerDay:'base'}});
 if(restricted.actualOrders!==counterfactual.actualOrders||
  JSON.stringify(restricted.originalPurchaseOrders)!==
  JSON.stringify(counterfactual.originalPurchaseOrders))
  throw new Error('I2-35.2: comparación cambió demanda o compras iniciales');
 const extra=counterfactual.shippedOrders-restricted.shippedOrders;
 return Object.freeze({
  actualOrders:restricted.actualOrders,
  restrictedDispatched:restricted.shippedOrders,
  unrestrictedDispatched:counterfactual.shippedOrders,
  potentialDifferenceOrders:extra,
  capSkuPerDay:I2_PICKING_PILOT.fixedKnownCapSkuPerDay,
  knownCondition:'La infraestructura de Picking dispone de solo 10 unidades SKU por jornada en este ejercicio.',
  finding:extra>0
   ?'El tope físico redujo las expediciones en '+extra+' pedidos del plan original.'
   :'Quitar este tope no aumentó las expediciones en tu plan. Otra restricción también puede estar limitando.',
  question:'¿Autorizarías una intervención costosa sin demostrar antes que modifica el límite efectivo?',
  boundary:'Comparación retrospectiva entre dos condiciones de infraestructura, NO una acción posible después de conocer la demanda. Expedición desde el CD no es entrega al consumidor.'
 });
}
