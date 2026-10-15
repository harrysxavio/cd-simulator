# Estado v11.55 · M5-26 · Comparación consolidada antes / alternativa / diferencia

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md). **Estado:** **completada (2026-10-14, horario de Chile)**. PR, Node, Chromium, Pages y HTTP reales aprobados.

## Objetivo

Permitir a una persona que aprende gestión de centros de distribución decidir sin abrir cinco vistas técnicas: mostrar en la misma lectura el estado **sin intervenir**, la **opción seleccionada** y el **cambio físico y económico**.

## Implementación

- Nuevo `src/recovery-consolidated.js`: proyección de solo lectura sobre las **cinco** comparaciones de la caché SKU, todas con el mismo baseline congelado. No vuelve a simular movimientos, órdenes ni finanzas.
- Cada alternativa informa: pedidos completos expedidos del CD, pendientes al corte, expediciones del día 0, primera y última salida física dentro del horizonte, y **días-pedido de backlog**. Primera/última salida se muestra como `null` si no salió ningún pedido.
- Para la alternativa elegida muestra diferencias de expediciones y pendientes (signos válidos positivos/negativos), cambio de días-pedido de espera, gasto/compromiso incremental supuesto, valor de expediciones incremental y proxies de caja/economía. **No supone valores contables confirmados.**
- Invariantes: las cinco opciones comparten apertura, reservas, manifiesto de compra original, fechas, demanda y modo Picking/Transporte. Costos: principal urgente, recargo supuesto y costo de refuerzo ya calculado, sin segunda contabilización.
- Identifica únicamente **observaciones al corte** (cola de Recepción, retenido Calidad, staging esperando camión, pendientes); no afirma una causa raíz única. No promete día de despacho de pedidos pendientes ni entrega al cliente.
- Interfaz móvil: sección compacta de cuatro líneas «Antes → Con opción (diferencia)» en el comparador existente; fechas, colas, costos y 13 días se mantienen en paneles desplegables. Evita cifras enormes y tarjetas redundantes.
- Pruebas Node: todas las alternativas, fechas físicas, ausencia de stock, transporte bloqueado con staging, compra fuera de horizonte, espera con costo cero, datos alterados; Chromium escritorio/móvil a 360/412 px y persistencia tras recarga.

## Restricciones

- La cohorte SKU de días 0–12 es una **muestra pedagógica**, independiente de las unidades de una jornada del modelo agregado.
- La salida del CD no prueba entrega al cliente, venta facturada ni ingreso bancario.
- «Costo incremental» incluye compromiso de compra urgente más recargo y recurso contratado hipotético. No constituye costo contabilizado o flujo de caja real.
- El backlog-día cuenta pendientes en los días anteriores al corte final, no días reales de atraso ni SLA formal.
- La presencia de cola física es indicio observado, no prueba de causalidad del cuello de botella.

## Puerta de cierre

- [PR #53](https://github.com/harrysxavio/cd-simulator/pull/53), Node [#38658672092](https://github.com/harrysxavio/cd-simulator/actions/runs/38658672092) y Chromium [#38658672078](https://github.com/harrysxavio/cd-simulator/actions/runs/38658672078): **aprobados**.
- Merge en `main` commit `10028b30`; Node [#38659081568](https://github.com/harrysxavio/cd-simulator/actions/runs/38659081568) y Chromium [#38659081577](https://github.com/harrysxavio/cd-simulator/actions/runs/38659081577): **aprobados**.
- Pages v11.55 r164 [#38659081984](https://github.com/harrysxavio/cd-simulator/actions/runs/38659081984) y HTTP real [#38659081564](https://github.com/harrysxavio/cd-simulator/actions/runs/38659081564): **aprobados**.
- Android físico/TalkBack: sigue pendiente de M7.
- **Siguiente M5-27:** confirmar/persistir la decisión de forma consistente con las comparaciones y sus controles de integridad.
