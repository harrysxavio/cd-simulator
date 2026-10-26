# I2-25 · Transporte y expedición: límite de salida, staging y trazabilidad

**Implementación F5, área 8/8.** Mantiene el motor físico de V1, sus tres SKU y la cohorte hasta el día 12. Esta microfase no implementa I2-26–40 ni certifica el producto.

## Alcance funcional

- Vista antes de revelar: capacidad *supuesto* de 500/800/1000 unidades SKU por jornada desde `NODES.transport`, referencia de 800 y diferencia; sin acceso a demanda real, resultados, entregas de proveedor ni SKU del futuro.
- Después de la sorpresa: lectura **solo del baseline original, SIN recuperación** de `comparison.base.ledger`, contrastada con el auditor de pedidos completos de Picking I2-24. Por jornada 0–12: pedidos expedidos, SKU expedidos, pendientes y kits ya preparados en staging físico cuando existe.
- Distingue `pedido no preparado`, `preparado aún en staging`, `salió del CD` y `entregado al cliente`. El último estado **no es observado** y nunca se afirma como hecho.
- En `eventSimulation` estándar, Picking y transporte ocurren a la vez: **no inventar cola de camiones ni órdenes preparadas sin salida**. En el modo de ensayo `separateTransport:true` hay staging real con capacidad de despacho independiente, y se verifica una ruta con transporte de capacidad cero.
- La utilización porcentual se calcula solo cuando existe un denominador de capacidad física SKU positiva y representa `SKU expedidos / (SKU de capacidad por día × 13 jornadas)`. No es productividad por hora-persona, ocupación de vehículos o rendimiento comercial.
- Nunca añadir al resultado físico cifras de turno agregado, costos contables no observados ni recuperaciones individuales. Una ruta más cara puede no ayudar si la restricción es compras, calidad, inventario o Picking.

## Control de conservación y aceptación

1. I2-25 utiliza el reconciliador `i2PickingFulfillmentReading` de I2-24 para garantizar pedidos, BOM, eventos de preparación y salida válidos.
2. Por día, `shipmentEvents` coincide con `shipped/shippedUnits`, no excede la capacidad SKU ni la capacidad de pedidos del motor. `completed + backlog = orders`; los acumulados son consistentes y staging concilia.
3. Node: cinco semillas × tres opciones, contraste entre distintas recuperaciones con un baseline inmutable, modo staging aislado con capacidad de despacho cero, rechazos de adulteración y congelamiento de read model.
4. E2E móvil: área Transporte, vista previa sin spoiler, CTA fijo, resultados del baseline rotulados, detalle diario, aislamiento del almacenamiento V1.
5. Gates: Node general, I2 focused, Chromium general; después merge a main, Pages/HTTP y registro técnico en `docs/I2-STATUS.md`. **QA Android físico/TalkBack y comprensión humana siguen abiertos.**

**Próxima microfase:** I2-26, evento de demanda exógeno, semilla y revelación transparente sin ajuste artificial a las decisiones del jugador. Recuperación multiacción corresponde a I2-28–30.
