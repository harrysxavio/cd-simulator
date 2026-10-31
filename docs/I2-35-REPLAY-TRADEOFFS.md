# I2-35 · Retos reproducibles y comparación de alternativas

Estado: **en revisión; no declarar completada ni publicada** hasta que CI + Chromium + comprobación Pages terminen satisfactoriamente.

## Cambio de experiencia

En el resultado de una misión, el jugador puede desplegar «Laboratorio: comparar cinco alternativas clásicas · Nico». Aparecen las cinco recuperaciones clásicas, evaluadas con una misma semilla de demanda, ocho decisiones de áreas, tamaño de cohorte y manifiesto original de compras. Para cada opción se explica cuántos pedidos salen, cuántos quedan pendientes, servicio, gasto extra parcial y costo por pedido recuperado si existe recuperación positiva.

**Regla pedagógica:** gastar más no implica mejor desempeño. Una acción que llega después del día 12 no puede rescatar pedidos al corte. Las cinco alternativas comparadas son las clásicas; no deben confundirse con todas las combinaciones multiacción configurables.

El panel es **solo lectura**, se abre bajo demanda después de revelar la demanda y conserva intacta la recuperación elegida. El motor único sigue siendo `i2MvpPhysicalResult`, sin contabilidad paralela ni nuevo ledger. Las cifras son de una cohorte SKU didáctica, no costos integrales ni entregas al cliente.

## Verificación exigida

1. Node: semilla reproducible, cinco retos de demanda positiva/negativa, comparación de cinco recuperaciones, conciliación pedidos expedidos + pendientes = observados.
2. Node: misma demanda independiente de decisiones, rechazo de semilla y muestra no permitidas, gasto incremental auditable.
3. Chromium: resultado clásico y multiacción muestran panel desplegable; ningún dato de demanda real se revela anticipadamente.
4. E2E V1: ningún flujo clásico, control o guardado se altera.
5. Pages + HTTP posterior a merge; QA humana Android/TalkBack queda pendiente en #67.

Siguiente: I2-36 matriz de interacciones E2E y focos/touch.

## Correcciones tras auditoría de regresión · 31-10-2026
- CI inicial PR #127: Node verde, `verify` y Chromium fallaron por prueba I2-14: esperaba **2 filas `.management-traffic-row`**, recibió **7** al insertar 5 opciones clásicas con clase compartida. Se separó `.i2-replay-option-row` para no contaminar evaluación gerencial.
- El primer comparador usaba `I2_DEFAULT_ADVANCED` para stock, capacidad de Picking, reserva y gasto, aunque el jugador había configurado otros valores. **Corregido**: se pasa y valida `state.advanced` completo; se compara el mismo plan, stock y costos con cinco recuperaciones.
- El resultado es laboratorio retrospectivo, con demanda ya observada, no una predicción exacta antes de actuar. Cinco clásicos no equivalen a todas las combinaciones multiacción.
- Optimización móvil: el panel solo construye y calcula las cinco alternativas cuando se abre; antes de abrirlo hay una sola línea de resumen y cero cálculos duplicados.
- Añadida regresión Node de configuración avanzada y E2E móvil con ausencia de fugas pre-reveal, cinco filas después de desplegar, evaluación gerencial inalterada y persistencia al recargar.
- **Pendiente**: comprobar CI de HEAD, revisar fallos si los hay, integrar en main, verificar publicación GitHub Pages y mostrar SHA. Estas correcciones todavía NO cierran I2-35, que requiere diversidad de cuellos físicos real.
