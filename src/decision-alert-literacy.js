/**
 * M7-35 · Explicar alertas y decisiones SIN alterar el modelo económico,
 * órdenes de compra, stock, dotación, acciones o persistencia.
 *
 * Todos los avisos pertenecen al motor agregado de UNA jornada; jamás se
 * trasladan automáticamente a los pedidos físicos SKU de 12 días.
 */
const freeze=x=>Object.freeze(x);
const known=new Set(['good','warning','danger']);
const groups=[
 ['unexpected-high','Demanda superior a lo previsto',
  'Se solicitaron más unidades equivalentes que las consideradas en el plan.',
  'Compara la demanda real con el pronóstico y después revisa stock y capacidad disponible.'],
 ['unexpected-low','Demanda inferior a lo previsto',
  'Llegó menos demanda que la utilizada para planificar compras y recursos.',
  'Revisa inventario comprometido y la carga real antes de contratar, comprar o reforzar turnos.'],
 ['surplus','Stock potencial sin demanda en la jornada',
  'Hay unidades utilizables que exceden la demanda de esta jornada; eso no demuestra merma.',
  'Revisa vigencia, ubicación y posible demanda futura antes de reducir o mover inventario.'],
 ['reinforcement-no-gain','Refuerzo sin expedición adicional:',
  'La intervención simulada no añade unidades expedibles con las otras decisiones constantes.',
  'Comprueba primero si llegaron unidades suficientes y si las etapas posteriores pueden despachar.'],
 ['reinforcement-tradeoff','Revisar retorno del refuerzo:',
  'El refuerzo recupera unidades en el modelo, pero el resultado económico simulado disminuye.',
  'Compara la mejora de servicio con el gasto adicional y valida si el beneficio es relevante.'],
 ['capacity','Capacidad insuficiente:',
  'A esta etapa llegan más unidades equivalentes que su capacidad teórica de proceso.',
  'Revisa cuánto recibió realmente la etapa y si aumentar capacidad mejoraría la expedición final.'],
 ['overstaffed','Dotación por encima de la carga:',
  'La dotación asignada supera la calculada teóricamente para el volumen de esta jornada.',
  'Verifica tareas indirectas, seguridad, turnos y reasignación antes de proponer una reducción.'],
 ['understaffed','Carga superior a dotación:',
  'El volumen exige más personas teóricas que las asignadas según productividad supuesta.',
  'Comprueba primero productividad real, flujo, turnos y disponibilidad antes de contratar.'],
 ['mode-without-return','Modo sin retorno demostrado:',
  'El modo elegido no mejora el despacho frente al estándar y reduce el resultado simulado.',
  'Compara el modo normal con el actual y comprueba si existe un beneficio que el modelo omita.'],
 ['overcost','Sobrecosto en ',
  'El gasto del área supera la referencia flexible ajustada al volumen modelado.',
  'Compara el gasto incremental con el servicio y revisa volumen, dotación y costos asignados.'],
 ['service-gap','Meta de servicio no alcanzada',
  'Las unidades expedibles del turno no alcanzan la meta configurada de cumplimiento.',
  'Examina el flujo desde Compras hasta Transporte y prueba una intervención sin asumir causa única.'],
 ['clear','Sin alertas críticas del modelo',
  'No se activaron las reglas de alerta definidas en este escenario.',
  'Comprueba las suposiciones y riesgos no representados: ausencia de alerta no significa operación perfecta.']
];
/** Deterministic classification of existing titles; no dynamic warnings added. */
export function explainOperationalAlert(message){
 if(!message||!known.has(message.level)||typeof message.title!=='string'
  ||typeof message.description!=='string'||message.title.length>220)
  throw new Error('Explicación de alerta: registro inválido');
 const match=groups.find(([id,starts])=>message.title===starts||
  (starts.endsWith(':')||starts.endsWith(' '))&&message.title.startsWith(starts));
 if(!match)throw new Error('Explicación de alerta: aviso desconocido');
 if(match[0]==='clear'&&message.level!=='good')throw new Error('Explicación de alerta: nivel incompatible');
 if(match[0]!=='clear'&&message.level==='good')throw new Error('Explicación de alerta: nivel incompatible');
 return freeze({
  passed:true,type:'aggregate-attention-education',id:match[0],
  level:message.level,originalTitle:message.title,
  meaning:match[2],check:match[3],
  limit:'Señal del modelo agregado de una jornada. No identifica una causa raíz exclusiva, no valida personas o pagos reales y no equivale a pedidos SKU despachados ni entregas a clientes.',
  source:'attention-signal',model:'aggregate-day',editsDecision:false
 });
}
/** A local stage transition is NOT evidence of global service improvement. */
export function explainAreaDecision({area,input,output,capacity,phase}={}){
 // Comercial y Planning representan pronósticos y compromisos de compra.
 // Son magnitudes planificadas que pueden superar su base; NO son stock físico creado.
 const isForecast=area==='Comercial';
 const isPurchasePlan=area==='Planning';
 const isProjection=isForecast||isPurchasePlan;
 if(typeof area!=='string'||!area.trim()||area.length>80
  ||!Number.isSafeInteger(input)||input<0||!Number.isSafeInteger(output)
  ||output<0||(!isProjection&&output>input)
  ||!Number.isSafeInteger(capacity)||capacity<0
  ||!['plan','recover'].includes(phase)){
  throw new Error('Explicación de decisión: flujo inválido');
 }
 const loss=input-output;
 const meaning=isForecast
  ?'De '+input+' unidades de demanda base, el pronóstico estima '+output+
    '. Una previsión mayor o menor no significa que esas unidades hayan llegado físicamente.'
  :isPurchasePlan
   ?'La brecha prevista es de '+input+' unidades y se planificó comprar '+output+
     '. La cobertura adicional es un compromiso de compra, no mercancía recibida ni stock disponible.'
   :input===0
    ?'No llegaron unidades equivalentes a esta etapa. Aumentar su capacidad no crea abastecimiento.'
    :loss>0
     ?'De '+input+' unidades equivalentes que llegaron, '+output+
       ' siguen adelante y '+loss+' quedan detenidas en este corte del modelo.'
     :'Las '+output+' unidades equivalentes que llegaron pueden seguir a la siguiente etapa en este corte.';
 const check=isForecast
  ?'Compara el pronóstico con la demanda prevista antes de comprar; la demanda real aún puede ser distinta.'
  :isPurchasePlan
   ?'Revisa el costo y plazo del pedido y luego cuánto entrega realmente el proveedor antes del corte.'
   :phase==='plan'
    ?'Antes de continuar, revisa si la decisión mantiene suficiente flujo para la siguiente área.'
    :'Compara cuántas unidades adicionales podrían expedirse al final y cuánto costaría el refuerzo antes de aplicarlo.';
 return freeze({
  passed:true,type:'aggregate-area-decision-education',area,phase,
  meaning,check,
  limit:isProjection
   ?'Plan del modelo agregado de una jornada: pronosticar o comprar no equivale a recibir, liberar ni expedir stock; tampoco equivale a pedidos SKU de 12 días.'
   :'Flujo agregado de una jornada: no representa pedidos físicos SKU, despacho final garantizado ni una causa raíz exclusiva.',
  source:'area-stage',editsDecision:false
 });
}
