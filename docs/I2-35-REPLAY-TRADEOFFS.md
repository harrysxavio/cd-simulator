# I2-35 · Retos reproducibles y comparación de alternativas

Estado: **en revisión; no declarar completada ni publicada** hasta que CI + Chromium + comprobación Pages terminen satisfactoriamente.

## Cambio de experiencia

En el resultado de una misión, el jugador puede desplegar «Comparar alternativas del mismo reto · Nico». Aparecen las cinco recuperaciones clásicas, evaluadas con una misma semilla de demanda, ocho decisiones de áreas, tamaño de cohorte y manifiesto original de compras. Para cada opción se explica cuántos pedidos salen, cuántos quedan pendientes, servicio, gasto extra parcial y costo por pedido recuperado si existe recuperación positiva.

**Regla pedagógica:** gastar más no implica mejor desempeño. Una acción que llega después del día 12 no puede rescatar pedidos al corte. Las cinco alternativas comparadas son las clásicas; no deben confundirse con todas las combinaciones multiacción configurables.

El panel es **solo lectura**, se abre bajo demanda después de revelar la demanda y conserva intacta la recuperación elegida. El motor único sigue siendo `i2MvpPhysicalResult`, sin contabilidad paralela ni nuevo ledger. Las cifras son de una cohorte SKU didáctica, no costos integrales ni entregas al cliente.

## Verificación exigida

1. Node: semilla reproducible, cinco retos de demanda positiva/negativa, comparación de cinco recuperaciones, conciliación pedidos expedidos + pendientes = observados.
2. Node: misma demanda independiente de decisiones, rechazo de semilla y muestra no permitidas, gasto incremental auditable.
3. Chromium: resultado clásico y multiacción muestran panel desplegable; ningún dato de demanda real se revela anticipadamente.
4. E2E V1: ningún flujo clásico, control o guardado se altera.
5. Pages + HTTP posterior a merge; QA humana Android/TalkBack queda pendiente en #67.

Siguiente: I2-36 matriz de interacciones E2E y focos/touch.
