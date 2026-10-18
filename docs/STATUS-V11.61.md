# Estado técnico v11.61 — M6-32 · Explicación didáctica y evidencia

**Estado:** **COMPLETADA (17 de octubre de 2026, Chile)**. PR, Node, Chromium, merge, Pages y HTTP público verificados. **M6-28 a M6-32: 5/5 completadas.** Fuente de verdad: [43 microfases](EXECUTION-PLAN-43.md).

## Cambio funcional
- `src/recovery-decision-explanation.js`: modelo inmutable de solo lectura conectado a `consolidatedRecoveryComparisonReadModel`, sin repetir simulaciones, compras, movimientos ni costes.
- Cada una de las cinco opciones (esperar, reserva, refuerzo, compra urgente, combinación) incluye **1. Situación, 2. Acción, 3. Efecto observado, 4. Evidencia numérica y 5. Límites de conclusión**.
- Los pedidos completos y pendientes proceden del mismo baseline y se concilian en las cinco opciones. Cifras: pedidos expedidos desde el CD, pendientes al corte y acumulación de espera en días-pedido. Días 0–12 son días de expedición simulada, jamás ETA al cliente.
- Lectura de reserva sin compras nuevas ni «traslado gratuito»: el costo real del traslado es **desconocido**, no cero. Compras urgentes y refuerzos desglosan sólo compromisos modelados, sin confundirlos con pagos reales, costos integrales ni utilidad.
- Alternativa sin mejora en despachos pero con compromiso genera **alerta pedagógica**, no promesa de rescate. Combinación conserva su replay conjunto sin duplicar pedidos o sumar dos efectos aislados.
- `src/app.js`: guía compacta plegada, selección independiente de las cinco opciones y subpaneles de evidencia/límites. Cambiar la lectura no reescribe decisiones de recuperación ni datos persistidos. La pantalla inicial no se llena de tarjetas extensas.

## Pruebas añadidas
- `tests/recovery-decision-explanation.test.mjs`: cinco opciones auditadas, evidencia y conservación, reserva no tarifada, costo ilustrativo, urgencia fuera de horizonte, validación fail-closed y determinismo del baseline.
- `tests/browser-decision-explanation-m6-32.e2e.mjs`: Android emulado 360/412px y escritorio, selectores reales de opción, paneles plegados, verificación de datos, advertencias, ninguna escritura de recuperación y sin overflow.
- Regresiones completas Node y Chromium: **aprobadas en el PR y en `main`**.

## Cierre
- [x] [PR #59](https://github.com/harrysxavio/cd-simulator/pull/59): [Node #39087797451](https://github.com/harrysxavio/cd-simulator/actions/runs/39087797451) y [Chromium #39087797456](https://github.com/harrysxavio/cd-simulator/actions/runs/39087797456) aprobados.
- [x] [Merge `66508633`](https://github.com/harrysxavio/cd-simulator/commit/6650863364d31264d3a5e9015a1bc1da971045c3) a `main`; [Node #39088085201](https://github.com/harrysxavio/cd-simulator/actions/runs/39088085201) y [Chromium #39088086296](https://github.com/harrysxavio/cd-simulator/actions/runs/39088086296) aprobados.
- [x] [Pages #39088085229](https://github.com/harrysxavio/cd-simulator/actions/runs/39088085229) publicó v11.61 r170 y [HTTP público #39088085226](https://github.com/harrysxavio/cd-simulator/actions/runs/39088085226) validó HTML, CSS, JS y release.json.
- [x] README y plan maestro actualizados con evidencias de cierre. Siguiente: **M7-33, jerarquía móvil compacta**.

**Límite:** prototipo pedagógico sintético/determinista, no WMS, conciliación de cobros, dotación real, ruta de transporte ni resultados prometidos al cliente. Android físico/TalkBack quedan pendientes para M7.
