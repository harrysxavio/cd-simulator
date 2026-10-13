# v11.45 · M4-16 · Conciliación monetaria de compras SKU

Documento de entrega conforme al [plan maestro](EXECUTION-PLAN-43.md).
El estado inicial es EN CURSO: completar PR, CI y publicación antes de cerrar.

## Cambio de la microfase

- Nuevo `src/sku-purchase-cost.js`: lectura de compras por identificador de orden original o urgente, con importes CLP a costo estándar y estados separados de compromiso, incumplimiento proveedor, tránsito, espera de Recepción e ingreso efectivo a bodega.
- Identidad por cada PO: compromiso = incumplimiento + tránsito + espera en muelle + recepción.
- Cruce de cantidades, valores y días de ingreso con el mismo registro físico de M3 y la valorización diaria M4-15. Sin nuevo motor de simulación.
- `campaignSnapshot()` incluye `purchaseCost`, sujeto a `checks.purchaseCost` y rechazo de datos inconsistentes.
- Recargo urgente y compromiso de compra usados como supuesto incremental ilustrativo, no como evidencia de factura o pago. Los pagos verificados permanecen sin dato (null).
- Desplegable compacto en Inventario: compromisos, recepción, valor del material expedido, órdenes y días. No se duplican los indicadores del motor de jornada.
- Pruebas Node y navegador para situaciones normales, tardías y extremas.

## Casos importantes

Una compra urgente prevista para el día 13 no llega dentro del horizonte de 12 días y no agrega stock. Si el proveedor llega pero Recepción está bloqueada, el material espera en muelle y no aumenta inventario. Material recibido y retenido por Calidad sí constituye existencia física, aunque no se pueda preparar. El consumo expedido puede proceder de existencias iniciales y no demuestra pago reciente.

No existe evidencia de facturas, bancos, vencimientos, impuestos, cobro de ventas ni resultado contable. El proxy incremental sigue siendo una hipótesis didáctica distinta del dinero realmente pagado. No sumar estas cifras a la economía agregada de una jornada.

**Próxima M4-17:** costos operacionales por recurso realmente aplicable y período. Posteriores: M4-18 resultado económico y M4-19 auditoría.

**Cierre pendiente:** regresión, Chromium, integración, Pages HTTP v11.45/revisión 154. Android físico y accesibilidad avanzada siguen en M7.
