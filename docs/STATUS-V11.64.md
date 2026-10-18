# Estado v11.64 · M7-35 · Explicaciones didácticas de alertas y decisiones

**Estado:** **COMPLETADA (18 de octubre de 2026, Chile)**. PR, Node, Chromium, merge, Pages y HTTP público verificados. **M7-33 a M7-35: 3/6 completadas.** Plan: [43 microfases](EXECUTION-PLAN-43.md).

## Alcance
- `src/decision-alert-literacy.js`: módulo **puro, inmutable y sin escritura**. Explica las 12 familias existentes de alertas del motor agregado de una jornada: variación de demanda, stock sobrante, refuerzo sin efecto, retorno negativo, insuficiencia de capacidad, exceso o déficit teórico de dotación, modo sin retorno, sobrecosto, brecha de servicio y ausencia de alertas.
- Cada alerta conserva intactos **título, nivel y descripción con evidencia original**, y añade bajo un desplegable «Entender la alerta y qué revisar» las secciones «Qué significa», «Qué revisar antes de actuar» y límite de inferencia.
- Cada área recibe bajo «Llegan → siguen» un detalle opcional «¿Qué significa mi decisión?». Usa solamente entrada, salida, capacidad y etapa para explicar el corte, sin producir otra corrida ni inferir expediciones físicas SKU a partir de unidades equivalentes.
- El modelo pedagógico **rechaza alertas desconocidas**, registros corruptos y etapas inválidas, en vez de inventar recomendaciones de acción.
- La explicación indica que una señal no demuestra por sí sola una causa raíz, gasto real, ahorro efectivo, personas necesarias ni entrega al cliente. El origen es el **motor agregado de una jornada**, separado del libro físico SKU de 12 días.
- `src/app.js` y `src/styles.css`: información opcional plegada por defecto, título visible, área táctil de al menos 44 px, lectura responsive 360/412 px; **no modifica decisiones, demanda, inventario, precios, simulaciones ni localStorage**.

## Pruebas añadidas
- `tests/decision-alert-literacy.test.mjs`: 12 familias, escenarios de alertas reales, advertencias de alcance, inmutabilidad, corrupción, decisiones por área.
- `tests/browser-decision-alert-m7-35.e2e.mjs`: escritorio/Android emulado, avisos y enseñanza desplegable, contexto de la decisión, ninguna mutación de sesión, ancho 360/412 px, toque mínimo y sin overflow.
- Regresión completa Node y Chromium: **aprobadas en PR y después del merge**. El primer Node detectó una aserción sensible a mayúsculas en el texto pedagógico; se ajustó la prueba sin modificar las reglas del simulador y se repitió la suite exitosamente.

## Puertas de cierre
- [x] [PR #62](https://github.com/harrysxavio/cd-simulator/pull/62) aprobado: [Node #39124612296](https://github.com/harrysxavio/cd-simulator/actions/runs/39124612296) y [Chromium #39124612285](https://github.com/harrysxavio/cd-simulator/actions/runs/39124612285).
- [x] [Merge `814d1303`](https://github.com/harrysxavio/cd-simulator/commit/814d1303c1555d82c4ad54fcf2349a407707dc6c) a `main`; [Node #39125060929](https://github.com/harrysxavio/cd-simulator/actions/runs/39125060929) y [Chromium #39125061021](https://github.com/harrysxavio/cd-simulator/actions/runs/39125061021) aprobados.
- [x] [Pages v11.64 r173 #39125060764](https://github.com/harrysxavio/cd-simulator/actions/runs/39125060764) y [verificación HTTP pública #39125060943](https://github.com/harrysxavio/cd-simulator/actions/runs/39125060943) aprobados.
- [x] README y plan maestro actualizados con evidencias; siguiente **M7-36**, comparabilidad y legibilidad de resultados.

**Límites:** no prueba con teléfono físico o TalkBack (M7-38); no genera decisiones gerenciales verificadas sobre operaciones reales, ni transporta métricas de turno a pedidos SKU.
