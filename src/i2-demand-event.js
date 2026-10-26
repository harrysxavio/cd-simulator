import {I2_AREAS} from './i2-product-contract.js';
import {normalizeI2GameState} from './i2-game-state.js';
import {i2ChallengeForSeed,i2ChallengeReveal} from './i2-challenge-config.js';

const fail=detail=>{throw new Error('I2-26: '+detail)};
const freezeDeep=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(freezeDeep);
  Object.freeze(value);
 }
 return value;
};

/**
 * Validate the eight committed steps without asking the simulation to run.
 * The seed identifies an externally fixed didactic case, not a secure secret:
 * a player could inspect public source code. This is pedagogical fairness,
 * not a cryptographic commitment.
 */
function committed(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.confirmedAreas.length!==I2_AREAS.length
  ||state.confirmedAreas.some((id,i)=>id!==I2_AREAS[i].id))
  fail('se requiere el plan confirmado de las ocho áreas');
 if(!['reveal','recover','review','result'].includes(state.phase))
  fail('no hay evento de sorpresa disponible');
 return state;
}

/**
 * Before the single explicit reveal, return ONLY known metadata and the
 * planned sample. Never expose shock sign, magnitude or real order counts.
 * The precommitted seed must remain unchanged after the first confirmation.
 */
export function i2DemandEventSealed(raw){
 const state=committed(raw);
 if(state.reveal||state.phase!=='reveal')
  fail('la lectura previa solo existe antes de revelar');
 const selected=i2ChallengeForSeed(state.seed);
 return freezeDeep({
  phase:'pre-reveal',scope:'sku-cohort',horizonDays:12,
  plannedOrders:state.advanced.plannedOrders,
  missionLabel:selected.label,level:selected.level,
  planLocked:true,canReveal:true,
  headline:'Tu plan quedó confirmado. La demanda sorpresa sigue sellada.',
  why:'Este reto y el tamaño de muestra se eligieron antes de la primera decisión. Las ocho áreas quedan registradas; una sorpresa de demanda externa no se ajusta a tus elecciones.',
  limitation:'La semilla y los escenarios didácticos están en el código público. Esto demuestra reproducibilidad del juego, no secreto criptográfico.',
  source:'semilla persistente I2, catálogo I2_CHALLENGES y state.advanced.plannedOrders'
 });
}

/**
 * After the sole reveal, disclose the fixed event (not simulated performance).
 * Deliberately ignore choices, recovery, budgets and score: a poor plan cannot
 * increase the shock, and a good plan cannot make it disappear.
 */
export function i2DemandEventObserved(raw){
 const state=committed(raw);
 if(!state.reveal||!['recover','review','result'].includes(state.phase))
  fail('no se pueden consultar pedidos observados antes de revelar');
 const fixed=i2ChallengeReveal(state.seed,state.advanced.plannedOrders);
 const deviation=fixed.actualOrders-fixed.plannedOrders;
 if(!Number.isSafeInteger(deviation)||fixed.actualOrders<1)
  fail('evento no concilia con la cohorte planificada');
 return freezeDeep({
  phase:'post-reveal',scope:'sku-cohort',horizonDays:12,
  missionSeed:state.seed,plannedOrders:fixed.plannedOrders,
  observedOrders:fixed.actualOrders,varianceOrders:deviation,
  shockPercent:fixed.shockPercent,
  direction:deviation>0?'up':deviation<0?'down':'same',
  heading:fixed.heading,context:fixed.context,
  teaching:'La demanda observada se fijó por el reto, no por tu desempeño. Un mismo reto con igual tamaño de muestra repetirá esta sorpresa aun si cambias todas las decisiones.',
  boundary:'Son pedidos de una muestra didáctica. El evento externo no es una métrica de servicio: pedidos expedidos, pendientes, gasto y tiempos se calculan por separado con el motor físico después de revelar.',
  source:'I2_CHALLENGES[seed] / i2ChallengeReveal; comparación con la cohorte planificada. No depende de choices, recovery ni presupuesto.'
 });
}
