# Estado v11.29 · M2-05 migración, persistencia y reinicio

**Plan vigente:** [43 microfases](EXECUTION-PLAN-43.md) · [issue maestro #21](https://github.com/harrysxavio/cd-simulator/issues/21).

## Implementación de alcance pequeño

- `src/session-state.js`: validador independiente de DOM/localStorage, esquema de sesión **v3**. Conserva la misma clave **`supply-lab-v90`**, de modo que las sesiones v0–v2 previamente guardadas pueden migrarse sin perder la campaña.
- Esquema con **lista permitida**: ID de campaña, sección, decisiones por área, valores numéricos, acciones, escenario, shock, estrategia, recuperación SKU y decisiones confirmadas. Ningún dato arbitrario se escribe o ejecuta.
- Los valores y selecciones se validan contra los límites del motor; datos no válidos se corrigen a defaults sin inventar existencias físicas ni pedidos. Los estados de una versión futura desconocida o JSON roto se rechazan y no se ejecutan.
- **Decisiones confirmadas:** máximo 25, y únicamente de la misma campaña con estructura compatible. Se mantienen los compromisos de PO originales de M2-03. El contrato y firma de escenario continúan comprobándose mediante `skuDecisionStatus` en cada uso.
- **Eventos físicos:** no se guardan en localStorage. La caché SKU de M2-04b se vacía al reiniciar y se reconstruye determinísticamente con los parámetros al recargar.
- **Pruebas Node:** migración, campos numéricos, registros corruptos, versiones futuras, límites de almacenamiento y decisiones confirmadas. **Chromium:** recuperación de una sesión v2, igualdad de resultados entre pantallas, recarga, JSON corrupto, campaña nueva y móvil Pixel 7.

### Limitación intencional

La persistencia es **local a ese navegador**. No hay sincronización entre dispositivos, backend, copia de seguridad remota ni almacén contable. «Compra confirmada» indica una decisión del simulador, no una PO emitida a un proveedor real. La cohorte SKU y la jornada agregada siguen separadas.

## Estado y puertas

| ID | Estado | Evidencia |
|---|---|---|
| 00 | 🟡 Pendiente | Sin respuesta HTTP externa comprobable de Pages, HTML, manifest y JS; no declarar release público certificado |
| 01, 02, 03 | ✅ Código integrado + CI aprobado | PR #20, #22, #23 |
| 04a, 04b | ✅ Código integrado + CI aprobado | PR #25 y #26; v11.28 en `main` antes de esta entrega |
| 04c–04d | ⏳ Pendiente | Necesitan separación física Picking/Transporte, M3 |
| **05** | 🔵 En curso | PR v11.29: verificar Node y Chromium, fusionar y comprobar Pages |
| 06–42 | ⏳ Pendiente de cierre | Conservar funcionalidades parciales y seguir el plan maestro |

## Siguiente entrega

Una vez que M2-05 supere CI y se integre, iniciar **M3-06 Comercial/Planning** con verificación de pronóstico y pedidos reales respecto a la compra original, o abordar la dependencia mínima de M3 para desbloquear 04c. Mantener siempre una sola responsabilidad comprobable por PR. No convertir las comprobaciones de CI local a una supuesta prueba HTTP pública.
