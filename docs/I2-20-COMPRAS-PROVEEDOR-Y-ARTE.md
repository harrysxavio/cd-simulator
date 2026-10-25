# I2-20 · Compras, proveedor y recepción SKU

**Fecha:** 25-10-2026. **F5:** tercer frente de ocho. **Cierre condicionado a CI.**

## Lectura educativa antes de revelar demanda

Compras recibe cantidades originales **proyectadas** sobre el forecast y cobertura ya confirmados; no emite una PO real. Tres opciones canónicas de V1: proveedor económico con fill 75 %, confiable 95 %, express 100 %. La tasa seleccionada (75/95/100 %) se transforma primero con `flow` de V1 sobre demanda **planificada** y unidades agregadas enteras (`entregado/agregado solicitado`). Luego se aplica `Math.floor(cantidadOriginalPorSku*tasaEfectiva/100)` a cada A/B/C, exactamente como `campaignSkuContract` y `deliveryTimeline`. Esta tasa efectiva puede ser ligeramente menor que la opción nominal por redondeo; la vista muestra ambas, sin revelar demanda real. El usuario ve solicitado, cumplimiento supuesto, faltante proveedor y plazo estándar por SKU, con contenido desplegable.

**El cumplimiento del proveedor NO es mercancía físicamente recibida.** La llegada nominal no certifica documentación, descarga, ubicación ni liberación. Tampoco se confunde entrega al muelle con salida al cliente o pago efectivo.

## Después del reveal: única fuente de verdad del mismo escenario sin intervención

`i2SupplierOutcomeReading(comparison)` toma las **PO originales** y los `receiptEvents` con lote, fecha y PO del ledger físico `comparison.base.ledger`. Valida los estados con `supplierOrderLedger` existente, no recalcula el cumplimiento ni genera recibos:

- Solicitado original SKU = cumplido + faltante proveedor.
- Cumplido = llegó al corte (día 12) + en tránsito.
- Llegó al CD = ingresado a bodega + cola de Recepción.
- Una compra urgente derivada de recuperación queda **fuera** del registro de órdenes originales; se mantiene la misma base a través de las cinco recuperaciones.
- El usuario ve cuatro totales y puede consultar tres filas A/B/C; no aparecen pedidos ni precios no auditados antes del reveal.

El proveedor se representa con `supplierFillPercent` fijo para los tres SKU: es una elección didáctica, no un SLA contractual, ASN real o promesa comercial vigente. El valor CLP comprometido es una valorización ilustrativa, NO pago, inventario valorizado recibido ni resultado neto.

## Integración visual de Nico incluida en este PR

El usuario adjuntó el ZIP `cd_simulator_nico_assets_backup_2026-10-25.zip`, ya clasificado previamente por el [manifiesto](../juego/assets/nico/manifest.json) bajo `juego/assets/nico/`. El repositorio **aún no incluye el contenido binario** de los 21 PNG; dispone de las rutas exactas, checksums, instalador y visualización protegida:

- `src/i2-nico-art.js`: 12 expresiones y 5 colecciones de iconos, enlazadas con el personaje.
- `juego/app.js`: bienvenida, ayuda, alerta, revelación y resultados pueden mostrar las expresiones cuando los archivos estén presentes.
- `tools/install-nico-assets.py`: extrae y valida **21 PNG sin recomprimir** contra SHA-256, rechaza rutas inválidas y habilita `I2_NICO_ASSETS_READY` solo cuando todos existen.
- Hasta entonces se conserva el SVG local `juego/nico.svg`. **No se afirma que los originales estén subidos.** Las láminas compuestas necesitan recorte/manualidad artística posterior para usarse como iconos individuales.

Ver [guía del respaldo](../juego/assets/nico/README.md) para ejecutar la instalación desde el ZIP original.

## Puertas de aceptación

- Node: `tests/i2-supplier-purchasing.test.mjs`, tres proveedores × coberturas, igualdad con el motor canónico, original inmutable con compra urgente, supplier/dock/receipt ledger, no spoilers.
- Node: `tests/i2-nico-art.test.mjs`, 21 hashes y rutas sin mostrar enlaces inexistentes.
- Chromium móvil: `tests/browser-i2-supplier-purchasing.e2e.mjs`, opción proveedor, modificación, persistencia, sorpresa oculta, cuatro KPI auditados posrevelación, viewport y V1 intacta.
- CI Node general + focused I2 + Chromium general; solo después merge + Pages HTTP. **No contar I2-20 como completa antes de eso**.

## Lo que sigue

I2-21 profundizará Recepción y cola de muelle, seguido por Calidad, Inventario, Picking y Transporte. El control final de costos/servicio/capacidad/espera sigue en F7; Android físico y TalkBack siguen en F8 (#67).
