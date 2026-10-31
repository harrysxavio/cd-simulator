# Implementación 2 · Revisión de profundidad gerencial y UX didáctica (24-10-2026)

> **Revisión del 28-10-2026:** el objetivo de gamificación se redefine como ciclo **situación → información disponible → hipótesis → decisión → efecto del motor → reflexión → reintento**. Cinco shocks de demanda no prueban variedad de cuellos. Antes de prometer ocho arquetipos validar soporte físico ARC-01–08 y estrategias útiles diferentes; no alterar el escenario exógeno por desempeño ni presentar comparaciones perfectas como predicción en vivo. La experiencia en teléfono debe priorizar decisiones y mostrar detalle técnico a demanda; PR #127 agrega comparación en rama, aún no en main. Ver [auditoría](I2-AUDITORIA-PRODUCTO-REBASELINE-2026-10-28.md) y [microfases](I2-PLAN-MAESTRO.md). **Este texto constituye criterio de aceptación, no aprobación de implementación.**


**Decisión vigente y vinculante:** este documento complementa [I2-PLAN-MAESTRO.md](I2-PLAN-MAESTRO.md), [I2-EXPERIENCIA-MOVIL.md](I2-EXPERIENCIA-MOVIL.md) y [I2-STATUS.md](I2-STATUS.md). Se mantienen los **41 IDs I2-00 a I2-40**; 14 estaban integradas al revisar esta solicitud. **Plan aprobado ≠ funciones implementadas.** Cada regla añadida aquí se satisface solo mediante pruebas y PR posteriores. Si una regla requiere dividir una microfase, usar PR sucesivos / subtareas sin atribuir prematuramente su finalización.

## 1. Auditoría de la brecha real

| Tema | Ya existe en V1, I2 o plan previo | Brecha y acción obligatoria | IDs |
|---|---|---|---|
| Motor físico SKU (3 SKU, día 0–12, 8 áreas) | V1 tiene campaña, ledger, compras originales, recepción, calidad, inventario y despacho. I2 comparte `createI2GameCampaignAdapter`. | **No rehacer motor**: exponer sus restricciones y la secuencia causal con el nivel de detalle elegido por el usuario | 17–25, 32 |
| Demanda sorpresa y recuperación | I2 alfa fija 200 previstos / 280 reales (+40 %); 5 acciones y comparación desde un baseline. Plan ya pedía seeds, escenarios al alza/baja. | Eventos reproducibles por dificultad y explicación comparativa física/económica; nunca castigar después de ver las decisiones | 26–30, 35 |
| Indicadores de negocio | Alfa muestra expedidos, pendientes, costo incremental y proxy; V1 tiene `skuEconomicAuditReadModel`, `operationalCapacityCostReadModel`, flujos y colas | Construir **cuadro de mando multidimensional**, con fórmulas, unidad y fuente, comparaciones con baseline y semáforos | 17, 21–25, 27–29, 31–33 |
| Costos completos | Auditoría SKU incluye valor ilustrativo de despachos, material utilizado y jornadas extra activadas, con conciliación; ignora costos/tarifas no calibrados | **No declarar costo total, utilidad o EBITDA reales**; mostrar CLP auditados parciales con desglose, inversión ociosa y objetivos económicos didácticos | 29, 31, 33 |
| Días de llegada | Recuperación permite día 1/2/5/10/13; el modelo respeta recepción posterior, stock y el corte del día 12 | Aclarar qué llega, cuándo está disponible, qué mejora, qué no, y costo; comparar al menos dos fechas para la misma intervención; día 13 no rescata dentro del horizonte | 20, 27–30 |
| Consejos de Nico | `src/i2-game-guide.js` da texto optativo; UX original ya lo definía como coordinador del CD | Presentarlo en la bienvenida como **coordinador ficticio y tutor**, no como fuente de datos ni IA omnisciente | 14, 16 |
| Arte de juego | Tema oscuro/naranja y guía opcional; no sprites aprobados | **Pixel-art contenido**: retrato pequeño de Nico, CD/sorter/cajas y semáforos, con legibilidad profesional, licencia, alt/fallback y carga pequeña | 14, 16–17, 37, 40 |
| Ayudas y modales | `<dialog>` con Escape y botón «Cerrar ayuda ✕» | Icono **×** sin texto visible, con `aria-label`; clic/tap **en backdrop** cierra; clic en contenido no cierra; Escape y retorno del foco siguen funcionando | 16–17, 36 |
| Exceso de scroll | Shell con contenido de scroll interno, CTA fijo, modal y capítulo; ya verificado por Chromium | Explorar vista contextual **Decisión / Indicadores / Nico** con pestañas accesibles; swipe horizontal solo como atajo, no como única manera de acceder | 17, 31–33, 37–38 |
| Cierre de misión | Resumen físico y detalles; gamificación de logros estaba en plan | Diagnóstico «fortalezas / alertas / palancas» con umbrales auditables, semáforos y conclusión multieje, jamás felicitación global si costo/desempeño crítico está rojo | 31–35 |

**Deuda prioritaria:** el juego es una **interfaz del motor**; hoy no expone lo suficiente para entrenar la toma de decisiones y sus compensaciones. No sustituir profundidad gerencial por tarjetas, color ni narrativa.

## 2. Modelo de gestión y KPI: un tablero que no confunde magnitudes

**Fuente obligatoria:** resultados canónicos de la **misma cohorte SKU, día 0 a 12** (`campaignSkuContract`, `createSkuSessionCache`, `campaignAreaReadModel`, `skuEconomicAuditReadModel` y `operationalCapacityCostReadModel`). Nunca sumar «unidades equivalentes de jornada» con pedidos completos ni mezclar estados proyectados con registros físicos. Pre-reveal solo se permiten **presupuestos, capacidades y pronósticos conocidos**; valores reales no se filtran.

| Indicador | Fórmula / lectura | Interpretación y honestidad |
|---|---|---|
| Servicio del CD | `pedidos expedidos / pedidos reales × 100` (si >0) | **Expedición**, nunca entrega final al cliente; semáforo contra meta configurable |
| Brecha de pronóstico | `(demanda real − forecast confirmado) / forecast confirmado × 100` (si >0) | Sesgo de sobre/subestimación después del reveal. El pronóstico puede variar con Comercial, no la demanda externa |
| Pedidos pendientes | `pedidos reales − expedidos` | Conteo físico, no pedidos «perdidos» |
| Días-pedido en cola | `Σ backlog diario` del ledger, con rango explícito | Permite distinguir dos decisiones con igual expedición final pero distinta espera |
| Productividad de flujo | `expedidos / días operativos observados`, más producción/recepción/picking por día y su capacidad modelada | **Throughput por día**, no pedidos/persona-hora salvo contar horas de personal verificadas |
| Utilización de capacidad | `slots realmente usados / slots asignados` en recurso/etapa comparable, si asignación >0 | Incluir capacidad ociosa; capacidad de pedidos no es dotación real |
| Refuerzo operativo | Turnos activados, cupos usados, cupos ociosos y CLP por turno modelado | El refuerzo **se cobra si se activa**, aunque quede capacidad ociosa |
| Desembolso incremental ilustrativo | Compra urgente principal + recargo + jornadas extra según comparación canónica | **Proxy de gasto/flujo incremental**, no caja efectivamente pagada |
| Costo conocido incremental por pedido recuperado | `gasto incremental / max(Δpedidos,0)` solo cuando `Δpedidos > 0` | Si Δ≤0, mostrar «sin recuperación» en rojo/advertencia, **nunca costo $0 por pedido** |
| Contribución parcial auditada | `valor ilustrativo de despachos − materiales expedidos − jornadas extra desplegadas` | Usar directamente `skuEconomicAuditReadModel` y conciliar; **no es margen total ni EBITDA** |
| Compromiso de compras | PO original y urgente por separado, con estado de entrega/recepción | Compromiso ≠ consumo ≠ pago; no duplicar material como nuevo costo |
| Costo operacional total | **Desconocido** hasta tener todas las tarifas y drivers alineados | Mostrar desconocido y servicios excluidos; nunca inferirlo de un proxy ni imprimir cero |

### Semáforos: decisiones basadas en evidencias

Nunca hay un «verde global» a partir de expediciones solamente. Propuesta inicial de metas **configurables y explícitamente pedagógicas** (requieren calibración y pruebas; no afirmar estándares universales de la industria):

| Eje | Verde | Ámbar | Rojo | Sin datos |
|---|---|---|---|---|
| Servicio expedido | ≥95 % | ≥85 % y <95 % | <85 % | no hay demanda comparable |
| Utilización de refuerzo activado | ≥75 % | ≥50 % y <75 % | <50 % | sin refuerzo asignado / sin slots comparables |
| Brecha de forecast (absoluta) | ≤10 % | >10 % a 20 % | >20 % | pronóstico cero/ausente |
| Presupuesto **incremental modelado** | ≤ presupuesto acordado | >100–110 % del presupuesto | >110 % | presupuesto no fijado / costo no tarificado |
| Tiempo de cola | contra umbral didáctico del escenario | alerta cercana al umbral | excede umbral | evento diario no validado |

Los últimos dos ejes dependen de un presupuesto/umbral fijado **antes de la simulación**; no inventar valores ni usar como umbral el costo del propio resultado. Indicadores sin denominador o sin fuente se muestran como **«sin base para evaluar»**, no verdes ni rojos falsos. La tarjeta debe explicar en una línea «qué mide», «por qué ese color» y «qué palanca actuaría». Incluir etiqueta de color, texto e icono accesible, no depender solo del color.

**Evaluación de cierre:** cuatro ejes **servicio, eficiencia, costo conocido y tiempos/stock**; reportar cada uno por separado. Si alguno es rojo, la conclusión debe reconocer ese riesgo incluso con 100 % de expedición; no usar suma ponderada que compense automáticamente costo extremo con buen servicio. No usar `progreso 100 %` de capítulos como índice de desempeño. Insignias solo por causalidad comprobada.

## 3. Recuperación y significado de «día de llegada»

Cambiar la UX genérica «Día de llegada o traslado» por un **control contextual**:
- **Compra urgente:** «Día previsto de llegada de la compra urgente». Se debe distinguir llegada del proveedor, admisión por Recepción, liberación de Calidad, disponibilidad de Inventario, preparación y expedición.
- **Reserva localizada:** «Día del traslado/liberación de reserva» (si la opción activa ese mecanismo). Un traslado **no crea stock** ni simula una PO.
- **Refuerzo solo:** ocultar controles de compra/traslado que no tengan efecto; mostrar en cambio coste de turno, slots extra asignados y utilizados.
- **Esperar:** desactivar/ocultar ambos selectores sin relevancia.
- Para cada acción, comparar **esperar vs intervención** y, donde proceda, día 2 vs día 10 vs día 13 con baseline **idéntico**, destacando `Δ pedidos expedidos`, `Δ cola`, `Δ días hasta impacto`, `Δ CLP modelado`, `capacidad ociosa`.
- Si el proveedor llega el **día 13** y la campaña cierra el **día 12**, mostrar «No alcanza a ayudar antes del cierre», con el costo/compromiso conocido y sin inventar pedidos recuperados. Día 1 tampoco garantiza salida inmediata si Recepción, Calidad, Inventario o Picking son restricciones.

## 4. Demanda sorpresa justa y desafíos con semilla

**No usar** «si el jugador está ganando, incrementar demanda» ni «si está perdiendo, darle menos demanda» dentro de la misma campaña. Eso altera una variable exógena basada en rendimiento, introduce sesgo de confirmación y destruye la comparabilidad de decisiones.

**Diseño elegido:**
1. Antes del primer clic, elegir **semilla de campaña + plantilla de reto + dificultad**. Registrar esa elección de forma persistente; al crear la campaña se fija una **demanda real exógena**, invisible antes de I2-26, **independiente de las decisiones**.
2. Retos reproducibles pueden incluir variaciones tanto de subida como bajada (p. ej. −40 % a +40 %, acotadas por el contrato del motor), y eventos de plazo/capacidad permitidos. Rangos **propuestos para probar**, no calibrados: básico hasta ±10 %, intermedio ±10–25 %, desafiante ±25–40 %. Incluir 0 % como caso pedagógico válido y separar «demanda baja» de «desafío fácil».
3. La dificultad de **gestión** no debe ser solo el tamaño del shock; también intervienen mix 3 SKU, stock, calidad, recepción, transporte, pronóstico y presupuesto. Una demanda baja puede provocar sobrecompra y capacidad ociosa (difícil en costos).
4. Emplear generador determinista con semilla, mismas fuentes y mismo baseline en **cinco recuperaciones** y reintentos. Nunca un `Math.random()` al presionar «Revelar demanda». El usuario podrá repetir **el mismo caso** y comparar dos planes bajo condiciones iguales; una campaña nueva explicitará «nuevo reto, distinta semilla».
5. Si en el futuro se habilita selección adaptativa por desempeño histórico, debe elegir el **siguiente reto antes de que comiencen las decisiones**, avisando que es una dificultad adaptativa. Nunca falsificar el pedido real a mitad de una campaña.
6. Requiere migración de esquema I2 v2→v3 y protección de partidas existentes: conserva el alfa fijo como caso legado y no revela la semilla/valor antes del evento explícito.

## 5. UX móvil: información abundante pero disponible por capas

**Esquema recomendado — NO tres pantallas largas ni tres gestos obligatorios:**
- **Centro / Decidir:** pregunta, máximo 2 KPI relevantes, ≤3 alternativas, consecuencia de planificación conocida y acción principal anclada abajo.
- **Panel Indicadores:** semáforos y una comparación contra objetivo/baseline. Al tocar un indicador: fórmula, fuente, fecha y por qué está amarillo/rojo. Bloquear datos posteriores a la sorpresa hasta I2-26.
- **Panel Nico:** personaje pixel-art pequeño presentado como «Nico, coordinador ficticio del CD», consejo explicativo, causa/efecto y un ejemplo breve; optativo y siempre silenciable.
- **Navegación accesible:** tres pestañas/segmentos visibles («Decisión», «Indicadores», «Nico»); **swipe izquierda/derecha solo atajo** cuando no interfiera con scroll horizontal, navegación atrás del dispositivo, lectores de pantalla o selección en controles. No ocultar información esencial tras un gesto invisible.
- Las tarjetas no tienen números gigantes ni unidades repetidas; el detalle técnico se despliega a demanda. El botón Confirmar se mantiene visible. Evitar volver al scroll externo de V1.

## 6. Nico y sistema visual pixel-art

**Presentación** en la primera experiencia: «Hola, soy Nico. Coordino este CD y te ayudaré a entender cómo impactan tus decisiones. Tú decides; mis consejos son opcionales». Una vez explicado, no interrumpir más.

**Pixel-art profesional/ligero:** sprites pequeños originales (base 16×16 o 24×24 multiplicados sin blur), rasgos diferenciables, paleta corta azul petróleo/naranja/amarillo, escenas de CD, cajas, rack, montacarga/sorter solo si explican una acción. El personaje no debe competir con el KPI ni transformar la app en arcade infantil. Preferir SVG/PNG original de tamaño controlado, sin fuentes externas ni tracking; contraste verificable, textos HTML reales, alt apropiado y fallback sin imagen. No generar art hasta seleccionar/validar dirección con pantallas de muestra.

**Modales:** control visible «×» con nombre accesible «Cerrar ayuda»; cierre mediante Escape, botón y tap/click **fuera del panel**; no cerrar al interactuar dentro del contenido, ni al deslizar para leer. Restaurar foco al disparador; probar touch, teclado, dialog backdrop, TalkBack y prevención de click-through sobre decisión subyacente.

## 7. Criterios adicionales por microfase existente (no renumerar 41 IDs)

| Microfase | Anexo vinculante de aceptación |
|---|---|
| I2-14 | Meta servicio/costo/equilibrio, **presupuesto incremental didáctico**, dificultad y ayuda; defaults válidos, explicitar qué cambia y qué solo cambia la forma de evaluar |
| I2-15 | Configuración avanzada y umbrales editables, cancelación sin mutar plan; conservar baseline/seed y no mezclar KPI SKU con agregado |
| I2-16 | **Presentar a Nico**, opt-in, pixel concept validado, X y backdrop en modal, tutorial por niveles; no rerun al abrir ayuda |
| I2-17 | Plantilla de decisión con **Decisión/Indicadores/Nico**, botones accesibles + swipe opcional, 2 KPI centrales, efecto preventivo conocido vs efecto real posreveal |
| I2-18–25 | Cada área: 1–2 KPI del cuello de botella, semáforo si hay evidencia, acción, costo/plazo aplicable, feedback causal y acceso a timeline auditado |
| I2-26 | Variable de demanda ± con seed precomprometida, evento explícito, no adaptar a decisiones en curso |
| I2-27 | Diagnóstico de **servicio, desviación pronóstico, capacidad/cola y presión económica**, causas múltiples explícitas |
| I2-28 | Comparador 5 alternativas: Δ expedición, espera, capacidad/ociosidad y **gasto incremental** frente a misma base |
| I2-29 | Control de fecha **contextual**, muestra consecuencias de día 2/10/13 y CLP sin prometer resultado garantizado |
| I2-30 | Confirmación de recuperación con desglose servicio/tiempo/costo y cancelación sin mutaciones |
| I2-31 | **Tablero de semáforos multieje** con definición/umbral/fuente y accesos a indicadores detallados; ningún «bien» global con rojo crítico |
| I2-32 | Evidencia y cronología: stock, PO, recepción, colas, Picking, despacho, horas/turnos solo si disponibles; causas rastreables |
| I2-33 | **Contribución parcial SKU auditada** + gasto incremental, comprometido vs consumido, costo por recuperación cuando hay denominador, sin doble contabilidad ni inventar costo total |
| I2-34 | Informe «lograste / arriesgaste / mejorarías» e insignias basadas en evidencia, no dinero gastado ni progreso de pantallas |
| I2-35 | ≥5 casos: subforecast, sobreforecast/demanda baja, proveedor tardío, cuello de botella de recepción/calidad, sobrecapacidad cara; seed/replay/compare |
| I2-36–40 | Pruebas de ceguera a futuro, ratios, umbrales, simulaciones de extremos, modales, tabs/swipes, accesibilidad real, pixel assets, cargas y paridad V1 |

## 8. Prioridad y orden de cierre

**P0 (sin esto no es simulador gerencial satisfactorio):** I2-14/15 configurar objetivos y presupuesto; I2-17 navegabilidad por capas; I2-18–25 y I2-27/28/29 exponer causalidad, servicio, productividad, esperas y costo; I2-31/33 semáforos honestos y economía auditada.

**P1 (enseña sin falsear):** I2-26/35 semillas y retos tanto al alza como a la baja; I2-30 confirmación/reintento; I2-32 trazabilidad; I2-34 diagnóstico final multieje.

**P2 (pulido útil, no sustituye P0):** I2-16 Nico y pixel-art medido, X/backdrop y mini tutorial; gestos horizontales opcionales; QA humana real siempre obligatoria en I2-38.

**Hitos de revisión:**
- **Gerencia alfa 2**: poder comparar dos recuperaciones por servicio, costo y tiempo antes de confirmar, y comprender por qué una compra día 13 falla.
- **Tablero beta**: semáforos 4 ejes, costos parciales con fuente, lectura por área y un caso de **100 % servicio pero gasto crítico rojo**.
- **Reto beta**: mismo seed = mismo shock/ledger; escenario de demanda negativa produce sobrecapacidad y compra innecesaria, no recompensa automática.
- **Visual QA**: Nico presentado, arte pixel original que no tape los KPI, X/backdrop, tabs y swipe opcional; Android real y TalkBack sin gestos obligatorios.
- **Release**: V1 intacta, 3 SKU/8 áreas/12 días, 5 recuperaciones auditadas, sin cambio del resultado al activar Nico o cambiar estilo visual.

Ninguna de estas metas se da por cumplida al escribir este documento. Los PR y tests futuros documentarán criterios y resultados; el plan de 41 microfases sigue siendo el inventario canónico.
