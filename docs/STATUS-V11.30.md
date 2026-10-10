# Estado de ejecución · v11.30 · M3-06 Comercial y Planning

**Plan vigente:** [43 microfases](EXECUTION-PLAN-43.md) · [seguimiento #21](https://github.com/harrysxavio/cd-simulator/issues/21).

## Incremento M3-06

Un mismo compromiso comercial y de planificación, congelado antes de revelar la demanda, se utiliza en las ocho áreas del laboratorio SKU:

- **Comercial:** cohorte original de pedidos completos, pronóstico ajustado, demanda revelada, desviación expresada **en pedidos completos**, nunca unidades físicas ni equivalentes de jornada.
- **Planning:** política de inventario, stock inicial SKU, necesidad por SKU, cobertura de compra configurada, cantidad comprometida, valor estimado y orden original con ID y fecha prevista. La cantidad comprada depende del pronóstico **previo**, nunca del shock posterior.
- **Compras y resultados:** mismo manifiesto original en la simulación base, demanda real y alternativas de recuperación. Las compras extraordinarias no alteran el plan ya comprometido.
- **Validación:** rechaza diferencias entre pronóstico, cobertura, cantidades por SKU, orden original y lectura de las ocho áreas.
- **Didáctica compacta:** modifica el contenido de los dos pasos Comercial y Planning **sin añadir nuevas tarjetas**. Explica directamente por qué un pedido completo no equivale a una unidad SKU.
- **Pruebas:** escenarios con subestimación, sobreestimación y pronóstico exacto; varias coberturas; recuperaciones distintas; registros manipulados; mismas áreas tras navegación y recarga, escritorio y móvil.

**Limitaciones:** es una cohorte física SKU de varios días que se deriva por muestreo de la variación porcentual en la demanda agregada. No agrega stock ni asume que esa muestra sea la demanda total en unidades del modelo de una jornada. No liquida pagos, no registra entrega final al cliente y todavía acopla eventos de Picking y Transporte.

## Estado actual

| Microfase | Estado |
|---|---|
| 00 · Publicación | 🟡 Sin evidencia HTTP pública directa de Pages. La URL no respondió a las consultas externas desde este entorno; no implica que el sitio esté caído. |
| 01–03 · Unidades, apertura, compra original | ✅ Código/CI/merge verificados · PR #20, #22, #23 |
| 04a–04b · Alcance y proyección SKU única | ✅ Código/CI/merge verificados · PR #25, #26 |
| 04c–04d · Modelo físico único | ⏳ Pendientes de integrar M3 Picking/Transporte |
| 05 · Persistencia | ✅ Código/CI/merge verificados · PR #27, v11.29 |
| **06 · Comercial/Planning** | 🔵 Implementada en rama v11.30, falta certificar CI/merge y Pages |
| 07–42 | ⏳ Pendientes de cierre, con avances parciales históricos |

**Siguiente:** M3-07, compras originales con proveedor/plazo por SKU, verificando que las recepciones del proveedor no equivalgan a recepción de bodega. Respetar los gates CI y publicación externa.
