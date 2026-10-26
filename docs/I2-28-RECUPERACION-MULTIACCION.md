# I2-28 · Contrato de recuperación multiacción y comparación conjunta

**Estado de alcance:** motor y contrato I2-28. La selección gráfica multilever, restricciones presupuestarias y confirmación persistente pertenecen a **I2-29 e I2-30**; no marcarlas implementadas anticipadamente.

## Diseño

- Se conserva la lista de cinco alternativas existentes de V1 y su `option` habitual. El motor `recoveryComparison` añade solo una ruta opt-in `option:'multi'` + `multiActions`. No altera los resultados anteriores ni introduce un segundo motor SKU.
- Tres palancas independientes compatibles: `urgentPurchase` (cantidad de faltante real, cobertura y día de llegada), `reserveTransfer` (solo unidades ubicadas físicamente en RESERVA-CD desde la apertura, con día propio), `capacityBoost` (80 cupos adicionales de pedidos/jornada con costo modelado por turno efectivamente activado).
- Estado vacío = **no intervenir**, no debe contener simultáneamente «esperar» y otra acción. Contrato canónico: `i2NormalizeMultiRecovery`, versión 1, solo campos autorizados; inactivos se normalizan para evitar replays distintos sin cambio físico.
- Migración lógica de cinco opciones guardadas: `i2LegacyRecoveryToMultiActions`; la migración del estado/UI y persistencia de combos será en I2-30. Para `reserve` legado no hay stock físico supuesto: exige apertura RESERVA-CD real, o la acción queda no disponible.

## Regla de baseline

`i2CompareMultiRecovery({state,plans,reservePercent})` solo funciona después de revelar la sorpresa: toma la misma semilla, configuración avanzada, ocho elecciones y demanda observada que I2. Un único `campaignSkuContract` produce los `skuInputs`. `createRecoveryBaseline` congela escenario anterior a intervenir, compras originales, inventario inicial y fecha de entregas. Cada conjunto llama a `recoveryComparison` con ese **mismo** snapshot y **una sola** `eventSimulation` de compras, traslado y refuerzo combinados.

- El `reservePercent` (0–50 %) es **supuesto de apertura precomprometido**, no acción posshock; cambiarlo cambia `baselineKey` y hace otro escenario. En el MVP I2 ya guardado es cero. La elección física de 25 % de reserva debe quedar disponible en la configuración de escenario **antes** de cerrar Comercial, en una fase UI posterior. No se inventa reserva cuando es 0.
- V1 no cambia el stock inicial. RESERVA-CD forma parte de las existencias iniciales, no stock adicional; moverlo es cambio de ubicación en fecha específica, no una compra. La compra urgente genera PO independiente por SKU y no reescribe las tres originales.
- El gasto incremental modelado separa valor compra urgente + recargo + refuerzo de turnos. No se fuerza pago confirmado, nómina real, tarifa de transporte ni costo operacional total.
- No sumar pedidos recuperados de escenarios independientes: leer `comparison.recovered.completed - baseline.actual.completed` de la corrida conjunta, y comparar el resto del ledger al mismo baseline. Cero ganancia + costo alto es un resultado válido.
- La llegada en día 13 puede comprometer compra, pero no produce mercadería recibida ni recuperaciones al corte día 12. Las acciones deben tener su día y la reserva, si existe, se mueve solo cuando su día llegó.

## Gates I2-28

Pruebas: 5 retos con conjuntos 0/1/2+ palancas y comparaciones con V1; escenario con 25 % de reserva preexistente y 3 palancas simultáneas; conservación diaria A/B/C y pedidos completos; separación de PO originales; costo conciliado; día 13; rechazo de reserva inexistente, contratos falsos, duplicados y revelación prematura. `src/i2-multi-recovery.js` es capa de composición read-only, y la simulación permanece en `src/recovery.js`/`src/events.js`.

Para cierre formal: Node completo + focused I2 + Chromium integral de PR, merge y registro de estado. La experiencia gráfica de varias palancas sigue I2-29, y los eventos persistidos de confirmación siguen I2-30. Verificación física Android/TalkBack posterior.
