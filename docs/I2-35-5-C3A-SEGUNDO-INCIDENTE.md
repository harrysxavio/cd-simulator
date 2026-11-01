# I2-35.5c3a · Segundo incidente y segunda decisión sin modificar la historia

**31-10-2026 · Lab11 · microcorte candidato, no aceptado hasta CI/merge/Pages.**

## Para el jugador
1. Solo el reto **opt-in** `ops-combined-01` contiene dos interrupciones:
   Recepción en el día 2 y Calidad en el día 4.
2. Antes de confirmar la primera orden no se revela el segundo evento.
3. Después de la primera decisión, el juego pasa al **día 4** y muestra
   únicamente colas, stock retenido y pedidos hasta esa jornada, evaluados
   bajo la primera orden efectivamente programada; no se muestran cierre
   ni resultado final.
4. La primera orden no se edita. El gerente decide **mantener** o
   añadir una **compra urgente día 5** si no emitió otra, o **movilizar
   reserva preubicada día 5** si no fue usada. Puede combinar ambas
   palancas disponibles. No se inventa capacidad de Recepción/Calidad.
5. Solo después del segundo comando se recalcula la operación completa
   con exactamente las mismas semillas, compras originales y ambos
   incidentes. Nico muestra ambas decisiones y el cierre.

## Qué es físicamente comprobable
- El primer incidente observa la línea base antes de intervenir.
- El segundo incidente observa el escenario físico que ya contiene la
  primera respuesta. Solo se muestra el ledger del día 4, no su futuro.
- No se puede comprar dos veces el mismo faltante global ni mover dos
  veces una reserva con el contrato de palancas actual; una segunda palanca
  solo se añade cuando la primera no la ocupó.
- Un segundo comando no altera **ninguna entrada del ledger 0–4**:
  `tests/i2-second-incident-response.test.mjs` compara cada jornada por
  igualdad exacta; también valida PO originales, baseline key, resultado,
  serialización y rechazo de fechas adulteradas.
- `incidentStep`, `incidentFirstActions` y `incidentSecondDecision`
  guardan exclusivamente decisiones y fechas, nunca los libros de SKU.
- Misiones con un incidente mantienen el flujo de una sola respuesta.
- Las cinco recuperaciones clásicas del laboratorio final permanecen
  comparaciones retrospectivas, no órdenes emitidas en la campaña.

## Límites importantes y siguiente c3b
- **No es un reloj diario completo**: la interfaz salta del día 2 al día 4,
  porque allí aparece el segundo incidente. Entre esos días el motor sí
  procesa movimientos reales; no se ofrecen nuevas decisiones intermedias.
- Las acciones disponibles son compra/reserva/no intervención: faltan
  recursos físicos de muelle, Calidad y dotación con activación fechada,
  tarifas diarias, límites y verificación de gestión.
- Las misiones con un solo incidente siguen mostrando un solo checkpoint;
  falta mayor variedad de situaciones, objetivos y alternativas.
- Reiniciar crea otra tentativa bajo las mismas semillas, sin poder
  editar retrospectivamente órdenes en la partida ya cerrada.
- Entrega cliente final, rentabilidad y productividad por persona-hora
  **no se infieren** de expedición desde CD.

## Validación exigida
- Node: motor y prueba causal de segundo incidente;
- Chromium Pixel 7: dos checkpoints, secretos y persistencia;
- I2 focused + regresión general + V1;
- GitHub Pages live: presencia de `incidentSecondResponseScene`,
  `i2ConfirmNextIncidentResponse`, estilos y no 404.
- Android físico, TalkBack y comprensión por principiantes: pendiente
  humano (issue #67).

**No declarar terminadas I2-35 ni F7 o F8 ni aumentar 35/41 por c3a.**
