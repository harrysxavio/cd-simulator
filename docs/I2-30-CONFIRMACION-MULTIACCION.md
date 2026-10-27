# I2-30 · Confirmación, persistencia y reproducción de una recuperación combinada

## Contrato

I2-29 era previsualización. I2-30 transforma el conjunto elegido en una **decisión gerencial confirmada** únicamente si el jugador pulsa el botón de confirmación específico después de comparar. «No intervenir» es combinación válida de cero palancas.

- Después del reveal se mantiene el selector V1 de cinco alternativas. El panel «Combinar acciones y confirmar un plan» ofrece revisión de servicio/pendientes, recursos y costos. «Volver a editar» cancela sin persistir.
- «Confirmar combinación y ver resultado» ejecuta `i2ConfirmMultiRecovery` y guarda el mínimo evento `recoveryConfirmation`: `{version:1,seed,plannedOrders,observedOrders,baselineKey,actions}`. El evento incluye 3 palancas canónicas, fechas/cobertura y estado del escenario, **no** stock, recepciones, pedidos individuales, libros, resultados de expedición, CLP, nombres, órdenes o tracking.
- Es una ampliación **opcional** del esquema de partida 2 existente; los guardados históricos, la llave de localStorage `supply-lab-i2-v1` y la versión clásica siguen intactos. Los eventos malformados, pre-reveal, no canónicos o con reserva ausente se rechazan. La semilla y la muestra guardadas deben coincidir con las decisiones originales, y el baseline exacto se contrasta en cada reproducción.
- `i2ConfirmedMultiOutcome` **recalcula** el escenario desde `i2CompareMultiRecovery` (la misma `recoveryComparison`/motor SKU de I2-28), y presenta `i2SafeScorecard` + `i2EvaluateObjectives`. No suma efectos de alternativas individuales. El resultado final presenta la combinación seleccionada, pedidos expedidos, pendientes, mejora, gasto parcial, costos de compra y refuerzo, recursos de reserva, turnos y ociosidad.
- Confirmar no toca las ocho elecciones ni las PO originales. El botón del pie que confirma una **alternativa clásica** descarta cualquier evento multi anterior y mantiene la lógica V1. El menú clásico continúa mostrando cinco alternativas.
- En resultado confirmado aparece «Revisar intervención»; permite regresar a recuperación con las palancas elegidas y conservar el cierre mientras no se confirma otro. La opción «Descartar combinación confirmada» vuelve al modo clásico sin modificar la planificación. Reiniciar mantiene semilla y supuestos pre-reveal, pero borra el evento.
- El budget es un **umbral didáctico no bloqueante**. No hay costo operacional total, rentabilidad contable, entregas finales medidas ni productividad real persona-hora. Expedición CD es distinta de entrega consumidor.

## Pruebas y cierre

Node: cinco seeds × 0/1/2/3 palancas, reserva 25 %, guardado/reload/replay mismo baseline, comparador I2-28, validaciones y ataques de almacenamiento, migración histórica, cancelación y reinicio.

Chromium Pixel 7: configuración de reserva previa, confirmación/cancelación y reingreso, recarga persistente, cambio a modo clásico, V1 aislado, ausencia de scroll externo y CTA fijo.

La integración requiere Node general, I2 focused y Chromium integral verdes; el registro de 31/41 será posterior a merge, no anterior. Publicación Pages/HTTP y validación Android físico/TalkBack se verifican de forma separada.

**Siguiente I2-31:** rediseño de resultado gerencial con tablero de cuatro ejes y análisis de Nico. La vista I2-30 es deliberadamente acotada a cierre fiable, y no da por completas F7 ni F8.
