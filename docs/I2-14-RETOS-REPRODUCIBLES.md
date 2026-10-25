# I2-14 · Retos reproducibles y dificultad antes de planificar

## Alcance de este corte

**Implementación del contrato básico de dificultad** para Misión CD: un catálogo cerrado de cinco semillas, elegibles únicamente antes de la primera decisión confirmada. Incluye las tres etiquetas **Inicial / Intermedio / Avanzado** y dos casos de demanda inferior a la esperada. El reto predeterminado mantiene exactamente el caso alfa original de +40 %.

| Semilla | Dificultad | Desviación real *oculta hasta el reveal* | Pedidos de muestra planificados | Pedidos al revelar |
| --- | --- | --- | --- | --- |
| alpha-case-01 | Inicial | +40 % | 200 | 280 |
| alpha-case-02 | Inicial | +10 % | 200 | 220 |
| alpha-case-03 | Intermedio | −15 % | 200 | 170 |
| alpha-case-04 | Avanzado | +50 % | 200 | 300 |
| alpha-case-05 | Avanzado | −35 % | 200 | 130 |

**Importante:** la dificultad expresa complejidad didáctica del caso, no una garantía de que el resultado será matemáticamente más difícil en cada combinación de decisiones. Estos valores son ficticios, no históricos.

### Contrato funcional

1. Se registra una semilla existente en `src/i2-challenge-config.js` antes de confirmar Comercial.
2. La semilla se guarda junto a la campaña, usando el esquema I2 ya vigente; no se crea ni almacena un ledger de pedidos. Partidas alfa antiguas continúan en `alpha-case-01`.
3. La vista inicial solo presenta nivel y nombre de misión: no revela el sentido ni magnitud de la diferencia. El evento sigue requiriendo acción **Revelar demanda**.
4. Antes de la primera confirmación puede cambiarse el reto. Desde la primera decisión, el selector queda deshabilitado, incluso al volver al briefing.
5. El adaptador SKU sigue utilizando **el mismo motor canónico**; la semilla selecciona solamente el par de demanda esperada/observada. Nunca consulta desempeño, dinero gastado ni acciones del jugador.
6. Reiniciar, repetir la misión o recargar conservan la semilla. Se guardan solo elecciones, progreso y semilla; se respeta el almacenamiento original V1.
7. Los objetivos gerenciales y el gasto incremental se evalúan igual que antes; no se presentan costos integrales desconocidos como si fueran cero.

### Evidencia requerida

- `tests/i2-challenge-config.test.mjs`: cinco semillas, demanda +/- reproducible, coste/stock SKU conciliable, persistencia y migración, escenario de llegada día 13.
- `tests/browser-i2-challenges.e2e.mjs`: viewport móvil, selección, no spoilers, bloqueo tras primera confirmación, revelación y replay.
- Suite Node general, Chromium general, I2 focused y Pages/HTTP tras fusionar; Android real, TalkBack y evaluación de usuario principiante continúan pendientes.

### No incluido / próximas fases

La configuración avanzada (forecast, dotación/stock/capacidad y controles Guardar/Cancelar) sigue en **I2-15**. En **I2-26** se ampliará la narrativa de eventos y su diagnóstico físico, y **I2-35** incorporará niveles/replay comparativo con retos de proveedor tardío, recepción, calidad y sobredotación. Un catálogo de cinco demandas no equivale a cerrar esos dos hitos.

**Cierre I2-14:** se podrá contar la microfase una vez comprobados los gates automatizados y fusionado el PR; esto no certifica F4 completa ni la aplicación estable.
