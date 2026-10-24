# I2-11 · Progreso de cuatro capítulos y mapa de ocho áreas

**Objetivo:** ofrecer orientación constante con mínima densidad visual y sin saltar decisiones ni anticipar la sorpresa de demanda.

## Cuatro capítulos

1. **Prepararse:** portada y briefing.
2. **Planificar:** ocho decisiones canónicas, una por área. El orden y nombre de las áreas sale directamente de `I2_AREAS`.
3. **Responder:** aviso de demanda, recuperación y revisión de las decisiones cerradas.
4. **Aprender:** expedidos, pendientes, restricciones económicas y reinicio.

El encabezado presenta `Capítulo x de 4`, mientras que el rótulo de etapa existente conserva `Área x de 8`. La barra de progreso usa `role=progressbar`, `aria-valuenow` y una explicación legible que identifica la pantalla y las decisiones cerradas.

El porcentaje mide **progreso pedagógico de una campaña** y es aproximado (no mide tiempo ni rendimiento operacional): 0 en portada, 10–74 durante planificación, 78 al cerrar el plan, 92 en recuperación o revisión y 100 al finalizar. Al consultar decisiones confirmadas el porcentaje no retrocede ni finge nuevos avances.

## Mapa opcional

El botón «Ver mapa» abre un diálogo accesible de I2-10 con los cuatro capítulos y los nombres de las ocho áreas. **No tiene enlaces ni botones que permitan saltar decisiones.** El mapa enumera las áreas, pero no expone demanda real, pedidos entregados, costo o resultados futuros mientras no se hayan revelado; el único botón del diálogo es cerrar. Su apertura no modifica decisiones, compra original, recuperación ni persistencia.

El encabezado mantiene el footer fijo; el contenido central sigue siendo el único scroll vertical del juego. El botón de mapa es táctil ≥44px, tiene foco visible y funciona con colores forzados y movimiento reducido.

## Evidencias y aceptación

- `src/i2-game-progress.js`: contrato de estados de cuatro capítulos y ocho áreas (puro; no llama motor ni DOM).
- `tests/i2-game-progress.test.mjs`: progreso, retroceso en áreas confirmadas, respuesta, revisión y aprendizaje; cero resultados futuros visibles.
- `tests/browser-i2-chapter-progress.e2e.mjs`: recorrido completo teléfono; avance de capítulo, mapa y Escape; pruebas de 320/360/412px, 740×360 y viewport estrecho; CTA permanece en pantalla.
- `scripts/verify-pages.mjs`: prueba que el HTML, JS del progreso y hoja de ayuda realmente se publiquen en GitHub Pages.
- Regresión Node, focused y Chromium completo, merge y verificación pública requerida.

**Pendiente:** pruebas manuales de TalkBack, zoom Android real y comprensión de las etiquetas con un usuario principiante. I2-12 desarrollará el acompañante opcional sin alterar ningún cálculo del motor.
