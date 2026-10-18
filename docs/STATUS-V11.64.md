# Estado v11.64 · M7-35 · Explicaciones didácticas de alertas y decisiones

**Estado:** EN CURSO. Rama `feat/m7-35-decision-alert-literacy`. Integración/publicación pendientes de Node, Chromium, merge, Pages y HTTP. Plan: [43 microfases](EXECUTION-PLAN-43.md).

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
- Regresión completa Node y Chromium: por comprobar.

## Puertas de cierre
- [ ] Node + Chromium PR aprobados.
- [ ] Merge `main`, Node + Chromium de `main` aprobados.
- [ ] Pages v11.64 r173 publicado + verificación HTTP pública aprobada.
- [ ] README y plan maestro actualizados a completada con **M7-36** siguiente.

**Límites:** no prueba con teléfono físico o TalkBack (M7-38); no genera decisiones gerenciales verificadas sobre operaciones reales, ni transporta métricas de turno a pedidos SKU.
