# I2-15 · Configuración avanzada transaccional

**Fecha:** 25-10-2026. **Fase:** F4. **Prioridad:** complejidad del simulador original sin confundir magnitudes físicas.

## Qué se puede configurar

| Campo | Valores | Modelo efectivo |
| --- | --- | --- |
| Pedidos previstos en la muestra | 160, 200, 240 | `plannedSampleOrders` del contrato SKU, que escala también el tamaño de la cohorte observada según la semilla previamente fijada |
| Dotación teórica de Picking | 3, 5, 7 | `scenario.pickingOperators` del motor agregado, trasladado a `pickingUnitCapacity` del modelo SKU como supuesto didáctico |
| Perfil de stock inicial físico A/B/C | 75 %, 100 %, 125 % del catálogo (redondeo hacia abajo) | `skuOpeningState({stock})` dentro del contrato físico SKU: A/B/C reales del modelo, nunca `scenario.initialStock` de la jornada agregada |
| Costo del refuerzo activado | CLP 50.000, 70.000, 100.000 por jornada | `extraCapacityDailyCost` del mismo `recoveryComparison` de V1. Es costo incremental *parcial*, no P&L completo |

**Caso por defecto inalterado:** 200 pedidos, 5 operarios teóricos, catálogo SKU 100 %, CLP 70.000 por jornada; mismas cinco semillas de I2-14. Un usuario puede pulsar «Comenzar misión» sin tocar estos campos.

### Flujo

1. El jugador abre el bloque desplegable de configuración avanzada de la portada.
2. Cambia uno o varios campos. Los cambios permanecen en un borrador local, no se guarda la partida ni se ejecuta el motor.
3. **Cancelar cambios** restablece todos los controles al último valor confirmado. **Guardar configuración** valida la combinación completa, actualiza el estado I2 y refleja el número de pedidos previstos.
4. Al confirmar la primera decisión de Comercial, se bloquean los parámetros avanzados, incluso cuando vuelve al inicio. Reiniciar conserva la semilla y la configuración para un *replay* equivalente.
5. Al revelar la demanda, se calcula el único contrato SKU de 12 días con esas entradas congeladas. La demanda real no aparece antes de la revelación.
6. Para cada intervención, se conserva la misma apertura SKU, las compras originales y el baseline. Los costos modelados se muestran con límites de interpretación explícitos.

### Seguridad de datos y compatibilidad

- El valor `advanced` se incorpora al estado de partida I2 existente; partidas guardadas que no lo contengan migran a defaults sin perder progreso. No se modifica el storage de V1.
- Los campos se validan mediante listas cerradas, incluidas fechas, magnitudes y costos enteros. Campos desconocidos o valores fuera de rango se rechazan.
- La apertura SKU explícita es validada por `skuOpeningState` y auditada por `auditSkuDecisionBoundary`. Se prohíbe enviar un stock agregado como stock físico.
- Solo se persisten configuración, semilla y opciones; nunca movimientos de clientes ni ledger físico.
- El motor agregado actúa como fuente de proxies de capacidad, no como contabilidad ni observación operacional calibrada.

### Qué NO se considera resuelto

No se ha calibrado equivalencia real de operarios ↔ pedidos/hora, ni costo total, inventario financiero completo, ni niveles de dificultad económicos. No se incluyen horas-persona medibles, costos de transporte sin tarifa ni cumplimiento al cliente. La economía completa y los semáforos multieje siguen en F7. Android físico, TalkBack y observación humana siguen en F8.

### Puertas de aceptación

- Unitarias `tests/i2-advanced-settings.test.mjs`: valores inválidos, defaults/migración, ajustes de base SKU y paridad económica de un costo modificado sin alterar stock ni físico.
- Móvil `tests/browser-i2-advanced-settings.e2e.mjs`: editar cuatro campos, cancelar sin tocar storage, guardar/reabrir/reload, bloquear, completar y revelar demanda coherente.
- Suite Node general, Chromium general y focused; luego PR merge, Pages/HTTP y control Chromium postmerge.
- No contar I2-15 completa si el PR o las pruebas fallan.
