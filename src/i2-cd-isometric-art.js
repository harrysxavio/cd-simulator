/**
 * I2-36 · Catálogo editorial de imágenes reales del CD.
 * NO importa motores, partidas, demanda ni resultados; es solo una capa visual.
 * Los PNG originales viven una sola vez en juego/assets/cd-isometrico.
 */
const BASE='./assets/cd-isometrico/';
const record=(file,title,alt,meaning,question,kind)=>Object.freeze({
 file,src:BASE+file,title,alt,meaning,question,kind
});
export const I2_CD_ART=Object.freeze({
 overview:record('01_centro_logistico_completo.png','Tu centro de distribución',
  'Vista isométrica general del centro de distribución con espacios de gestión y procesos físicos.',
  'El producto llega, pasa por controles, se almacena, se prepara y se expide. La planificación y las decisiones coordinan ese recorrido.',
  '¿Qué etapa podría impedir que un pedido completo salga aunque todas las demás estén listas?','map'),
 commercial:record('areas/02_comercial.png','Comercial',
  'Ilustración isométrica de la función Comercial del centro de distribución.',
  'Comercial entrega un pronóstico de pedidos; la demanda real se conocerá después.',
  '¿Qué sucede con las compras si pronosticas demasiados o muy pocos pedidos?','management'),
 planning:record('areas/03_planificacion.png','Planificación',
  'Ilustración isométrica del equipo de planificación del centro de distribución.',
  'Planificación convierte el pronóstico en cobertura requerida por producto.',
  '¿Qué inventario conviene comprometer sin conocer todavía la demanda real?','management'),
 purchasing:record('areas/04_compras.png','Compras',
  'Ilustración isométrica de la función Compras y proveedores.',
  'Compras compromete abastecimiento; una promesa de entrega todavía no es stock disponible.',
  '¿Cuánto importa el cumplimiento del proveedor frente al costo y al plazo?','management'),
 receiving:record('areas/05_recepcion.png','Recepción',
  'Ilustración isométrica del muelle y la operación de recepción del CD.',
  'Recepción registra las unidades que llegan. Las pendientes en muelle aún no entran a stock utilizable.',
  '¿El muelle tiene capacidad suficiente para procesar lo que realmente llegó?','physical'),
 quality:record('areas/06_calidad.png','Calidad',
  'Ilustración isométrica de inspección y liberación de Calidad.',
  'Calidad revisa y libera los SKU recibidos. Retenido no significa rechazado ni perdido.',
  '¿Liberar antes reduce pedidos pendientes o sigue bloqueando otra etapa?','physical'),
 inventory:record('areas/07_inventario_almacen.png','Inventario y almacén',
  'Ilustración isométrica de almacenamiento e inventario del CD.',
  'Inventario confirma qué SKU están disponibles, localizables y aptos para preparar pedidos.',
  '¿Existen físicamente los SKU que exige cada pedido completo?','physical'),
 picking:record('areas/08_picking.png','Picking',
  'Ilustración isométrica del área donde se preparan pedidos.',
  'Picking arma pedidos completos con los SKU requeridos y dentro de su límite físico por jornada.',
  '¿Más personal realmente supera el cuello de capacidad, o falta un SKU?','physical'),
 transport:record('areas/09_transporte_despacho.png','Transporte y despacho',
  'Ilustración isométrica del sector de despacho y transporte.',
  'Transporte expide pedidos que ya están preparados. Salida del CD no equivale a entrega al consumidor.',
  '¿Hay rutas disponibles para evacuar pedidos listos en staging?','physical'),
 monitoring:record('areas/10_monitoreo_gerencia.png','Monitoreo y gerencia',
  'Ilustración isométrica de oficinas, reuniones y monitoreo gerencial.',
  'La gerencia contrasta servicio, pendientes, cuellos físicos y gasto incremental para coordinar al equipo.',
  '¿Qué acción cambia realmente el resultado y cuál solo añade costo?','management')
});
export const I2_CD_AREA_ORDER=Object.freeze([
 'commercial','planning','purchasing','receiving','quality','inventory','picking','transport'
]);
export const I2_CD_IMAGE_COUNT=Object.keys(I2_CD_ART).length;

/** Consulta estricta: nunca se acepta un archivo arbitrario del usuario. */
export function i2CdSceneFor(key){
 if(!Object.hasOwn(I2_CD_ART,key))throw new Error('I2-36: escena CD desconocida');
 return I2_CD_ART[key];
}

/** Categoriza según naturaleza física/administrativa, no según posición visual. */
export function i2CdTourStages(){
 return Object.freeze(I2_CD_AREA_ORDER.map((key,index)=>Object.freeze({
  order:index+1,key,title:I2_CD_ART[key].title,
  kind:I2_CD_ART[key].kind,src:I2_CD_ART[key].src
 })));
}
