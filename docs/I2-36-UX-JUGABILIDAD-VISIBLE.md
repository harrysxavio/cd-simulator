# I2-36 · Auditoría UX y primer corte de jugabilidad visible

**Estado de esta entrega:** rama `feat/i2-36-mobile-mentor-recovery`, pendiente de CI, merge y publicación. **No declarar finalizada F7 ni F8.** [Plan maestro](I2-PLAN-MAESTRO.md) · [Estado](I2-STATUS.md).

## Hallazgos de la revisión del jugador
- **Tutorial:** siete capítulos anidados dentro de la portada obligan a desplegar, leer y cerrar. El contenido era amplio pero poco guiado.
- **Nico:** personaje pequeño, tutoría profunda oculta bajo varios paneles, acompañamiento discontinuo.
- **Recuperación:** cinco acciones únicas visualmente dominantes; multiacción coexistía en un desplegable secundario y el botón fijo llevaba al modo simple.
- **Fechas:** el selector «día» carecía de contexto suficiente; el motor simula 12 jornadas y una compra con llegada en día 13 no recupera pedidos a tiempo. Algunas fechas anteriores al momento de decisión son **contrafactuales**, no ejecución cronológica.
- **Variabilidad:** catálogo original usa cinco shocks de demanda. El piloto ARC-06 aporta tope físico de Picking, pero todavía faltan eventos exógenos distintos de demanda y nuevas estrategias útiles.

## Cambios de este corte
1. Tutorial separado: `juego/nico-journey-dialog.js` muestra **siete pasos consecutivos** en diálogo nativo, Nico grande, ejemplo, pregunta gerencial, progreso, siguiente/atrás/cerrar/saltar, Escape, foco restaurado, ajuste de profundidad (no altera dificultad). La portada se acorta: desaparece el bloque de tres pasos duplicado y los siete desplegables internos.
2. Recuperación: `juego/app.js` presenta primero plan de múltiples palancas; `juego/multi-lever-panel.js` permanece abierto por defecto. Se puede marcar cero, una o varias acciones y comparar su resultado combinado. El modo de cinco acciones simples se conserva como opción secundaria para compatibilidad con partidas y QA.
3. Nico durante recuperación: tarjeta contextual con la pregunta de gestionar un cuello y botón **«¿Una pista de Nico?»** no invasivo. No proclama una solución universal.
4. Fechas explicadas: día 1/2/5/10/13 son **jornadas de simulación**, no fechas de calendario; día 13 está fuera del corte. Acciones con llegada retrospectiva se etiquetan laboratorio, no ejecución real.
5. Evidencia operacional: `src/i2-operational-situation-cards.js` deriva hasta dos alertas de colas, material retenido, staging o pedidos no preparados del **motor SKU canónico**, solo después de revelar. No fabrica valores ni los llama nuevos incidentes aleatorios.
6. Diseño móvil: gran imagen de Nico, tarjetas de enseñanza, botones táctiles, enfoque y contraste. E2E: tutorial, conservación de partida, decisión multi, pista, fechas y regreso.
7. Retención de controles secundarios: el usuario puede editar el modo clásico sin perderlo al rerenderizar.

## Pendiente de forma explícita: eventos aleatorios reales
No existe aún un contrato físico de incidentes independientes que muten la operación (ej.: proveedor que atrasa un lote, suspensión de picking durante un día, retención de Calidad con fecha). **No simularlo solo cambiando textos.**

**Microtrabajo siguiente propuesto I2-35.2b/35.5:** catálogo de eventos externos reproducibles `eventSeed` distinto de `demandSeed`, sellado al confirmar ocho áreas; cada evento con `triggerDay`, `observedDay`, `affectedStage`, `durationDays`, unidades y costo si modelado; el motor físico debe reejecutar la misma entrada con el evento, conservar stock, compras, unidad y reloj, y demostrar que al menos dos eventos cambian estrategias útiles. Añadir pruebas de independencia de la demanda, comparación y cronología; evitar desbloquear resultados futuros.

## Criterios de aceptación restantes
- Pruebas Node de alertas físicas + navegador en 320/360/390/412/430, zoom, teclado, pantallas bajas y reducción de movimiento.
- CI Node + Chromium y V1, verificación de publicación real de `juego/app.js`, CSS y nuevo módulo JS.
- Validación humana Android/TalkBack y usuario sin experiencia. No inventar su aprobación.
- En F8: eliminar definitivamente el modo clásico duplicado solo con migración y revisión de reglas; hacer metas de servicio y costo accesibles al decidir; introducir hipótesis y repetición de políticas.

**Cómo continuar:** revisar PR y sus fallos E2E, corregir; integrar únicamente con CI verde, comprobar Pages, registrar SHA y checkpoint. Luego tomar los eventos exógenos reales antes de dar por acabada la diversidad de retos.
