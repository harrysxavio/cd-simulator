import {flow} from './flow.js';
import {numericValue} from './engine.js';

/**
 * U1 · Narrative interpretation of the EXISTING aggregate-day engine.
 * Diagnostic signals are provisional, not a verified root cause or purchase
 * recommendation. No virtual order, unit or cost is created here.
 */
export function managerDiagnosis({decisions={},scenario={},revealed=true}={}){
 const state=flow(decisions,{},scenario);
 const {demand,plannedDemand,estimated,ordered,delivered,received,released,stock,
  available,picked,dispatched,pending,pickingCapacity,receivingCapacity,inventoryCapacity}=state;
 const units=n=>Math.round(n).toLocaleString('es-CL');
 const difference=demand-plannedDemand;
 const deviation=plannedDemand?Math.round(Math.abs(difference)/plannedDemand*100):0;
 const context=!revealed?'Aún no conoces la demanda real. Revisa cómo tus decisiones preparan la operación.':
  difference>0?'La demanda aumentó '+deviation+' % respecto del plan inicial.':
  difference<0?'La demanda disminuyó '+deviation+' % respecto del plan inicial.':
  'La demanda real coincide con el plan inicial.';
 const coverage=100*dispatched/demand;
 const severity=pending===0?'stable':coverage<70?'critical':'warning';
 let category='balanced',area='transport',title='La operación cubre la demanda';
 let why='Con las restricciones modeladas, existe capacidad para expedir la demanda de la jornada.';
 let next='Revisa el costo de sostener este nivel de servicio y el inventario que podría quedar sin movimiento.';
 const capTransport=state.stages[7].capacity;
 const inventoryBeforeCapacity=Math.min(demand,state.usableBase+state.eligibleReserve);
 if(pending===0&&difference<0){
  category='surplus';area='planning';title='Menor demanda: revisa compromisos y stock';
  why='La demanda real es inferior a lo previsto. Las compras originales ya se comprometieron: no desaparecen por vender menos.';
  next='Examina exceso de inventario y fechas de recepción; evita nuevas compras sin verificar necesidad.';
 }else if(pending>0&&picked>dispatched&&capTransport<=picked){
  category='transport';area='transport';title='Transporte está limitando la salida';
  why='Picking puede preparar '+units(picked)+' unidades, pero Transporte solo permite expedir '+units(dispatched)+' hoy.';
  next='Evalúa cupos de expedición o una fecha de salida posterior antes de sumar stock o personal de picking.';
 }else if(pending>0&&available>picked&&pickingCapacity<=available){
  category='picking';area='picking';title='La preparación de pedidos es el cuello de botella';
  why='Inventario ofrece '+units(available)+' unidades, pero Picking alcanza '+units(picked)+' en esta jornada.';
  next='Evalúa balanceo o refuerzo de preparación y comprueba que Transporte tenga capacidad de salida.';
 }else if(pending>0&&inventoryCapacity<inventoryBeforeCapacity&&available===inventoryCapacity){
  category='inventory';area='inventory';title='Inventario no alcanza a habilitar todo el stock';
  why='Hay stock elegible para '+units(inventoryBeforeCapacity)+' unidades, pero la capacidad de Inventario permite disponer de '+units(available)+'.';
  next='Revisa ubicaciones, exactitud, conteos y reposición interna antes de solicitar más compras.';
 }else if(pending>0&&delivered>received&&received===receivingCapacity){
  category='receiving';area='receiving';title='Recepción está frenando el ingreso al CD';
  why='Los proveedores entregan '+units(delivered)+' unidades, pero hoy Recepción procesa '+units(received)+'.';
  next='Evalúa turnos o capacidad de descarga y evita prometer stock aún no recepcionado.';
 }else if(pending>0&&received>0&&released<received&&received-released>=Math.max(1,Math.ceil(pending*.3))&&Math.floor((stock+received)*numericValue('inventory',decisions)/100)>available){
  category='quality';area='quality';title='Calidad retiene unidades necesarias';
  why='Se recepcionaron '+units(received)+' unidades, pero Calidad liberó '+units(released)+' para el flujo.';
  next='Prioriza inspecciones válidas sin saltar controles; no prometas unidades retenidas.';
 }else if(pending>0){
  category='supply';area='inventory';title='La disponibilidad es insuficiente para la demanda real';
  const gap=Math.max(0,estimated-stock);
  const underforecast=estimated<demand;
  why=(underforecast?'El forecast cubría '+units(estimated)+' unidades, menos que las '+units(demand)+' solicitadas. ':'')+
   'Se comprometieron '+units(ordered)+' unidades de reposición para una brecha prevista de '+units(gap)+
   '; el proveedor entregó '+units(delivered)+'. Hoy se pueden expedir '+units(dispatched)+'.';
  next='Comprueba existencias y ubicaciones reales, el estado de compras pendientes y si una nueva reposición llegaría a tiempo. Reforzar Picking por sí solo no crea stock.';
 }else if(difference>0){
  category='balanced';area='inventory';title='Se absorbe el aumento de demanda';
  why='Aunque llegaron más solicitudes de las previstas, hay unidades y capacidad para cubrir la jornada modelada.';
  next='Contrasta el costo del servicio y el riesgo de próximos días antes de incrementar compras.';
 }
 const options=category==='supply'?[
  {title:'Revisar stock existente',reason:'Solo se pueden usar unidades físicamente disponibles y verificables.',type:'review'},
  {title:'Evaluar compra extraordinaria',reason:'El plazo de llegada y la capacidad del CD determinan si rescata pedidos.',type:'pilot'},
  {title:'Reprogramar entregas',reason:'Si no llega stock a tiempo, comunica una nueva fecha; no cuenta como expedición.',type:'future'}
 ]:category==='surplus'?[
  {title:'Revisar compromisos de compra',reason:'No se anulan automáticamente las órdenes originales.',type:'review'},
  {title:'Evaluar stock remanente',reason:'Evita inventario inmovilizado o compra adicional innecesaria.',type:'review'}
 ]:category==='balanced'?[
  {title:'Validar costos y holgura',reason:'Cubrir la demanda no garantiza el mejor resultado económico.',type:'review'}
 ]:[
  {title:'Revisar el área afectada',reason:next,type:'review'},
  {title:'Comprobar restricciones anteriores',reason:'Una intervención solo ayuda si existe flujo suficiente aguas arriba.',type:'review'}
 ];
 const note=category==='supply'
  ?'La compra urgente se ensaya hoy en el laboratorio SKU (pedidos a 12 días); todavía no actualiza los resultados agregados de esta jornada. U2 integrará esa decisión.'
  :'Estas son hipótesis de diagnóstico basadas en las capacidades del ejercicio, no causas raíz demostradas.';
 const scenarioLabel=!revealed?'Misión: preparar la campaña':
  difference>0?'Alerta: llegó más demanda de la prevista':
  difference<0?'Cambio de escenario: llegaron menos pedidos':
  'Misión: atender la demanda del día';
 return Object.freeze({
  scenarioLabel,context,severity,category,area,title,why,next,options:Object.freeze(options.map(o=>Object.freeze(o))),
  note,plannedDemand,estimated,actualDemand:demand,dispatched,pending,coverage,
  forecastBias:demand-estimated,delivered,ordered,received,released,
  signalOnly:true,unit:'unidades expedibles de una jornada',
  operationalModel:'aggregate-day'
 });
}
