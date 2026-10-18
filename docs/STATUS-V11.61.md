# Estado técnico v11.61 — M6-32 · Explicación didáctica y evidencia

**Estado:** EN CURSO. Rama `feat/m6-32-decision-explanations`. **No marcar cerrada hasta Node, Chromium, merge, Pages y HTTP público**. Fuente de verdad: [43 microfases](EXECUTION-PLAN-43.md).

## Cambio funcional
- `src/recovery-decision-explanation.js`: modelo inmutable de solo lectura conectado a `consolidatedRecoveryComparisonReadModel`, sin repetir simulaciones, compras, movimientos ni costes.
- Cada una de las cinco opciones (esperar, reserva, refuerzo, compra urgente, combinación) incluye **1. Situación, 2. Acción, 3. Efecto observado, 4. Evidencia numérica y 5. Límites de conclusión**.
- Los pedidos completos y pendientes proceden del mismo baseline y se concilian en las cinco opciones. Cifras: pedidos expedidos desde el CD, pendientes al corte y acumulación de espera en días-pedido. Días 0–12 son días de expedición simulada, jamás ETA al cliente.
- Lectura de reserva sin compras nuevas ni «traslado gratuito»: el costo real del traslado es **desconocido**, no cero. Compras urgentes y refuerzos desglosan sólo compromisos modelados, sin confundirlos con pagos reales, costos integrales ni utilidad.
- Alternativa sin mejora en despachos pero con compromiso genera **alerta pedagógica**, no promesa de rescate. Combinación conserva su replay conjunto sin duplicar pedidos o sumar dos efectos aislados.
- `src/app.js`: guía compacta plegada, selección independiente de las cinco opciones y subpaneles de evidencia/límites. Cambiar la lectura no reescribe decisiones de recuperación ni datos persistidos. La pantalla inicial no se llena de tarjetas extensas.

## Pruebas añadidas
- `tests/recovery-decision-explanation.test.mjs`: cinco opciones auditadas, evidencia y conservation, reserva no tarifada, costo ilustrativo, urgencia fuera de horizonte, validación fail-closed y determinismo del baseline.
- `tests/browser-decision-explanation-m6-32.e2e.mjs`: Android emulado 360/412px y escritorio, selectores reales de opción, paneles plegados, verificación de datos, advertencias, ninguna escritura de recuperación y sin overflow.
- Regresiones completas Node y Chromium: **pendientes de CI**.

## Cierre
- [ ] PR: Node y Chromium aprobados.
- [ ] Merge a `main`, regresiones Node/Chromium de `main` aprobadas.
- [ ] Publicación Pages v11.61 r170 y verificación HTTP (HTML, CSS, JS, release.json) aprobadas.
- [ ] README y plan maestro actualizados con pruebas y **M7-33** como fase siguiente.

**Límite:** prototipo pedagógico sintético/determinista, no WMS, conciliación de cobros, dotación real, ruta de transporte ni resultados prometidos al cliente. Android físico/TalkBack quedan pendientes para M7.
