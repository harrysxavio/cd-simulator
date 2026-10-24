# I2-07 · Sistema visual semántico de Misión CD

**Fecha:** 24-10-2026 · **Alcance:** solo tema de Misión CD. La V1 conserva CSS, layout y controles sin modificaciones.

## Criterios

- **Naranja significa acción principal**, sin usar el color como señal única. Selección = borde más grueso + check ✓ + `aria-pressed`; decisiones confirmadas = `disabled` y texto explicativo.
- Tokens CSS centrales en `juego/styles.css` para color de texto de acción, foco, fondo de selección, elección, superficie de detalle, advertencia, éxito y error; conservar fondo azul oscuro y naranja existente.
- El contraste de texto normal del sistema debe ser **≥ 4,5:1** para los pares configurados, con anillo de foco al menos **3:1** contra el fondo oscuro. La métrica se calcula desde los valores hex reales en `tests/i2-visual-tokens.test.mjs`, no se estiman tonos a ojo.
- Indicadores táctiles: objetivo mínimo recomendado 44×44 px y borde/foco visibles también en navegación por teclado; el control de objetivo físico móvil sigue en I2-08/I2-09 e I2-37.
- `@media(forced-colors:active)`: botones, enlace de vuelta, `select` y revelaciones usan colores forzados del sistema; selección preserva el borde `Highlight`.
- `prefers-reduced-motion` existente se mantiene; el juego no fuerza animaciones a quien las tenga reducidas.

## Verificación y límites

Los tests Node comprueban WCAG 2.1 AA para colores de texto y focos descritos. El Chromium general y enfocado debe seguir verde y V1 no cambia.

**Pendiente para validación humana:** contraste sobre pantalla real con ajustes de brillo, modo alto contraste Android, lector TalkBack, zoom y comprensión de símbolos por personas. Esta microfase no cierra I2-38 ni certifica WCAG integral de toda la web.

**Siguiente entrega:** I2-08, geometría segura de 100dvh, short-height, orientación y teclado sin ocultar acciones.
