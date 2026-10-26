/**
 * Nico's optional managerial learning layer.
 * Pure editorial content: no challenge seed, future-demand lookups, evaluation,
 * budgets, expense calculations or writes to the campaign.
 * Examples are clearly illustrative; not facts from the current playthrough.
 */
export const I2_NICO_MANAGER_TOUR=Object.freeze([
 {
  id:'gerencia',title:'1. Tu trabajo como gerente del CD',
  body:'¡Bienvenido! En un centro de distribución (CD) llegan productos, se revisan, se guardan, se preparan y salen como pedidos. Tu desafío no es ganar apretando el botón más grande: es que los pedidos salgan completos, a tiempo y usando los recursos con criterio.',
  example:'Ejemplo: acelerar la preparación sirve de poco si faltan productos o si los vehículos no pueden sacar los paquetes.',
  watch:'Mira siempre servicio, unidades pendientes, esperas, capacidad y gasto incremental. Un indicador verde no convierte automáticamente toda la gestión en buena.',
  consumer:'Detrás de cada pedido hay alguien esperando. El CD controla la expedición, pero este juego no mide la entrega final al domicilio.'
 },
 {
  id:'recorrido',title:'2. El viaje de un pedido por ocho áreas',
  body:'Comercial estima la demanda. Planificación decide cuánto cubrir; Compras gestiona al proveedor. Recepción registra lo que llega; Calidad libera; Inventario ubica y verifica; Picking arma pedidos completos; Transporte los saca del CD. Las ocho áreas se pasan el trabajo, como una cadena.',
  example:'Ejemplo: si Compras entrega tarde, quizá Recepción quede sin trabajo hoy y saturada mañana. Un problema de un área aparece en otra.',
  watch:'Pregunta en cada etapa qué recibió, qué entregó, qué está esperando y cuál puede ser el siguiente cuello de botella.',
  consumer:'Un pedido puede estar pagado o preparado, pero no salir del CD si falta un producto o la capacidad de Transporte.'
 },
 {
  id:'plan',title:'3. Primero decides sin conocer la demanda real',
  body:'Vas a elegir una alternativa en cada una de las ocho áreas. Son decisiones de un plan inicial, no pronósticos mágicos. Al confirmarlas, las compras originales quedan comprometidas y después no se reescriben para fingir que conocías el futuro.',
  example:'Ejemplo: una compra grande podría protegerte ante ventas superiores, pero también dejar inventario y dinero comprometido si la demanda es baja.',
  watch:'Antes de elegir, compara los supuestos de la alternativa con tu objetivo y piensa dónde podría desplazarse la restricción.',
  consumer:'Un plan más costoso puede ser razonable si evita pedidos incompletos; no lo es automáticamente.'
 },
 {
  id:'sku',title:'4. ¿Por qué tres productos y doce días?',
  body:'Un SKU es un producto distinto. Hay tres: A de alta rotación, B de media y C de baja. Un pedido puede requerir varios SKU a la vez. El simulador sigue doce jornadas para observar fechas de llegada, colas, preparación y salida. El día 13 ya está fuera de la misión.',
  example:'Ejemplo didáctico basado en el catálogo: un pedido combinado necesita 1 A y 1 B. Tener cinco A y cero B no completa ese pedido. El SKU C tiene diez días de plazo nominal de suministro.',
  watch:'Observa unidades por SKU, mezcla de pedidos, stock liberado y los días que quedan. No confundas 100 unidades con 100 pedidos completos.',
  consumer:'Si falta una sola pieza necesaria, el pedido completo puede quedar esperando aunque las demás estén disponibles.'
 },
 {
  id:'metricas',title:'5. Cómo leer el tablero sin engañarnos',
  body:'Servicio habla de pedidos completos que pudieron salir. La cola y los plazos muestran esperas. Capacidad es cuánto puede procesar una etapa por jornada. El gasto incremental son costos extra modelados para reaccionar; no es el costo total de operar el CD.',
  example:'Ejemplo: dos decisiones pueden expedir igual cantidad de pedidos, pero una consumir más dinero. También puede ocurrir que sobren turnos porque falta inventario.',
  watch:'Fíjate en unidades, periodo, origen y comparación con el plan sin actuar. No hablaremos de productividad por persona-hora si el modelo no tiene personas y horas medidas.',
  consumer:'La salida del CD reduce el riesgo de espera, pero no demuestra la fecha real de entrega ni la satisfacción de la persona.'
 },
 {
  id:'sorpresa',title:'6. La demanda cambia: reaccionas como gerente',
  body:'Después de cerrar tu plan aparece la demanda real, fijada por el reto desde el principio. Puede ser mayor o menor que la prevista. Aquí empiezas a diagnosticar qué falla, cuándo se puede actuar y qué costaría. No todas las acciones mejoran el servicio; algunas llegan tarde.',
  example:'Ejemplo: una compra urgente prevista para el día 13 no puede salvar una meta que se cierra en el día 12.',
  watch:'Compara actuar y no actuar. Piensa en varias palancas compatibles y sus restricciones: presupuesto, inventario, plazos y capacidad. La combinación de acciones se incorporará en la fase de recuperación.',
  consumer:'Tu decisión puede reducir pedidos pendientes, pero también desperdiciar recursos si no ataca el cuello de botella.'
 },
 {
  id:'cierre',title:'7. Aprende de la partida, no solo de la puntuación',
  body:'Al cerrar, podrás contrastar lo planeado, lo que de verdad ocurrió y la respuesta que elegiste. Una buena decisión no siempre produce el resultado perfecto, porque existe incertidumbre y varias áreas interactúan.',
  example:'Ejemplo: recuperar cinco pedidos usando un gasto extra muy alto puede ser menos conveniente que recuperar cuatro con un recurso disponible, según la meta de la misión.',
  watch:'Hazte tres preguntas: ¿qué salió bien?, ¿qué sacrifiqué?, ¿qué cambiaría para el siguiente intento? Repetir el mismo reto te permite comparar decisiones sin mover la demanda.',
  consumer:'El criterio final combina la promesa al cliente con recursos, demoras y el costo conocido; no inventa utilidad ni entregas finales.'
 }
].map(ch=>Object.freeze(ch)));

const GUIDES={
 commercial:{
  name:'Comercial',job:'Aquí nace la estimación de pedidos. Comercial interpreta señales de venta y entrega un pronóstico a Planificación. No controla la demanda que finalmente llegará.',
  controls:'El gerente decide qué escenario de ventas tomará como base. Su forecast mueve el plan de abastecimiento y el riesgo de comprar demasiado o muy poco.',
  metrics:'Pronóstico de pedidos de la muestra; comparación con la demanda observada solo después de revelarla. La diferencia no prueba por sí sola quién tuvo la culpa.',
  risks:'Subestimar puede generar faltantes. Sobreestimar puede comprometer caja y dejar sobrestock. Una demanda sorpresa puede ocurrir aun con un pronóstico prudente.',
  example:'Si pronosticas 200 pedidos, no significa que llegarán exactamente 200. Si entran más, Compras y el inventario pueden quedar cortos.',
  question:'¿Qué nivel de riesgo de faltantes o sobrestock estás dispuesto a asumir para alcanzar tu meta?'
 },
 planning:{
  name:'Planificación',job:'Traduce el pronóstico en un plan de inventario, cobertura y necesidades por producto. Conecta Comercial con Compras.',
  controls:'El gerente define cuánto cubrir de la necesidad calculada con el stock inicial. Decide entre menor compromiso o colchón, considerando plazos.',
  metrics:'Unidades originales por SKU y valor comprometido de compra; no confundir valor de PO con dinero ya pagado o stock ya recibido.',
  risks:'Menor cobertura puede reducir compras pero exponer faltantes. Mayor cobertura exige recursos y no acorta automáticamente el plazo del proveedor.',
  example:'Si el cálculo pide 10 unidades de B, cubrir 70 % significa pedir 7. Si B llega fuera de fecha, la cobertura por sí sola no resolverá el problema.',
  question:'¿La cobertura elegida protege los SKU críticos sin comprometer más de lo razonable?'
 },
 purchasing:{
  name:'Compras',job:'Emite el compromiso de abastecimiento y gestiona el cumplimiento del proveedor. No equivale a recibir mercancía en bodega.',
  controls:'El gerente elige proveedor y acepta una combinación de confiabilidad, faltantes supuestos y fechas de abastecimiento.',
  metrics:'Cantidad solicitada, unidades cumplidas por proveedor, llegada al muelle y recepción efectiva; cada etapa debe conciliarse por SKU.',
  risks:'Un proveedor económico puede cumplir menos; uno confiable puede aumentar el compromiso de recursos. Incluso el 100 % de cumplimiento no garantiza stock disponible hoy.',
  example:'Pedir 100 unidades y recibir promesa por 95 no significa que 95 ya pasaron Calidad. Antes deben llegar, registrarse y liberarse.',
  question:'¿De qué te sirve ahorrar en proveedor si la fecha de llegada deja pedidos incompletos?'
 },
 receiving:{
  name:'Recepción',job:'Controla la descarga, el escaneo y el registro de unidades que llegan al muelle. Solo entonces pasan al flujo físico interno.',
  controls:'El gerente asigna capacidad diaria a Recepción para procesar llegadas y una posible cola de lotes por orden de llegada.',
  metrics:'Unidades arribadas, ingresadas a bodega y pendientes en muelle, todas por jornada. Capacidad SKU/día no significa productividad por persona-hora.',
  risks:'Una capacidad baja puede dejar cola; reforzar sin volumen suficiente puede crear capacidad ociosa o gasto sin beneficio.',
  example:'Si llegan 100 unidades hoy y se registran 60, otras 40 siguen en muelle. Calidad no puede liberar lo que no se ha recepcionado.',
  question:'¿Tenemos un problema real de muelle o estamos aumentando un recurso que no es el cuello de botella?'
 },
 quality:{
  name:'Calidad',job:'Revisa los lotes físicamente recibidos y autoriza el uso de las unidades liberadas. Una retención es una espera, no una pérdida automática.',
  controls:'El gerente decide la prioridad/capacidad de revisión. No puede declarar liberadas cajas que todavía no han ingresado al CD.',
  metrics:'Unidades recibidas para revisión, liberadas, retenidas y tiempo en espera, por lote y SKU. Aquí no se simulan rechazos por defecto.',
  risks:'La espera en Calidad frena Picking. Reforzar revisión podría costar más sin ayudar cuando casi no llegan unidades.',
  example:'Un lote recibido de 40 unidades puede liberar 30 hoy y dejar 10 para revisar mañana; las 10 no son merma.',
  question:'¿Es Calidad el cuello de botella y cuánto tardarán las unidades retenidas en poder usarse?'
 },
 inventory:{
  name:'Inventario',job:'Ubica, verifica y hace trazable cada producto dentro del CD. Distingue stock físico, reservado, en control y localizado para Picking.',
  controls:'El gerente decide la exactitud de registros y conciliación; mejorarla hace el stock más confiable, pero no produce cajas nuevas.',
  metrics:'PICK-FACE físico, verificable y sin verificar, reserva y stock esperando Calidad; no sumar un subconjunto como existencia adicional.',
  risks:'Tener unidades mal localizadas bloquea pedidos incluso con stock físico. Invertir en conteos sin necesidad puede gastar recursos o no resolver otras restricciones.',
  example:'De 100 unidades físicamente en PICK-FACE, solo 85 están verificadas: quedan 15 por conciliar, no 15 perdidas.',
  question:'¿Cuánto de lo que aparece en inventario está realmente listo y confiable para preparar pedidos?'
 },
 picking:{
  name:'Picking',job:'Reúne las unidades de cada SKU necesarias para formar pedidos completos. Un paquete no está terminado si falta una línea de su lista.',
  controls:'El gerente define la capacidad de preparación diaria y cómo se asigna el trabajo, pero no puede sustituir un SKU faltante por capacidad extra.',
  metrics:'Pedidos completos, unidades SKU preparadas y límite por jornada. Una preparación terminada no significa que Transporte ya la expidió.',
  risks:'Reforzar Picking puede ayudar si había unidades liberadas y órdenes pendientes; puede quedar ocioso si falta stock o se atasca Transporte.',
  example:'Un pedido combinado requiere 1 A y 1 B. Si hay 10 A y cero B, sumar operarios no permitirá completar esos pedidos.',
  question:'¿Lo que impide avanzar es la cantidad de personas/capacidad, los SKU faltantes o el siguiente eslabón?'
 },
 transport:{
  name:'Transporte',job:'Organiza la salida física de los pedidos preparados desde el CD. Su responsabilidad en este modelo termina en expedición, no en entrega al domicilio.',
  controls:'El gerente decide capacidad de despacho y cuándo sacar paquetes que ya están listos; puede generarse espera en staging si la salida es insuficiente.',
  metrics:'Pedidos preparados, expedidos, acumulados en staging y capacidad por jornada, con sus fuentes y fechas cuando estén disponibles.',
  risks:'Si el cuello está en Transporte, preparar más puede acumular paquetes. Si faltan pedidos completos, sumar vehículos no producirá expediciones.',
  example:'Hay 80 pedidos preparados y la salida admite 50. Pueden quedar 30 esperando, aun si Picking cumplió su trabajo.',
  question:'¿La salida disponible acompaña a la preparación sin pagar capacidad que quedará vacía?'
 }
};
export const I2_NICO_MANAGER_AREAS=Object.freeze(Object.fromEntries(
 Object.entries(GUIDES).map(([id,g])=>[id,Object.freeze(g)])
));
export function i2NicoManagerGuide(areaId,level='novato'){
 const base=I2_NICO_MANAGER_AREAS[areaId];
 if(!base)throw new Error('Nico gerente: área no reconocida');
 const lenses={
  novato:'Busca entender primero qué llega a esta área, qué sale de ella y qué podría quedar esperando.',
  intermedio:'Compara el cuello de botella de esta área con el anterior y el siguiente; evita optimizar una sola etapa.',
  avanzado:'Exige unidad, fecha, fuente y denominador para atribuir un cambio de servicio, utilización o costo a una decisión.'
 };
 if(!Object.hasOwn(lenses,level))throw new Error('Nico gerente: nivel inválido');
 return Object.freeze({id:areaId,...base,lens:lenses[level],
  boundary:'Es una explicación general del área. No contiene resultados futuros de tu partida ni revela la sorpresa.'});
}
