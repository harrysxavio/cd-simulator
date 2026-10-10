# Estado v11.38 · M3-12c · Staging visible y persistente

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md) · [issue #21](https://github.com/harrysxavio/cd-simulator/issues/21).

## Entrega de producto

- En el laboratorio SKU hay un **control explícito** «Activar staging de pedidos preparados». Se puede volver al modo tradicional sin reiniciar la campaña. Se conserva solo un booleano en la sesión, nunca la simulación ni el stock como datos persistidos.
- La activación usa exactamente la misma `skuSession` para proyectar comparación, Compras, Recepción, Calidad, Inventario, Picking y Transporte. El modo antiguo sigue por defecto; las decisiones confirmadas previamente no cambian de firma salvo elección explícita.
- En Resumen y las ocho áreas, **tres estados concretos** sustituyen los KPI repetidos al activar el modo: «Sin preparar», «En staging», «Salieron del CD». El detalle por día separa preparaciones, pedidos esperando camión, expedidos y unidades físicas STAGING-CD. No añadimos tarjetas grandes.
- La auditoría de la cohorte SKU y la conciliación de proveedores valoran **STAGING-CD como stock físico**, no como merma: apertura + recibido = expedido + PICK-FACE + STAGING-CD + RESERVA-CD + Calidad retenida.
- El simulador no inventa entregas al cliente, no mezcla unidades equivalentes de la jornada agregada con unidades SKU de la cohorte y no altera órdenes de compra originales.
- Pruebas Node: persistencia compatible con versiones anteriores, opt-in, conservación física/económica con staging, proyección cacheada única y retorno al modo antiguo.
- Pruebas Chromium desktop y Pixel 7: pulsación del control, tres estados conciliados, lectura diaria, reload, apagar staging y ausencia de desbordamiento horizontal a 360/412 px.

## Límites

La activación es didáctica y puede habilitarse desde los resultados SKU; el modo tradicional queda seleccionado por defecto para preservar los resultados y las confirmaciones de sesiones antiguas. Los camiones no representan rutas reales ni comprobantes de entrega. No implica convertir automáticamente la economía agregada a la cohorte SKU.

## Estado previo a CI/merge

| Microfase | Estado |
|---|---|
| 00 · Publicación HTTP | 🟡 Pendiente de comprobación del sitio público |
| 01–03, 04a–04b, 05–11 | ✅ Código/CI/merge integrados |
| 12a · Núcleo staging | ✅ PR #34 v11.36 |
| 12b · Lecturas de Inventario y cadena | ✅ PR #35 v11.37 |
| **12c · Activación móvil y sesión** | 🔵 Rama v11.38; CI/merge por comprobar |
| 04c–04d · Dependencias físicas | ⏳ Verificar cierre tras M3-12c |
| 13–42 | ⏳ Pendientes de cierre, con trabajo anterior aprovechable |

**Siguiente:** M3-13 consolidar los contratos físicos entre ocho áreas y confirmar las dependencias 04c/04d; no cerrar prematuramente ni confundir la trazabilidad del despacho con la entrega final.
