# Estado M8-39 · Regresión integral física, económica y E2E

**Fecha de certificación:** 2026-10-22 (Chile; registros GitHub del 2026-10-23 UTC).  
**Estado:** **COMPLETADA en su alcance de regresión automatizada.**  
**Versión funcional:** v11.67 r176 (no se modifica HTML, motor, JS de producción ni contrato de release).  
**Bloqueo distinto:** M7-38 mantiene pendientes Android real, TalkBack y comprensión de principiante; [issue #67](https://github.com/harrysxavio/cd-simulator/issues/67).

## Objetivo y cambio entregado

PR [#66](https://github.com/harrysxavio/cd-simulator/pull/66), merge [`b7d4039`](https://github.com/harrysxavio/cd-simulator/commit/b7d4039ef5f40fb5b5afa921fc027648f9bf31d7). El test nuevo `tests/m8-integral-regression.test.mjs` recorre **8 perfiles deterministas × 5 recuperaciones = 40 combinaciones** compartiendo por perfil una apertura, demanda y compra original congeladas:

- Sobredemanda con bajo pronóstico; demanda a la baja; proveedor con fill-rate parcial y capacidad de recepción reducida.
- Calidad sin liberación; inventario sin verificación; falta total de abastecimiento/recepción.
- Picking con staging separado y transporte bloqueado; compra urgente que llega fuera de horizonte.
- Cinco acciones: esperar, usar reserva interna, refuerzo, compra urgente y combinación.

**Invariantes comprobados:** `pedidos = expedidos + pendientes`; órdenes/PO originales inmutables; no recepción antes del arribo; picking previo a despacho; por SKU `apertura + recibido = expedido + retenido + reservado + disponible + staging`; por CLP `apertura + recibido = material despachado + inventario físico final`; contribución parcial conciliada, sin inventar facturas, cobros, pagos ni utilidad neta. Replay determinista repetido; rechazo de snapshot base incompatible. Pruebas dirigidas a compra tardía y camiones bloqueados.

La suite E2E existente cubre recorrido Operación → Diagnóstico → Recuperación → Resultados, decisiones SKU, cambio de vistas, persistencia, reinicio, teclado, foco y emulación de 360/412 px. No se reemplaza ni se afirma que Chromium sea prueba en teléfono Android físico.

## Evidencia automatizada (commit funcional `b7d4039`)

| Puerta | Resultado | Evidencia |
|---|---|---|
| PR #66, modelo | Aprobado | [Node #39880243294](https://github.com/harrysxavio/cd-simulator/actions/runs/39880243294) |
| PR #66, navegador | Aprobado | [Chromium #39880243290](https://github.com/harrysxavio/cd-simulator/actions/runs/39880243290) |
| `main`, modelo | **441/441 aprobadas; 0 fallidas, 0 omitidas** | [Node #39880836671](https://github.com/harrysxavio/cd-simulator/actions/runs/39880836671) |
| `main`, E2E | **78/78 aprobadas; 0 fallidas, 0 omitidas** | [Chromium #39880836685](https://github.com/harrysxavio/cd-simulator/actions/runs/39880836685) |
| Despliegue GitHub Pages | Aprobado | [Pages #39880836542](https://github.com/harrysxavio/cd-simulator/actions/runs/39880836542) |
| Comprobación de recursos por HTTP | Aprobado | [HTTP #39880836725](https://github.com/harrysxavio/cd-simulator/actions/runs/39880836725) |

No se incrementa la versión visible porque el cambio entregado es solamente una barrera de calidad. Que la regresión automática apruebe no demuestra correspondencia con datos reales de un WMS ni certifica accesibilidad asistiva física.

## Estado y siguiente paso

- **M8-39: completada** bajo sus criterios automatizados; **M8: 1/4**.
- **M7-38: pendiente de aceptación física**; **M7: 5/6**, issue #67.
- **M8-40: próxima**. Auditoría funcional dirigida de navegación, persistencia, accesibilidad, reportes, indicadores y defectos. No cerrar M8 final sin resolver el bloqueo de M7.
- Existe además deuda administrativa de regularización histórica del hito 00 del plan maestro: no se da por cerrado sin su evidencia explícita.

## Observación no bloqueante

En el log de CI aparecen avisos de deprecación del runtime Node utilizado internamente por `actions/checkout@v4` y `actions/setup-node@v4`. Revisar versiones de acciones en M8-40 para reducir riesgo de mantenimiento; las pruebas actuales terminaron correctamente.
