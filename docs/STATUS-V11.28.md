# Estado verificable · v11.28 · M2-04b

**Fecha:** 2026-10-09. **Plan adoptado:** [43 microfases](EXECUTION-PLAN-43.md). **Detalle M2-04:** [issue #24](https://github.com/harrysxavio/cd-simulator/issues/24).

## Entrega M2-04b

- `src/sku-session.js`: caché **en memoria, acotada a diez combinaciones** (LRU) identificadas por campaña, entradas SKU, opción de recuperación, plazo y cobertura. Devuelve la misma referencia de `recoveryComparison()` para consultas repetidas.
- Solo al solicitar la vista física construye `supplyBridge()` y `campaignAreaReadModel()`; devuelve la misma proyección congelada a Resultados, ocho áreas y Diagnóstico. Si el usuario visita Recuperación, la vista previa reutiliza el replay del mismo escenario.
- Las alternativas de comparación tampoco recalculan eventos si ya existen para esa firma. Los cambios de demanda, capacidades, política, reserva, proveedor, recuperación o campaña producen otra firma.
- `restartCampaign()` y `resetScenario` limpian la caché; el historial detallado **no se guarda** en localStorage. Al recargar la página, los parámetros y decisiones persistidos reconstruyen determinísticamente el mismo libro de eventos con la misma ID de campaña.
- En atributos `data-campaign-id` y `data-projection-stamp` se puede comprobar sin textos adicionales que Diagnóstico, Resumen y las ocho áreas apuntan al mismo resultado.
- Pruebas Node de identidad por referencia, equivalencia de eventos, invalidez, LRU, reinicio y recarga; pruebas Chromium escritorio/Pixel 7 de navegación, comparación de indicadores, cambio de política y recarga.

## Alcance y límites

Este cambio **no fusiona** el motor de una jornada agregada ni su contabilidad con el modelo físico SKU, **no añade entregas confirmadas al cliente** y **no separa Picking de Transporte**. Reutilizar resultados equivale a evitar replays innecesarios por vista, no a cambiar la física de las ocho áreas.

## Estado de cierre

| ID | Estado | Evidencia requerida |
|---|---|---|
| 00 | En curso | Sin certificado HTTP directo de Pages; comprobar versión pública (HTML, manifest, JS) |
| 01 | Código/CI/merge aprobados | PR #20 |
| 02 | Código/CI/merge aprobados | PR #22 |
| 03 | Código/CI/merge aprobados | PR #23 |
| 04a | Código/CI/merge aprobados | PR #25, v11.27 |
| 04b | En curso | PR v11.28, Node+Chromium, merge y Pages |
| 04c–04d | Pendientes | Capacidades físicas de Picking y Transporte, M3 |
| 05–42 | Pendientes de cierre | Mantener logros parciales previos |

**Siguiente entrega recomendada:** M2-05 persistencia/reinicio con validación y migración de estados antiguos, si 04c/04d permanecen bloqueadas por M3. Al ajustar el orden, conservar dependencias y actualizar plan maestro.
