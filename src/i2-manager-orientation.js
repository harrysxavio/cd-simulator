import {I2_AREAS} from './i2-product-contract.js';
import {i2WhySkuAndDays} from './i2-picking-bom.js';

/** Read-only manager orientation; pedagogical text never opens a physical replay. */
export const I2_MANAGER_CHAPTERS=Object.freeze([
 Object.freeze({
  id:'rol',title:'1 · Ser gerente de un CD',
  body:'¡Bienvenido! Yo soy Nico. Como gerente, tu trabajo no consiste solo en mover cajas: debes equilibrar pedidos a tiempo, stock disponible, capacidad, esperas y dinero. Una mejora en una sola área puede generar una cola en otra.',
  question:'¿Qué preferirías revisar primero: servicio, tiempo o gasto?'
 }),
 Object.freeze({
  id:'ruta',title:'2 · El viaje de un pedido',
  body:'Comercial estima pedidos, Planificación calcula necesidades y Compras elige proveedor. Luego Recepción registra lo que llega, Calidad libera lotes, Inventario localiza productos, Picking reúne un pedido completo y Transporte lo expide. Cada paso depende del anterior.',
  question:'¿En qué punto podría quedar esperando una caja?'
 }),
 Object.freeze({
  id:'decidir',title:'3 · Tus ocho decisiones',
  body:'Primero formarás un plan, una decisión por área. No conocemos todavía los pedidos reales y no existe una alternativa correcta para todas las campañas. Observa los supuestos y qué riesgo o recurso aceptas; después de la sorpresa, las compras originales no se reescriben.',
  question:'¿Cómo sabrás si reforzar una operación realmente ayuda a las demás?'
 }),
 Object.freeze({
  id:'sku',title:'4 · Tres SKU y doce días',
  body:'En esta muestra hay tres productos diferentes. Cada pedido exige cierta combinación de ellos: si falta solo una pieza, el pedido completo puede esperar. Observamos desde el día 0 hasta el corte del día 12 para que importen los plazos, las colas y la recuperación; una compra que llega el día 13 no rescata el servicio dentro de la misión.',
  question:'¿Qué ocurre con un pedido combinado si tenemos A pero no B?'
 }),
 Object.freeze({
  id:'indicadores',title:'5 · El tablero del gerente',
  body:'Revisarás pedidos que salieron del CD, unidades verificables, capacidad diaria, esperas y gastos adicionales modelados. Ojo: capacidad no es productividad por persona-hora, y no conocemos el costo operacional completo. Salir del CD tampoco demuestra que el consumidor ya recibió el paquete.',
  question:'¿Un despacho alto sigue siendo una buena decisión si el gasto adicional fue excesivo?'
 }),
 Object.freeze({
  id:'crisis',title:'6 · Sorpresa y recuperación',
  body:'Cuando aparezca la demanda real, compara primero qué cambió con tu plan. Una medida urgente puede costar dinero y aun así no alcanzar a mejorar nada. Aprenderemos a revisar plazo, producto, capacidad y presupuesto. En fases posteriores podrás combinar varias palancas compatibles en una sola evaluación.',
  question:'¿Qué comprobarías antes de ordenar una compra urgente?'
 }),
 Object.freeze({
  id:'cierre',title:'7 · Aprender del resultado',
  body:'Al terminar, compara no intervenir con lo que elegiste: servicio, faltantes, colas y costo incremental. No busques una única respuesta ganadora; busca decisiones que puedas justificar. Podrás repetir el caso con la misma demanda y aprender de otros caminos.',
  question:'¿Qué cambiarías sin empeorar un indicador que ya funcionaba bien?'
 })
]);
export function i2ManagerOrientation(){
 const sku=i2WhySkuAndDays();
 return Object.freeze({
  scope:'educational',chapters:I2_MANAGER_CHAPTERS,
  areaTitles:Object.freeze(I2_AREAS.map(a=>a.title)),
  skuExample:sku.templates.find(t=>t.id==='combo'),
  horizonDays:sku.horizonDays,
  disclaimer:'Tutorial opcional. No altera tu semilla, tus elecciones, el motor físico ni el resultado.'
 });
}
