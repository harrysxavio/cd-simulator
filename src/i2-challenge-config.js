/**
 * I2-14 · Catálogo didáctico de retos exógenos.
 * Una semilla identifica un caso físico predeterminado ANTES de cualquier decisión.
 * La interfaz oculta el signo/magnitud hasta la revelación explícita.
 * Las cifras son simuladas, nunca corresponden a una tarifa o SLA real.
 */
export const I2_DEFAULT_SEED='alpha-case-01';
export const I2_CHALLENGES=Object.freeze([
 Object.freeze({seed:'alpha-case-01',level:'Inicial',label:'Misión 1 · Aprender a decidir',shockPercent:40}),
 Object.freeze({seed:'alpha-case-02',level:'Inicial',label:'Misión 2 · Nuevo turno',shockPercent:10}),
 Object.freeze({seed:'alpha-case-03',level:'Intermedio',label:'Misión 3 · Ajustar recursos',shockPercent:-15}),
 Object.freeze({seed:'alpha-case-04',level:'Avanzado',label:'Misión 4 · Alta presión',shockPercent:50}),
 Object.freeze({seed:'alpha-case-05',level:'Avanzado',label:'Misión 5 · Cuidar el gasto',shockPercent:-35})
]);

/** Nunca se calcula la demanda desde opciones, puntuaciones o presupuesto. */
export function i2ChallengeForSeed(seed=I2_DEFAULT_SEED){
 const challenge=I2_CHALLENGES.find(item=>item.seed===seed);
 if(!challenge)throw new Error('I2-14: semilla de reto inválida');
 return challenge;
}

/** Texto posterior a la revelación; no invocar en portada ni planificación. */
export function i2ChallengeReveal(seed=I2_DEFAULT_SEED,plannedOrders=200){
 const {shockPercent}=i2ChallengeForSeed(seed);
 if(!Number.isSafeInteger(plannedOrders)||plannedOrders<1)throw new Error('I2-14: muestra inválida');
 const actualOrders=Math.round(plannedOrders*(100+shockPercent)/100);
 return Object.freeze({
  shockPercent,plannedOrders,actualOrders,
  heading:shockPercent>=0
   ?'¡La demanda aumentó un '+shockPercent+' %!'
   :'¡La demanda disminuyó un '+Math.abs(shockPercent)+' %!',
  context:shockPercent>=0
   ?'Revisa si el plan alcanza para atender más pedidos sin perder control del gasto.'
   :'Una demanda menor también exige gestionar sobrecapacidad, compras comprometidas y gasto.'
 });
}
