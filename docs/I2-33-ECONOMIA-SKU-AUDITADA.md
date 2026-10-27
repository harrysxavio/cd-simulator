# I2-33 · Auditoría económica gerencial de SKU (V1, sin contabilidad inventada)

## Intención

Exponer **un pequeño panel plegable** tras los dos KPI principales del resultado de Misión CD que enseñe diferencias entre valor ilustrativo de expedición, costo estándar del material expedido, refuerzo realmente activado, compromisos de compra, gastos incrementales y **contribución parcial didáctica**. No incluye utilidad neta, caja, EBITDA, factura ni entregas al consumidor.

Se reutiliza la auditoría económica ya construida en V1, `skuEconomicAuditReadModel` de `src/sku-economic-audit.js`, y el resultado `skuPartialContributionReadModel` existente. **No inventar un motor, una tarifa de flete, nómina/hora-persona, IVA, comisiones, devoluciones ni nuevos eventos físicos.**

## Flujo

- La vista clásica `i2MvpPhysicalResult` ya genera `canonical.campaign` a partir del mismo motor SKU, por lo que `i2EconomicEvidence` proyecta únicamente columnas auditadas de `campaign.economicAudit`, `purchaseCost`, `economicResult`, `operationalCost` e `inventoryValuation`. Nada sin revisar sale a la UI.
- La intervención combinada confirmada `i2ConfirmedMultiOutcome` evalúa el mismo replay físico de I2-28 y genera un `campaignSnapshot` **solo de lectura** a partir de la comparación existente, sin repetir el motor físico. El auditor V1 concilia todas las unidades y cantidades. No guarda ledgers completos ni resultados derivados en localStorage.
- `i2EconomicManagerReading` coteja seleccionado y baseline original (`option=wait`) por `baselineKey`, cantidad expedida, compromiso de compra original y gasto incremental modelado de `i2SafeScorecard`. La decisión puede ser 0, 1 o más palancas.
- Cálculo de aporte didáctico **desde el auditor existente:** `valor ilustrativo de pedidos completos expedidos − SKU físicamente expedidos valorizados a costo estándar − refuerzos activados`. Se muestra la contribución parcial del original, del elegido y la variación, **sin clasificarlo como caja, margen de utilidad, EBITDA ni ganancia total**.
- Costo incremental por pedido recuperado: `incrementalExpenseCLP / recoveredOrders` **solo si `recoveredOrders > 0`**; si 0 o negativo, `null` = no calculable. No dividir por número de SKU ni llamarlo costo total por pedido. Advertir gasto positivo sin pedidos recuperados.
- Compras: CLP comprometidos originales/urgentes, recibidos valorizados por PO y pendientes en muelle/tránsito/proveedor. Apertura física + recibidos = costo estándar expedido + valor inventario físico final, sin sumar otra vez compras como gasto después de material consumido.
- Cada jornada 0–12 muestra recibos, expedición, material, refuerzo activo y contribución parcial conciliada. No usa números de otro motor agregado.
- Mostrar límites de datos: pagos facturados, efectivo cobrado, personas-hora, fletes y costo operacional total = desconocidos, no $0.

## Seguridad, pedagogía y alcance

No almacenar datos sensibles, referencias individuales de clientes, direcciones, eventos SKU privados ni resultados contables. Panel de `<details>` y selector de jornada accesible para móvil, sin scroll corporal o desplazamiento del CTA. Nico explica compromisos, material consumido y la paradoja de recuperar todos los pedidos con un gasto excesivo.

## Aceptación

1. Node general: cinco escenarios exógenos y cinco opciones históricas; cinco semillas con 0/1/2/3 palancas confirmadas; entradas adulteradas, diferencias de escenario y fuentes contables falsas rechazadas. Validar 13 días, tres SKU, identidad de stock/PO, costo de recurso desplegado y divisor cero.
2. Chromium emulado Pixel 7, clásico/multi: cuatro tarjetas, detalle de PO, jornada 12, Nico, nulos de caja/EBITDA, 2 KPI superiores, V1 sin cambios, recarga, 0 scroll exterior.
3. Tres gates verdes (Node, I2 focused, Chromium integral) **antes del merge**. Documentos de fase y contador oficial se actualizan únicamente después.
4. Verificación efectiva de GitHub Pages/HTTP y Android físico/TalkBack: control separado en F8. No afirmar despliegue sin comprobarlo.

**Próxima I2-34:** aprendizajes gerenciales e insignias adjudicadas por hechos de servicio/costo/plazo, no por clics o elegir una palanca fija.
