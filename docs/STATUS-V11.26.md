# Estado verificable · v11.26 (M2-03)

**Plan vigente:** [43 microfases](EXECUTION-PLAN-43.md) · [issue maestro #21](https://github.com/harrysxavio/cd-simulator/issues/21).

## Entrega pequeña M2-03

- `src/original-purchase.js` congela un **único registro de compra original** derivado del replay de planificación, antes de simular la sorpresa real. Cada PO guarda ID estable (`PO-<SKU>` dentro de la campaña), SKU, unidades comprometidas, cantidades que cumplirá el proveedor, fecha prevista de llegada y costo unitario estándar.
- `integratedDemand` compara el manifiesto con la ejecución real; `recoveryComparison` verifica que las opciones esperar, reserva, refuerzo, compra urgente y combinación NO reescriban la compra original ni su fecha.
- `campaignSnapshot` utiliza el manifiesto original en lugar de reconstruirlo desde la recuperación, y rechaza cambios falsificados.
- La decisión confirmada guarda las PO originales con sus identidades y fechas en JSON persistido. Se admiten decisiones guardadas anteriormente sin ese campo; se valida cuando está presente.
- Las PO urgentes quedan **separadas** de las originales, con su propio ID. La compra comprometida no equivale a caja efectivamente desembolsada ni a recepción física.

**Límites:** es una cohorte SKU de 12 días, no una promesa comercial real ni integración financiera con el modelo agregado. No cambia la lógica de picking, inventario, forecast ni costos. El manifiesto está congelado para una ejecución/configuración de campaña, no hay backend ni histórico transaccional remoto.

## Estado operativo hasta verificación final

| Microfase | Estado | Evidencia requerida |
|---|---|---|
| 00 · Publicación visible | En curso | Última comprobación HTTP real de Pages y manifest/código; prueba Android físico en M7 |
| 01 · Dimensiones | Código y CI aprobados; publicada pendiente de comprobación | PR #20 fusionado (v11.24) |
| 02 · Apertura física | Código y CI aprobados; publicada pendiente de comprobación | PR #22 fusionado (v11.25) |
| 03 · PO originales congeladas | **En curso** | PR v11.26: Node, Chromium, merge y comprobación HTTP Pages |
| 04–05 · M2 resto | Pendiente | Lecturas físicas únicas y persistencia final |
| 06–42 | Pendiente de cierre | Incrementos previos parciales, según plan |

## Regla de cierre

No se marca 03 completa hasta CI Node y Chromium verdes, merge y verificación HTTP pública de `v11.26` (HTML, `release.json`, JS). Una captura Android real no puede sustituirse por la emulación Chromium.
