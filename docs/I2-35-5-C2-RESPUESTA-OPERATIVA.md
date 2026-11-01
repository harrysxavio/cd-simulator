# I2-35.5c2 · Primer punto de decisión operativo fechado

**31-10-2026 · Implementación en rama hasta pasar CI/merge.**

## Qué ve el usuario
- Modo incidente **opt-in**; tras planificar 8 áreas se revela demanda y
  comienza el primer incidente físico, por ejemplo una parada del muelle el día 2.
- Nico muestra SOLO el día del primer incidente: etapa afectada, unidades en
  cola de Recepción, unidades retenidas en Calidad, pedidos expedidos hasta
  ese momento y pedidos todavía pendientes.
- No revela futuros incidentes (p. ej., Calidad día 4), resultado del día 12,
  costos posteriores ni contrafactuales **antes de decidir**.
- Cuatro alternativas cuando existe stock preubicado en reserva:
  no intervenir; compra urgente de 100 % del faltante con llegada al día
  siguiente; compra de igual cobertura con llegada tres días después;
  trasladar la reserva existente al día siguiente; y combinación compra+reserva.
  Sin reserva inicial, se omiten las dos alternativas que la requieren.
- Confirmar la alternativa ejecuta una sola recuperación física con el mismo
  manifiesto original e incidentes. El cierre posterior muestra las seis
  preguntas de Nico, gasto incremental modelado, eventos del periodo y
  comparación con el mismo plan sin incidentes.
- Al volver desde resultados, la elección está bloqueada hasta pulsar
  «Cambiar mi decisión». El reinicio conserva semilla de demanda y de evento.

## Contrato del motor y alcance
`src/i2-incident-response.js` lee exclusivamente el ledger del primer
incidente (sin exponer futuras jornadas), utilizando la misma base congelada
de `i2CompareMultiRecovery`; `i2ConfirmMultiRecovery` persiste el comando.
**Las nuevas acciones no se ejecutan antes ni el mismo día del incidente**:
la compra y el traslado se registran a partir de día del evento + 1.
La compra usa plazo extraordinario didáctico de 1 o 3 jornadas con recargo
existente; NO es un SLA real de proveedor. La reserva no crea existencias.
No se habilita refuerzo de Picking a mitad de campaña: la simulación aún no
tiene capacidad adicional con fecha de inicio, por lo que habilitarlo
equivaldría a intervención retroactiva.

## Límite y siguiente ampliación obligatoria
Este es un primer **checkpoint** ejecutable, no un simulador diario completo:
todavía no permite tomar nuevas decisiones al observar eventos posteriores,
ni cambiar turnos de Recepción/Calidad con costos modelados. La física del
horizonte completo se recalcula con la acción futura seleccionada, preservando
historia anterior al evento. El laboratorio de cinco opciones clásicas del
cierre permanece retrospectivo y correctamente rotulado.

**Siguiente 35.5c3:** agregar navegación jornada por jornada con incidente
nuevo y segundo checkpoint, palancas físicas realmente vinculantes para
Recepción y Calidad con tarifas, restricciones, conservación de stock y
comparador sin spoilers. Luego 35.5d: ≥5 arquetipos discriminantes,
UX/TalkBack real y aceptación de negocio.

## Puertas de aceptación
- Node: snapshot sin datos futuros, fecha de orden posterior, sin reserva
  inexistente, original PO + baseline congelados, coherencia de demanda.
- Chromium Pixel 7: no adelantar el evento del día 4 cuando sucede uno el
  día 2, confirmar no-intervención o compra, persistencia, seis preguntas
  y ausencia de desplazamiento horizontal.
- Suite Node completa, focused I2, Chromium integral, V1, Pages HTTP.
- QA física Android/TalkBack humana permanece abierta issue #67.

**No cerrar** I2-35, F7 o F8 ni sumar IDs a 35/41 por este primer checkpoint.
