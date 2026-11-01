# I2-35.5c3c · Respuesta gerencial fechada de Calidad con recursos físicos y costo

**Corte:** 1 de noviembre de 2026, Lab11. **Estado de rama hasta CI/PR/merge/Pages.**

## Problema que resolvemos
La misión con dos incidentes permitía comprar SKU o trasladar reserva, pero
no reaccionar directamente a un bloqueo de Calidad. Comprar durante una
parada de inspección puede ser la decisión equivocada si los SKU ya existen
y el cuello de botella es la liberación.

## Nueva decisión jugable, disponible solo al observar el segundo incidente
**Contratar una línea alternativa certificada de Calidad para el día 5.**
- Contrato didáctico fijo e inalterable: `quality-certified-alternate-line`,
  **día 5**, máximo **80 unidades SKU liberables**, **$70.000 CLP** por
  una jornada contratada. No son horas de trabajo o tarifa acreditada.
- **La línea principal de Calidad permanece detenida** durante los
  días 4 y 5. No es una herramienta para cancelar el evento externo.
- El motor aplica una *vía alternativa de liberación* FIFO sobre los
  lotes físicos ya recibidos y retenidos en Quality, en día 5.
- Si no existe stock pendiente en Calidad, la intervención puede liberar
  **cero SKU**, pero **se cobra el turno comprometido completo**.
- Los SKU liberados pasan a la ubicación disponible para Picking en ese
  mismo día. Solo se pueden expedir pedidos completos con BOM, inventario
  y capacidad de las otras áreas realmente disponibles.
- Se permite haber emitido compra o traslado de reserva el día 2; esta
  decisión de Calidad no reescribe esos comandos, sus fechas ni el PO original.
  Las opciones anteriores y la V1 mantienen su ejecución.
- La puntuación de gasto suma **compra urgente + recargo + refuerzo de
  picking + $70.000 de la vía alternativa**, sin doble contabilizar.
  El proxy económico se reduce por el costo; solo mejora si existe
  recuperación física de expediciones o penalidades evitadas.

## Archivos y frontera de implementación
- `src/i2-quality-bridge.js` contrato y validación de capacidades,
  fechas y costo; únicamente si el incidente Calidad realmente ocupa día 5.
- `src/events.js` alternativa física FIFO y hechos diarios sin alterar
  `qualityStopped`; ledger de contratación solo **en día 5**.
- `src/recovery.js` y `src/i2-multi-recovery.js` replays y costo
  incremental contra el mismo baseline original congelado.
- `src/i2-game-state.js` persistencia mínima `operationalResponse`,
  validada contra `incidentStep===2` y `incidentSecondDecision`.
  No se guarda inventario, dinero inventado ni snapshots.
- `src/i2-incident-response.js` confirmación solo en el checkpoint
  día 4; `src/i2-daily-operations.js` permite ver únicamente
  unidades liberadas/costo de la jornada observada.
- `juego/app.js` decisión de Nico, evidencia día 5 y resultado;
  `juego/styles.css` tema oscuro/naranja.
- `tests/i2-quality-bridge.test.mjs` verificaciones de igualdad
  exacta del ledger **días 0–4**, mismo PO, mismo incidente activo,
  capacidad <=80, pago de 70.000, invariantes de gasto, migración de
  partida y rechazo de comandos falsificados.
- `tests/browser-i2-quality-bridge.e2e.mjs` Pixel 7 desde el
  primer incidente, segundo checkpoint, día 5 y resultado.
- `scripts/verify-pages.mjs` comprueba que el código físico,
  los costos y la UI estén publicados realmente por HTTP.

## Límites y próximos cortes
- **Es un parámetro pedagógico fijo, no tarifa ni dotación real.**
  No equivale a autorizar legalmente una liberación sin control
  sanitario o regulatorio; solo representa una línea certificada
  paralela con su capacidad y costo.
- No existe aún respuesta propia del muelle a partir del día 2; ni
  contrato general de refuerzos por área/duración/turno.
- No promete recuperar pedidos: otros límites de Picking, Transporte
  o faltantes pueden dominar el resultado.
- Todavía faltan cinco arquetipos discriminantes, refinamiento móvil
  del aprendizaje, historial de intentos, QA Android/TalkBack y
  aceptación humana gerencial.
- **Fases principales: 35/41** (F7 4/5, F8 0/5). Este avance es
  **c3c parcial dentro de I2-35** y no cierra uno de los seis padres
  I2-35–I2-40.

## Puertas
Node completo, focused I2, Chromium integral, Pages build y verificación
HTTP pública. Solo tras estos checks se puede decir publicado.
