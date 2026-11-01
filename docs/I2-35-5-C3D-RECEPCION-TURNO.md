# Lab11 · I2-35.5c3d · Turno de recuperación de Recepción

**Fecha:** 2026-11-01. **Estado de entrega:** preparada en PR, no publicar ni marcar aceptada sin CI y GitHub Pages HTTP verdes.

## Qué puede hacer el gerente
Al descubrir que el muelle quedó detenido en el **día 2**, ahora existe la decisión **«Contratar turno extra de Recepción · día 3»**. El turno aumenta en **80 SKU** la capacidad física de recepción **solo el día 3** y tiene costo ilustrativo **$55.000 CLP** aunque no se utilice por completo. No reabre el día 2 y no adelanta al proveedor. Si no hay suficientes SKU arribados, no aporta nada; si Calidad, Picking o Transporte limitan la salida, tampoco garantiza más pedidos expedidos.

Se muestra cuánto trabajo realmente superó la capacidad normal (0–80 SKU), costo, cola y pedidos expedidos día por día. Nico explica el trade-off; ningún KPI cambia porque se dibujó una nueva tarjeta.

## Cadena de datos y controles
- Contrato cerrado en `src/i2-receiving-shift.js`; única decisión autorizada tras observar evento de muelle en día 2. `receivingResponse` guarda solo un comando validado, no inventario ni resultados.
- `src/events.js`: procesamiento FIFO del muelle; capacidad día 3 = capacidad normal +80; costo registrado una sola jornada. Días 0–2 idénticos al baseline y PO originales inmutables.
- `src/receiving-ledger.js`: auditor independiente por PO de llegadas, lotes, cola, capacidad efectiva y cupos realmente usados.
- `src/recovery.js`, `src/i2-multi-recovery.js`, `src/sku-economics.js`, `src/sku-economic-audit.js`, `src/campaign.js` e `src/i2-economic-manager.js`: CLP del turno reconciliado una sola vez y contribución parcial didáctica, sin factura, entrega confirmada ni utilidad real.
- `src/i2-incident-response.js`: primera orden no se revoca cuando llega el segundo incidente; el gerente puede contratar además Calidad (hasta 80 SKU, $70.000 CLP) sin borrar el turno de muelle del día 3.
- `juego/app.js`: botón real en el primer incidente, diario día 3 y desglose del resultado final con Nico e ilustraciones ya publicadas.
- `tests/i2-receiving-shift.test.mjs`: contrato contra falsificación, auditoría FIFO/CLP, invariancia días 0–2, PO congeladas, gasto, persistencia y combinación con el segundo incidente.
- `tests/browser-i2-receiving-shift.e2e.mjs`: Pixel 7 móvil recorre día 2 → turno día 3 → Calidad día 4 → resultado día 12.
- `scripts/verify-pages.mjs`: exige que el motor, el control y el costo estén realmente publicados; preserva el control SHA-256 de los **24 PNG** de Nico.

## Limitaciones y siguiente paso
Estos importes/capacidades son **supuestos educativos, NO tarifas ni dotación de Chilexpress**. El reto sigue siendo una cohorte simulada de 12 días. El usuario todavía puede encontrar escenarios donde pagar el turno solo incremente el gasto sin mejorar la expedición, aprendizaje gerencial válido.

Faltan cinco arquetipos operacionales realmente distintos, mejores ayudas por área, historial/comparación de intentos, QA Android/TalkBack, pruebas de extremos y aceptación de lanzamiento. **Estado formal 35/41 fases padre, seis abiertas I2-35–I2-40**. La microfase c3d no cierra I2-35 por sí sola.
