import {I2_AREAS} from './i2-product-contract.js';

/** Gerencial, opt-in and planning-only. No physical ledger, no future demand. */
const GUIDES={
 commercial:[
 'Comercial conecta lo que espera el cliente con el plan del CD. Si el pronóstico se queda corto, podría faltar abastecimiento; si sobra, quizá comprometamos stock y dinero innecesarios.',
 'Como gerente, contrasta el volumen previsto con tu capacidad y con la información disponible de la campaña. No controlas la demanda real ni deberías tomar una previsión como venta asegurada.',
 'Mira los pedidos previstos y el desvío respecto al plan solo después de revelar la demanda. El forecast no mide ventas entregadas ni servicio real.',
 'Una previsión agresiva puede mejorar la cobertura o causar sobrantes; una prudente reduce compras pero aumenta el riesgo de quiebre. Eso termina afectando tiempos y disponibilidad para el consumidor.',
 'Ejemplo didáctico: si anticipas 100 pedidos y llegan 140, el problema no se resuelve necesariamente reforzando Transporte: quizá faltan productos.',
 '¿Qué riesgo aceptas: comprometer más compras o quedarte corto de producto?'
 ],
 planning:[
 'Planificación convierte el pronóstico comercial y el inventario disponible en necesidades de reposición; coordina cuándo podrían llegar los SKU.',
 'Tu decisión fija cuánto de la necesidad calculada intentará comprar el CD. No decide cuánto efectivamente entregará el proveedor ni crea unidades disponibles de inmediato.',
 'Mira la cobertura de la necesidad por SKU, las cantidades del compromiso original y los plazos nominales. Pedidos previstos y unidades SKU son medidas diferentes.',
 'Cobertura menor protege presupuesto comprometido pero puede dejar faltantes. Cobertura superior reduce ese riesgo, a costa de más stock comprometido que podría sobrar.',
 'Ejemplo didáctico: si faltan 10 unidades del SKU B, una cobertura del 70 % compromete 7; si ese proveedor llega día 13, no ayudan antes del cierre.',
 '¿Qué cobertura necesitas para tu meta sin comprar unidades que el CD no podrá procesar?'
 ],
 purchasing:[
 'Compras selecciona al proveedor y las condiciones bajo las cuales el abastecimiento podría llegar al CD. Una orden enviada no es una recepción terminada.',
 'El gerente evalúa cumplimiento, recargo y plazo; no puede suponer que cada pieza comprometida estará en Picking el mismo día.',
 'Distingue cantidad comprometida, cumplida por el proveedor, llegada al muelle y recibida físicamente. El porcentaje contractual o didáctico no es una garantía de servicio.',
 'El proveedor barato podría dejar faltantes; uno más confiable puede costar más. Incluso una entrega completa puede atascarse en Recepción o Calidad.',
 'Ejemplo didáctico: pedimos 100 SKU, el proveedor cumple 75 y llegan 75 al muelle. Si hoy registramos 50, todavía quedan 25 por recepcionar.',
 '¿Compensa el mejor cumplimiento el costo y la fecha efectiva de disponibilidad?'
 ],
 receiving:[
 'Recepción transforma llegadas al muelle en movimientos físicos registrados dentro del CD. Sin esa confirmación, una unidad no está disponible en inventario.',
 'Puedes ajustar capacidad diaria de ingreso. No puedes adelantar al proveedor ni hacer desaparecer una cola sin tiempo o recursos suficientes.',
 'Mira unidades llegadas, unidades ingresadas y cola pendiente al fin del día. La capacidad en SKU/día no es productividad por trabajador si no tenemos horas y dotación.',
 'Un turno reforzado puede vaciar el muelle antes, pero añade recursos y podría desplazar el cuello de botella hacia Calidad.',
 'Ejemplo didáctico: llegan 100 SKU y hoy registramos 60. Las otras 40 esperan por orden de llegada; no aparecen como stock listo.',
 '¿El muelle realmente limita el flujo o el retraso viene desde el proveedor?'
 ],
 quality:[
 'Calidad inspecciona y libera lotes físicamente recibidos antes de que se utilicen para preparar pedidos.',
 'El gerente prioriza revisión y capacidad sin omitir controles. Este juego no modela defectos ni rechazos: “retenido” significa pendiente, no producto perdido.',
 'Observa recibidos, liberados, retenidos por lote y días de espera. Una tasa de liberación del 100 % en este modelo no garantiza calidad perfecta en la vida real.',
 'Acelerar puede reducir espera, pero comprometer un refuerzo costoso no ayuda si todavía no ha llegado mercancía.',
 'Ejemplo didáctico: de 40 SKU esperando, 30 se liberan hoy; 10 siguen en revisión. No los cuentes como merma ni como stock disponible para Picking.',
 '¿Existe suficiente producto retenido para justificar más capacidad de inspección?'
 ],
 inventory:[
 'Inventario sabe qué unidades hay, dónde están y qué cantidad puede prometerse sin equivocarse. No es una nueva fuente de stock.',
 'Como gerente decides el nivel de control y conciliación. El stock físico incluye unidades no verificables, reserva y otras ubicaciones; no todo llega a Picking al mismo tiempo.',
 'Mira PICK-FACE físico, localizable, pendiente de conciliar y RESERVA-CD. El porcentaje de exactitud no mide ventas ni unidades perdidas.',
 'Conciliar reduce errores de promesa y puede desbloquear Picking, con costo de control. Reubicar mercancía suma cero unidades nuevas al CD.',
 'Ejemplo didáctico: hay 100 SKU en PICK-FACE, pero solo 85 identificados con certeza. Los otros 15 siguen físicamente aquí aunque no puedas prometerlos.',
 '¿Es realmente falta de mercancía o te está frenando la confianza en el inventario?'
 ],
 picking:[
 'Picking reúne TODOS los SKU que exige cada pedido. Aquí un pedido es un conjunto completo: no basta con mover muchas unidades sueltas.',
 'Puedes asignar dotación/capacidad de preparación, pero no convertir stock inexistente en un pedido ni resolver la falta de Transporte aguas abajo.',
 'Compara unidades SKU preparables por jornada, pedidos completos preparados y pedidos expedidos. “1 unidad SKU” no es “1 pedido”; solo hablamos de productividad persona-hora si hubiera horas y dotación medidas.',
 'Reforzar Picking puede ayudar cuando hay stock verificable suficiente y no hay otro cuello. Si falta el SKU C de un pedido mixto, más operarios no lo completan.',
 'Ejemplo didáctico: un pedido mixto usa 2×A + 1×B + 1×C. Si tienes A y B pero cero C, no es un pedido completo. El consumidor todavía espera.',
 '¿El límite está en las manos del equipo o en los productos que faltan o que aún no están liberados?'
 ],
 transport:[
 'Transporte gestiona la salida física de pedidos que ya fueron preparados. Preparado, expedido desde el CD y entregado al hogar del cliente son eventos diferentes.',
 'Puedes definir capacidad diaria de salida, rutas o refuerzos. No fabricas pedidos terminados y no certificas la recepción del consumidor.',
 'Mira pedidos preparados pendientes de salida, expedidos por jornada y utilización frente a capacidad, si existe el denominador válido.',
 'Más transporte puede reducir la acumulación de pedidos preparados, pero un camión extra vacío cuesta y no ayuda a superar faltantes anteriores.',
 'Ejemplo didáctico: Picking armó 80 pedidos y hoy pueden salir 50. Otros 30 permanecen en staging; todavía no se pueden llamar despachados.',
 '¿Existe una cola real de pedidos listos o falta trabajo antes de llegar a Transporte?'
 ]
};
export function i2ManagerAreaGuide(areaId){
 if(!I2_AREAS.some(x=>x.id===areaId)||!GUIDES[areaId])
  throw new Error('I2: área desconocida para mirada gerencial de Nico');
 const v=GUIDES[areaId];
 return Object.freeze({
  areaId,title:'Entender '+I2_AREAS.find(x=>x.id===areaId).title+' con Nico',
  what:v[0],manager:v[1],kpi:v[2],tradeoff:v[3],example:v[4],question:v[5],
  note:'Guía de gestión, sin resultados de demanda futura. Los ejemplos son inventados para aprender; la decisión sigue siendo tuya.'
 });
}
