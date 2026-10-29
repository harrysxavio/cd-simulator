# Misión CD · Auditoría de producto y replanificación verificable · 28-10-2026
**Fuente operativa:** [I2-PLAN-MAESTRO.md](I2-PLAN-MAESTRO.md). Esta auditoría fundamenta decisiones; no constituye plan paralelo. [Estado vigente](I2-STATUS.md).

## Evidencia y estado de partida
- `main`: I2-00–I2-34 integradas, 35/41 IDs históricos; PR #126 último cierre registrado. **No equiparar 85,4 % de IDs con porcentaje de esfuerzo.**
- [PR #127](https://github.com/harrysxavio/cd-simulator/pull/127) draft, abierto, rama `feat/i2-35-replay-tradeoffs`, NO integrado: comparación de cinco recuperaciones clásicas para misma semilla; código nuevo `src/i2-challenge-replay-matrix.js`, `juego/app.js`, test `tests/i2-challenge-replay-matrix.test.mjs` y contrato I2-35. Verificar CI del HEAD vigente antes de fusionar. No sobrescribir esta rama desde la rama documental.
- La URL pública apunta a `/juego/`, pero **en esta auditoría no se hizo recorrido instrumental navegador/Android ni comprobación HTTP de assets+SHA**; publicación de #127 NO comprobada. Revisión de código y documentación no sustituye auditoría visual ni E2E.
- Referencias inspeccionadas: I2-STATUS, I2-PLAN-MAESTRO, roadmap 23-10, revisiones 24/26-10, `src/i2-challenge-config.js`, `src/i2-mvp-adapter.js`, `src/i2-demand-event.js`, `src/i2-nico-evidence-learning.js`, `juego/app.js`, `juego/nico-learning-panel.js`, pruebas de retos y contratos. Histórico de otros PRs por documentos vinculados. Quedan por inspeccionar exhaustivamente flujos en navegador, instrucciones locales adicionales y trazas de CI actuales.

## Matriz de observaciones del encargo: evidencia ≠ aceptación
| Observación | Diagnóstico al corte | Evidencia y aceptación pendiente |
|---|---|---|
| A. Diversidad real | **Vigente** | `I2_CHALLENGES` solo diferencia `shockPercent` (+40,+10,-15,+50,-35), nivel y nombre; adaptador aplica mismo escenario canónico. Una diferente restricción puede surgir de opciones del usuario, **no está garantizada por misión**. Diseñar arquetipos con soporte físico probado. |
| B. Multiacción visible | **Parcialmente resuelta** | `src/i2-multi-recovery.js`, selector `juego/multi-lever-panel.js` y confirmación integrados I2-28–30. Auditoría previa lo ubicaba secundario: falta comprobar por E2E y móvil descubrimiento y distinción explorar/calcular/confirmar. |
| C. Tutorial largo | **Parcialmente resuelta** | I2 tutorial/guía y Nico están implementados; revisar estructura de siete capítulos, paneles y número de gestos con 320–430 px y lector de pantalla antes de rediseñar. |
| D. Portada cargada | **Vigente como riesgo UX sin medición actual** | Briefing, guía, misión, objetivos y ajustes comparten recorrido en `juego/app.js`; medir distancia al CTA y tiempo a primera elección, no prometer scroll resuelto. |
| E. Resultados densos | **Parcialmente resuelta** | Paneles opcionales Nico, auditoría física y económica I2-31–34. `resultsScene` presenta múltiples secciones; necesita jerarquía y evaluación móvil real. |
| F. Criterios e insignias | **Parcialmente resuelta** | I2-14 metas y presupuestos; `src/i2-nico-evidence-learning.js` comprueba servicio, costo, cola y max 1 insignia; visibilidad y comprensión **antes** de decidir no comprobadas. |
| Rigor de cálculo | **Implementado parcialmente y exige regresión** | Reutiliza `i2MvpPhysicalResult`/SKU y costo parcial; verificar restricción de disponibilidad, BOM, inventario por estados, fechas de recuperación (ejecución posible vs contrafactual), ledger, unidades, validación de migración. |
| Enseñanza principiante→experto | **Parcialmente resuelta** | Nico I2-12–34, tutorial y detalle a demanda; falta contrato uniforme de tres capas, evaluación con principiantes. |
| Comparación de reintentos | **Parcialmente resuelta en rama** | PR #127 compara opciones exactas del mismo escenario **después del resultado**, no historial de intentos con hipótesis. Separar laboratorio contrafactual de decisión bajo incertidumbre. |
| Accesibilidad humana | **No resuelta** | Issue #67 Android real, TalkBack y usuarios principiantes abierto. |

## Principios vinculantes de diseño y aprendizaje
1. **Un concepto por intervención**: capa A (frase cotidiana contextual, máximo 2 oraciones), capa B (ejemplo del pedido/SKU/cola y dato real cuando corresponda), capa C (definición profesional, fórmula, unidad, horizonte, fuente, umbral, supuestos y límites bajo demanda). No revelar datos posteriores a la decisión. SKU = referencia única de producto; BOM = lista de componentes/unidades requeridas para un pedido; lead time = tiempo desde ordenar hasta recibir/utilizar.
2. **Nico con función concreta**: bienvenidas breves, primera entrada de área, primer concepto, trade-off relevante, evento, diagnóstico, cierre. Una intervención principal visible; preferencias de reducir/reabrir; estado de navegación sin pérdida. Etiquetas **hecho**, **interpretación respaldada**, **hipótesis** y **ejemplo**. No recomendar una solución universal ni inventar causalidad.
3. **Decisión gerencial completa**: objetivo y restricción visibles antes, dato disponible hoy, alternativa/no intervenir/combinación, consecuencia esperada incierta, confirmación explícita, consecuencia del motor, comparación y reflexión. Tres estados distintos: **explorar** (contrafactual conocido), **calcular** (simulación alternativa), **confirmar** (acción del juego); acciones retrospectivas deben rotularse laboratorio, nunca ejecución real.
4. **Indicador confiable**: fórmula, unidad, período, fuente, denominador, umbral y limitación. `expedido CD` no es `entregado cliente`; material recibido no equivale a comprado; gasto incremental no es costo total ni utilidad; throughput por jornada no es productividad persona-hora.
5. **Mobile-first por tarea**: una CTA primaria por estado, objetivo/contexto y decisión próximos, panel opcional para detalle, targets ≥44 CSS px cuando sea viable y alternativas para zoom 200 %, teclado, focus, no gesture-only, sin scroll anidado competitivo. No disminuir tipografía para comprimir.
6. **Dificultad separada**: nivel de explicación no altera física; dificultad de escenario como selector independiente declarado. No calificar resultado aleatorio retrospectivamente como mala decisión con la información disponible antes.
7. **Economía única**: no duplicar compras, no sumar resultados de intervenciones aisladas, congelar baseline, replay y semilla, conservar V1. Cuándo se decide vs días simulados debe quedar explícito.

## Arquitectura UX objetivo por escena
| Escena | Comprender / decidir / contextual | CTA y navegación |
|---|---|---|
| Entrada | Rol de gerente, objetivo y misión sugerida | **Comenzar con valores recomendados**; configuración avanzada y tutorial como vías secundarias, saltar/volver |
| Área | Una decisión, opción y 1–2 KPIs pertinentes; Nico contextual | **Confirmar área** o volver; detalle profesional mediante ficha, preservando selección |
| Evento | Qué es observado ahora y qué estaba sellado | **Revelar** una vez; no spoiler, semilla independiente |
| Diagnóstico | Restricción observable vs hipótesis y datos faltantes | **Preparar estrategia**; permitir más información sin perder contexto |
| Recuperación | No intervenir / una / varias; costo marginal y efecto temporal | **Confirmar estrategia**; explorar en pantalla identificada laboratorio, modificar y cancelar |
| Cierre | Meta cumplida, cambio vs no intervenir, evidencia, sacrificio, cliente y siguiente experimento | **Reintentar** con hipótesis; revelar detalle económico/operativo opcional y reabrible |

## Arquetipos: hipótesis, no fingir soporte del motor
| ID | Restricción didáctica | Requisito de motor / evidencia antes de habilitar |
|---|---|---|
| ARC-01 | Demanda baja, compras comprometidas | Demanda negativa, conservar órdenes/compromisos; demostrar costo y stock sobrante |
| ARC-02 | Demanda alta, SKU crítico faltante | Cohorte + BOM, demostrar SKU limitante y capacidad de picking ociosa |
| ARC-03 | Proveedor tarde | Fecha de PO/recepción exógena independiente de decisiones, prueba de llegada tardía sin retrocausalidad |
| ARC-04 | Muelle saturado | Capacidad de recepción física por jornada, cola SKU y prueba de movimiento del cuello |
| ARC-05 | Calidad retiene inventario | Liberación/calidad diferenciada de recepción, backlog de material inmovilizado, pruebas |
| ARC-06 | Picking limitado, stock disponible | Capacidad de preparación y stock utilizable, refuerzo debe cambiar flujo cuando es cuello |
| ARC-07 | Transporte limitado, pedidos preparados | Capacidad y staging, demostrar preparados no expedidos |
| ARC-08 | Refuerzo costoso sin beneficio | Restricción aguas arriba demostrada + costo positivo + sin pedidos recuperados |

**Contrato de cada escenario**: ID/objetivo pedagógico, semilla, dificultad de física, tamaño de muestra, apertura y stock por estado, lead times y restricciones, evento exógeno y momento revelación, información disponible/sellada por etapa, baseline, acciones y costos, KPI evaluados, contrafactual, prueba de que una intervención relevante cambia estrategia útil, replay exacto, e hipótesis para siguiente intento. Si no se pueden representar coherentemente, marcar **bloqueado/no jugable**, no simular con texto decorativo.

## Decisiones de alcance
- **Descartado**: agregar nombres/historias a los 5 shocks y declarar diversidad. **Motivo**: no cambia optimización ni cuello físico.
- **Descartado**: volver a escribir un motor SKU paralelo o un P&L ficticio. **Motivo**: rompe fuente canónica y exactitud.
- **Descartado**: otorgar insignias por clic, costo o elecciones; **motivo**: incentivos incorrectos.
- **Descartado**: convertir toda guía y tutoría en desplegables o toda explicación en modal. Elegir componente según tarea y prueba móvil.
- **Conservado**: I2-00–I2-34 históricas; I2-35–I2-40 como padres, subdivididos, sin recontar subfases como finales.

## Puertas de aceptación por cada entrega
Contrato y estado → prueba de invariantes Node → interacción móvil/Chromium + V1 → revisión de regresión económica, accesibilidad y persistencia → PR → CI → merge → versión/HTTP Pages comprobada (cuando afecta al cliente). Android físico, TalkBack y usuarios reales son **puertas humanas**; no aprobarlas por IA o emulación.
Prueba pedagógica: el participante explica su rol, SKU/BOM faltantes, por qué más capacidad puede no ayudar, diferencia comprar/recibir/preparar/expedir, sacrificio y próximo experimento. Registrar evidencia y observaciones, no inventar porcentajes de éxito.

## Checkpoint operativo
- Último completado: I2-34 en main según I2-STATUS.
- En curso: PR #127 draft con implementación parcial de I2-35; no fusionar ni declarar publicado sin revisar test HEAD, UI y semántica contrafactual.
- Este cambio: **solo planificación/documentación** en rama `docs/i2-product-rebaseline-2026-10-28`; no altera juego ni motor.
- Primer paso técnico: I2-35.1 matriz de capacidad de motor/arquetipos, 8 fixtures físicos y pruebas discriminantes, incluyendo cronología decisión/intervención. Después evaluar compatibilidad y ajustar PR #127, evitando dos PR que toquen la misma interfaz.
- Pendiente: prueba navegador real, commit de despliegue, comprobación HTTP, dispositivo Android/TalkBack, usuario principiante.
