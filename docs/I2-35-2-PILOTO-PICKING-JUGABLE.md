# I2-35.2 · Piloto jugable ARC-06: diagnóstico de Picking

**Estado:** PR técnico en revisión, pendiente CI y Pages. No cierra toda I2-35.2 ni F7.
[Plan maestro](I2-PLAN-MAESTRO.md) · [Evidencia física](I2-35-1-CAPACIDADES-FISICAS.md) · [Arquetipos](I2-35-2-ARQUETIPOS-PROBADOS.md).

## Objetivo pedagógico
Una persona sin experiencia identifica que disponer de inventario y dotación nominal no implica poder preparar pedidos si hay una restricción física de **10 unidades SKU por jornada**. Debe razonar si gastar en capacidad nominal ayuda o si conviene no intervenir.

## Experiencia del usuario (primer corte)
1. En la **portada**, botón «Activar reto de diagnóstico» visible cerca de la misión. Si lo activa, prepara el escenario `alpha-case-04`, fija `pickingLimitSkuPerDay:'10'`, conserva ocho áreas, parámetros restantes y sistema de guardado. Puede volver al reto inicial **antes de confirmar** un área.
2. **Antes del evento:** la restricción de 10 unidades SKU/jornada está **declarada** como dato conocido. No se muestra signo ni magnitud de la demanda futura. Picking cuenta como unidades de productos completos exigidos por la lista de componentes de cada pedido (BOM), no como pedidos preparados, ni productividad por persona-hora.
3. **Decisión:** conserva decisiones originales de ocho áreas, recuperación clásica (incluida no intervenir) y multiacción. No introduce soluciones ficticias. Las metas generales de servicio podrían ser inalcanzables con el límite, y la interfaz lo advierte.
4. **Tras resultado:** panel «Nico: ¿cuánto limitó Picking esta misión?» calcula **solo al abrir** la expedición con el tope y sin ese tope usando igual semilla, decisiones de áreas, compras iniciales y demanda. Es **experimento retrospectivo de infraestructura**, no acción que el gerente podría ejecutar al descubrir el evento.
5. El cierre sigue empleando los indicadores y límites económicos canónicos. El nuevo panel no altera el plan ni su guardado.

## Pruebas y criterios de aceptación
- Node: preset mantiene clave y esquema de partida, se puede seleccionar/deshacer antes de confirmar, no permite editar misión tras confirmar, conserva datos tras normalizar y no filtra demanda antes del resultado.
- Node: en caso base, **59 expedidos con límite y 98 sin límite**, mismo plan y compras; el contraste +39 se deriva del motor físico existente.
- Chromium móvil 360×760: botón desde portada, recarga, ocho áreas, reveal explícito, cierre y panel a demanda. También abandono previo a confirmar a 320 px, sin barra horizontal ni pérdida de footer.
- Regresión V1 e I2 y workflow Pages posterior al merge.

## Limitaciones abiertas
- Es un **piloto jugable y reproducible** sobre semilla `alpha-case-04`, no una sexta semilla ni una misión con evento independiente. Elegir y cambiar avanzados puede transformar el piloto en un escenario personalizado, que deja de ser el preset original.
- La restricción es conocida desde el inicio. **No se puede levantar de forma ejecutable** con las acciones de recuperación existentes; por ello, el aprendizaje principal es *diagnóstico y evitar gasto sin beneficio*, no resolver mágicamente el cuello.
- Las metas de servicio genéricas podrían ser inalcanzables; falta evaluación específica de calidad de decisión bajo incertidumbre y contraste entre intentos.
- Todavía no hay congestión real de muelle ni staging de transporte demostrados como misiones.
- No reemplaza I2-35.3 (cronología), I2-35.5 (variedad y ritmo), Android físico, TalkBack o usuarios reales.

## Checkpoint
- Rama: `feat/i2-35-2-picking-guided-pilot`.
- Archivos: `src/i2-guided-picking-pilot.js`, `juego/app.js`, `juego/styles.css`, `tests/i2-guided-picking-pilot.test.mjs`, `tests/browser-i2-guided-picking-pilot.e2e.mjs` y esta guía.
- Próximo paso: CI Node + Chromium; corregir defectos antes del merge, verificar `/juego/app.js` publicado, actualizar STATUS.
- Al completar este corte: 35.2 seguirá parcialmente abierta hasta misiones físicamente distintas, condiciones de éxito gerenciales y pruebas de diversidad.
