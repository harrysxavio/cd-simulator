# Estado v11.48 · M4-19 · Auditoría financiera de la campaña SKU

Plan vigente: [43 microfases](EXECUTION-PLAN-43.md). **Estado inicial: en revisión; no dar por cerrada sin evidencia de PR, CI, Pages y HTTP.**

## Objetivo didáctico

Probar, con fuentes independientes y fechas, que **un movimiento físico genera como máximo un importe en la contribución parcial** y que los importes que solo son compromisos, ubicaciones o hipótesis no se suman a los gastos ni al flujo bancario.

El sistema dispone de fuentes previas M4-14 a M4-18:
- M4-14: catálogo común de tarifas CLP ilustrativas.
- M4-15: inventario valorizado por día/SKU en ubicaciones excluyentes.
- M4-16: compromisos por PO, proveedor, tránsito, muelle, ingreso real al CD; no identifica pagos.
- M4-17: costo de jornadas adicionales realmente activadas, con capacidad ociosa pagable.
- M4-18: contribución parcial del valor potencial de expediciones completas menos consumo SKU y refuerzos; no es utilidad/EBITDA ni caja.

M4-19 usa esas mismas fuentes y, como segunda línea de defensa, vuelve a calcular valores desde **IDs y líneas de expedición, IDs de recepción, catálogo SKU, inventario físico diario y jornadas activadas**, en vez de confiar en las sumas económicas que ya muestra cada pantalla. No ejecuta otra simulación.

## Implementación

Nuevo módulo `src/sku-economic-audit.js`, lectura pura, inmutable y reproducible `skuEconomicAuditReadModel()`:
- Exige la misma cohorte, días, moneda y manifiesto de PO en todas las fuentes.
- Rechaza pedidos/expediciones y recepciones repetidos, tarifas adulteradas, recibos anteriores a llegada del proveedor, líneas de pedido falsas o expediciones que no existen.
- Conciliación POR DÍA y por SKU: recepción documental = recepción física valorizada = valor ingresado del proveedor; expediciones completas documentadas = salida física = costo estándar de SKU; refuerzos cobrados = jornadas adicionales activadas.
- Por día, verifica también zonas excluyentes (PICK-FACE, Calidad, RESERVA-CD, STAGING-CD), y dentro de PICK-FACE la partición verificable/no verificable. Mover inventario entre ubicaciones no equivale a otra compra ni a un ingreso.
- Comprueba los saldos finales: apertura + recibido = material expedido + stock físico final; compromiso de compras = faltante proveedor + tránsito + muelle + ingreso efectivo.
- Recompone **contribución parcial = valor potencial de pedidos realmente expedidos − material expedido − jornadas de refuerzo**, sin restar también las compras que abastecen ese material.
- Verifica las fórmulas de los proxies `netCashDelta` y `economicProxyDelta`, sin trasladarlos a la contribución ni afirmar que sean pagos bancarios.
- Rechaza los campos que atribuyen facturas, nóminas, pagos, utilidad o EBITDA comprobados cuando no hay evidencia; esos datos deben permanecer `null`.
- Lista seis categorías excluidas: compras originales, compras urgentes, recargos urgentes, inventario físico al cierre, penalidades y tenencia hipotética. Las tres categorías incluidas tienen una fuente auditable única.
- `campaignSnapshot()` añade `economicAudit` y `checks.economicAudit` a la misma campaña congelada; ningún evento de stock o pedido se crea, duplica o recalcula.
- Panel móvil plegable de auditoría en Inventario, mostrando solo veredicto breve y subapartados con las tres cuentas incluidas y seis excluidas.

## Riesgos y casos de prueba

Pruebas en `tests/sku-economic-audit.test.mjs` y E2E Chromium:
- Política sin recuperación, traslado de reserva, refuerzo con capacidad ociosa, compras urgentes tardías, bloqueo total de Recepción, retenidos de Calidad, exactitud cero, picking bloqueado y staging sin camión.
- Valor hipotético de expedición personalizado o cero, horizonte de día 0, alta demanda, proveedor que entrega cero, y contribución parcial negativa con Picking pero sin despacho.
- Dos ejecuciones idénticas dan lectura de auditoría idéntica, sin depender de almacenamiento ni estado global.
- Intentos de inflar ventas, cambiar importes diarios, duplicar PO/recibos/expediciones, alterar tarifa/cantidad/fecha o introducir ventas/facturas/pagos inexistentes deben provocar rechazo.
- Vista inicial contraída, desplegables táctiles de al menos 44 px, sin scroll horizontal en 360/412 px, alcance SKU separado de `finance()` de jornada agregada.

## Advertencias explícitas

El veredicto confirma **consistencia de la simulación**, NO hace una auditoría contable o de caja real. El valor de expedición es ilustrativo y no acredita entrega al cliente, facturación ni cobro. Los recargos y penalizaciones no se convierten en gastos efectivamente incurridos sin documentos; el refuerzo es una tarifa didáctica, no nómina. Faltan actividades y tarifas basales de CD, fletes, impuestos, depreciación, devoluciones y facturas.

**Siguiente microfase:** M5-20, baseline inmutable común a todas las alternativas de recuperación, según el plan de 43 microfases.

## Criterio de cierre

1. Node y Chromium de la PR aprobados.
2. Fusión a `main`, Node y Chromium nuevamente aprobados.
3. Pages y HTTP de **v11.48/revisión 157** aprobados.
4. Prueba Android físico/TalkBack continúa programada para M7; no declarar cubierta con emulación.

**Evidencia de cierre:** pendiente de obtención al crear este documento.
