# v11.47 · M4-18 · Resultado económico parcial de la campaña SKU

**Plan de ejecución:** [43 microfases](EXECUTION-PLAN-43.md). **Estado inicial:** propuesta en rama, pendiente de pruebas Node/Chromium, integración y verificación GitHub Pages/HTTP.

## Decisión: contribución parcial, no utilidad ni caja

La microfase M4-14 define tasas de CLP; M4-15 valora el inventario físico por día/SKU; M4-16 separa órdenes comprometidas de recibos físicos y pagos ausentes; M4-17 cobra jornadas efectivamente activadas con tarifa ilustrativa. M4-18 **reutiliza esos modelos canónicos**, sin ejecutar un segundo simulador de stock ni trasladar cifras desde la jornada agregada.

**Fórmula de la campaña (CLP):**

```text
Valor potencial de pedidos COMPLETOS EXPEDIDOS desde el CD
- costo estándar de SKU físicamente expedidos
- refuerzo operativo activado (jornadas efectivas M4-17)
= contribución parcial ESTIMADA de esta cohorte
```

No representa margen contable, margen operativo completo, EBITDA, utilidad neta, ingreso facturado ni flujo bancario. Si el refuerzo se activó y ningún pedido salió del CD, el resultado puede ser **negativo**.

## Entrega M4-18

- `src/sku-economics.js` añade `skuPartialContributionReadModel`: proyección inmutable por día 0–12 de ingresos potenciales por pedidos completos despachados, material expedido a costo estándar y refuerzos aplicados.
- Los pedidos de `campaign.shipments` se concilian con `comparison.recovered.ledger` y con las fechas de `operationalCost.daily`. No se valorizan como venta las órdenes pendientes ni pedidos solo preparados en STAGING-CD.
- El costo de SKU expedidos coincide con `inventoryValuation.daily` y `purchaseCost`; no se vuelve a restar el compromiso de compra original/urgente ni el stock que aún permanece físicamente en el CD.
- El costo de refuerzo proviene exclusivamente de las jornadas conciliadas M4-17, sin tarifas adicionales ficticias de personal/flete/Recepción/Calidad.
- El valor por pedido utiliza la tasa `unitRevenue` efectivamente configurada en `recoveryComparison`, con fuente de catálogo M4-14 o identificador de supuesto personalizado.
- Se muestran **aparte, no como gastos devengados confirmados**, el recargo comprometido por compra urgente y los proxies de penalización/tenencia empleados en comparaciones. Caja, facturación, entrega final al cliente, utilidad y EBITDA reales permanecen `null`.
- `campaignSnapshot()` incorpora `economicResult` a la misma campaña física y un control `checks.economicResult`.
- Panel compacto desplegable en el laboratorio SKU con fórmula, CLP, exclusiones y desglose diario. Se aclara en la traza que los valores incrementales antiguos son **proxies**, no caja real.
- Suite Node para compras urgentes fuera de horizonte, staging bloqueado, colas de Recepción, Calidad retenida, inventario no verificable, cero expediciones, contribución negativa, tasa de ingreso personalizada, reconciliación diaria y eventos/tarifas falsificados. E2E escritorio/teléfono (360/412 px), panel plegado, área mínima de toque y sin scroll horizontal.

## Ejemplo didáctico (hipotético)

Si un CD expide 10 pedidos completos a CLP 9.000 por pedido, consume CLP 52.000 en SKU físicos y activa una jornada de refuerzo a CLP 70.000, entonces:

```text
90.000 valor ilustrativo de expediciones
-52.000 costo estándar de material expedido
-70.000 refuerzo activado
=-32.000 contribución parcial estimada
```

La cifra negativa evidencia que el refuerzo contratado puede superar la contribución de pedidos despachados. **No implica pérdida contable confirmada:** faltan costos base, facturas de venta, pagos, impuestos y otros conceptos.

## Límites explícitos

Un pedido expedido desde el centro de distribución no prueba **entrega al cliente**; valor ilustrativo de expediciones no prueba factura ni cobro. Las compras sin recepción no se convierten en inventario ni en costo de material expedido. El recargo por compra urgente pendiente de factura **no se reconoce automáticamente** como gasto incurrido de esta contribución, sino como compromiso/hipótesis fuera de la resta. Inventario retenido por Calidad, reserva, stock no verificable o staging sigue siendo stock valorado; no es material expedido.

No sumar estas cifras a `finance()` de jornada agregada. Tampoco sumarlas directamente a `netCashDelta` / `economicProxyDelta`, que son comparaciones incrementales con otras hipótesis.

## Siguiente hito

**M4-19: auditoría financiera transversal**: probar reproducibilidad, trazabilidad y exclusividad de cada importe (ingreso de expedición, consumo de inventario, compromiso de compra, recargo, refuerzo y proxies), con pruebas extremas y documentación de límites.

## Puerta de cierre

1. CI Node y Chromium verde en PR.
2. PR fusionada, CI Node y Chromium verde en `main`.
3. Pages desplegado y verificación HTTP efectiva de **v11.47 / revisión 156**.
4. Android físico/TalkBack permanece pendiente para M7.

**Evidencia final:** pendiente al redactar; no marcar completada por mera existencia de código.
