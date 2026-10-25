import {I2_AREAS} from './i2-product-contract.js';
import {normalizeI2GameState} from './i2-game-state.js';
import {i2GuideHint} from './i2-game-guide.js';

/**
 * Nico is a friendly human-style teaching character, NOT a game oracle.
 * He reads choices and phase only: no seed lookup, demand shock, physical replay,
 * sales forecast result, unknown real costs or behind-the-scenes outcomes.
 * Levels change the vocabulary, not the decisions or simulator difficulty.
 */
export const I2_NICO_LEVEL_KEY='supply-lab-i2-nico-level-v1';
export const I2_NICO_LEVELS=Object.freeze([
 Object.freeze({id:'novato',label:'Estoy aprendiendo'}),
 Object.freeze({id:'intermedio',label:'Conozco lo básico'}),
 Object.freeze({id:'avanzado',label:'Quiero el detalle técnico'})
]);
export const I2_NICO_DEFAULT_LEVEL='novato';

const AREA_COACHING=Object.freeze({
 commercial:{
  pose:'doubt',
  text:{
   novato:'Empecemos por una pregunta sencilla: ¿cuántos pedidos creemos que vendrán? No hace falta acertar a la primera.',
   intermedio:'El pronóstico es nuestra mejor estimación, no una promesa. Si lo movemos, Compras también podría cambiar.',
   avanzado:'Comparemos demanda prevista y demanda observada solo cuando toque. Ahora elegimos un supuesto, no un resultado.'
  },
  example:'Si esperamos pocas ventas y después llegan más, podríamos quedarnos cortos de productos. Si compramos de más, podría sobrar stock.',
  question:'¿Qué información de la campaña te ayudaría a elegir un pronóstico razonable?'
 },
 planning:{
  pose:'hint',
  text:{
   novato:'Ahora decidimos cuánto reponer. Comprar más puede darnos margen, pero también compromete más dinero.',
   intermedio:'Ya tenemos un pronóstico. La cobertura decide cuánto de esa necesidad intentaremos comprar.',
   avanzado:'Miremos cobertura, stock inicial y compras por SKU. Un compromiso alto sigue dependiendo de plazos y capacidad.'
  },
  example:'Imagina que faltan 10 unidades. Cubrir el 70 % significa pedir 7; un colchón aumenta el pedido, no el stock de hoy.',
  question:'¿Prefieres asumir el riesgo de quedarte corto o comprometer más inventario?'
 },
 purchasing:{
  pose:'explanation',
  text:{
   novato:'Aquí elegimos a quién comprarle. Ojo: que un proveedor acepte el pedido no significa que las cajas ya estén en el CD.',
   intermedio:'Vale la pena mirar dos cosas: cuánto podrá cumplir el proveedor y cuándo llegará al muelle.',
   avanzado:'Separemos la orden, el cumplimiento supuesto, la llegada y la recepción física. Son cuatro momentos distintos.'
  },
  example:'Un proveedor podría cumplir casi todo y aun así llegar tarde. Después, el equipo de Recepción necesita descargarlo.',
  question:'¿Qué te importa más en este escenario: asegurar unidades o asumir un mayor riesgo de faltantes?'
 },
 receiving:{
  pose:'analysis',
  text:{
   novato:'¡Las cajas llegaron! Pero todavía hay que descargarlas y registrarlas. Si el equipo no alcanza, se forma una fila.',
   intermedio:'La capacidad de Recepción decide cuántas unidades pasan del muelle a bodega cada jornada.',
   avanzado:'Una llegada al muelle crea una cola; solo un evento de recepción confirma unidades ingresadas al CD.'
  },
  example:'Si llegan 100 unidades y hoy solo podemos recibir 60, las otras 40 esperan. No podemos contarlas como disponibles.',
  question:'¿La capacidad de Recepción alcanza para el ritmo al que podrían llegar las compras?'
 },
 quality:{
  pose:'hint',
  text:{
   novato:'Recibir una caja no significa que ya podamos usarla. Calidad debe revisarla y liberarla.',
   intermedio:'El trabajo de Calidad puede dejar unidades esperando, aunque Recepción ya las haya ingresado.',
   avanzado:'Distingamos stock recibido, stock en revisión y stock liberado. Una espera no es automáticamente una pérdida.'
  },
  example:'Un lote puede estar en la bodega y seguir retenido hasta la revisión. Picking no debería usarlo antes.',
  question:'¿Qué pasaría si llegan muchas unidades justo cuando Calidad tiene poca capacidad?'
 },
 inventory:{
  pose:'analysis',
  text:{
   novato:'Ahora toca encontrar lo que tenemos. Una caja mal ubicada puede existir en bodega, pero no estar lista para preparar.',
   intermedio:'Tener stock no basta: hay que saber dónde está y cuánto podemos prometer con confianza.',
   avanzado:'El inventario físico y el stock verificable son diferentes. Conciliar mejora la promesa, no fabrica unidades.'
  },
  example:'Puedes tener 20 unidades en el CD, pero si no sabes dónde están todas, Picking quizá solo pueda contar con parte de ellas.',
  question:'¿Qué decisión te daría más confianza al prometer productos que luego habrá que preparar?'
 },
 picking:{
  pose:'explanation',
  text:{
   novato:'Ya casi estamos. Picking reúne los productos de cada pedido. Sin artículos suficientes, no puede terminar el paquete.',
   intermedio:'Reforzar Picking ayuda solo si hay stock liberado y después existe capacidad para despachar.',
   avanzado:'Compara unidades preparables por jornada con el mix SKU de pedidos completos y el cuello de botella siguiente.'
  },
  example:'Aunque el equipo pueda preparar 100 pedidos, si falta un producto para varios, esos pedidos seguirán pendientes.',
  question:'¿Aumentar preparación resolvería el problema o podría haber una restricción anterior?'
 },
 transport:{
  pose:'hint',
  text:{
   novato:'Última parada: sacar los pedidos del CD. Uno preparado todavía no cuenta como despachado.',
   intermedio:'No sirve preparar más si no tenemos capacidad para cargar y expedir lo que está listo.',
   avanzado:'Separa preparado, expedido desde el CD y entregado al cliente. Aquí solo podemos demostrar la salida física del CD.'
  },
  example:'Si hay 80 pedidos listos y caben 50 en la salida de hoy, 30 se quedan esperando el siguiente despacho.',
  question:'¿Cómo equilibrarías lo que prepara Picking con lo que realmente puede salir del CD?'
 }
});

const PHASE_COACHING=Object.freeze({
 intro:{
  pose:'welcome',
  text:'¡Hola! Soy Nico. Hoy vamos a dirigir este centro de distribución juntos, paso a paso. Tú decides; yo te doy pistas.',
  example:'Primero hacemos un plan, después descubrimos qué cambió y, por último, vemos cómo responder sin disparar los costos.',
  question:'¿Empezamos por conocer el CD y las decisiones que tienes a cargo?'
 },
 reveal:{
  pose:'alert',
  text:'¡Atención, hay novedades! Ya cerraste tu plan. Pronto sabremos si la demanda siguió lo que esperábamos.',
  example:'Como las compras originales ya quedaron definidas, no podemos cambiarlas como si hubiéramos sabido el futuro.',
  question:'Antes de descubrir el cambio, ¿qué parte de tu plan crees que podría quedar más exigida?'
 },
 recover:{
  pose:'recovery',
  text:'Ahora sí, toca responder. No te fijes solo en cuántos pedidos podrías recuperar: mira también lo que costará.',
  example:'Una compra urgente podría llegar después del último día de la misión. Pagar más no siempre ayuda a tiempo.',
  question:'¿La acción que estás pensando alcanza a tener efecto antes del cierre?'
 },
 review:{
  pose:'analysis',
  text:'Revisemos con calma lo que decidiste. Este es el plan que quedó firmado antes de conocer la sorpresa.',
  example:'Puedes comparar Compras, stock y capacidad, pero no cambiar hoy las órdenes que ya habías comprometido.',
  question:'¿Qué decisión te gustaría revisar para aprender de ella en la próxima partida?'
 },
 result:{
  pose:'analysis',
  text:'¡Buen trabajo llegando al cierre! Ahora viene lo más interesante: aprender de lo que funcionó y de lo que quedó pendiente.',
  example:'Despachar muchos pedidos es bueno, pero también importa cuánto costó mejorar. No tenemos un costo total auditado.',
  question:'Si jugaras otra vez, ¿qué cambiarías para equilibrar servicio, capacidad y gasto?'
 }
});
const TUTORIAL=Object.freeze({
 novato:Object.freeze([
  '1. Primero conoceremos ocho áreas del CD. Elige una alternativa en cada una; puedes pedirme una pista cuando quieras.',
  '2. Cuando termines tu plan, descubriremos una sorpresa de demanda. No necesitas adivinarla: se trata de aprender a reaccionar.',
  '3. Al final veremos qué pedidos salieron, cuáles quedaron pendientes y cuánto costaron las acciones extra.'
 ]),
 intermedio:Object.freeze([
  '1. Revisa cómo tu pronóstico cambia las compras y cómo las demás áreas pueden frenar el flujo.',
  '2. Cuando aparezca la sorpresa, observa los plazos: un pedido urgente no arregla los días que ya pasaron.',
  '3. Compara servicio y costo adicional antes de elegir. Mejorar uno no significa necesariamente mejorar el otro.'
 ]),
 avanzado:Object.freeze([
  '1. Contrasta los supuestos de cada área con el plan SKU físico: cantidades, capacidad, horizonte y compromisos.',
  '2. Al conocer la demanda, compara baseline y recuperación sin reescribir la compra original.',
  '3. Evalúa servicio, espera y gasto incremental; el costo total sigue desconocido si no hay datos contables completos.'
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
/**
 * Returns friendly advice plus example/question. Never runs the SKU engine,
 * accesses the challenge seed, future demand, baseline or private data.
 * The advice depends only on current phase/area and selected language level.
 */
export function i2NicoCoachTip(raw,level=I2_NICO_DEFAULT_LEVEL){
 const state=normalizeI2GameState(raw);
 if(!state)throw new Error('I2-16: estado inválido');
 i2ValidateNicoLevel(level);
 const name=i2GuideHint(state).name;
 const phase=state.phase;
 let tip;
 if(phase==='area'){
  const area=I2_AREAS[state.index].id;
  const lesson=AREA_COACHING[area];
  if(!lesson)throw new Error('Nico: área desconocida');
  tip={text:lesson.text[level],example:lesson.example,
   question:lesson.question,pose:lesson.pose};
 }else{
  tip=PHASE_COACHING[phase];
  if(!tip)throw new Error('Nico: fase desconocida');
 }
 return Object.freeze({name,...tip});
}
