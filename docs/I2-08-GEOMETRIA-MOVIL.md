# I2-08 · Geometría móvil y footer de Misión CD

**Alcance:** preservar la experiencia de una escena por pantalla, sin scroll de documento para encontrar el botón de decisión.

El CSS existente ya usaba `100dvh`, tres zonas flex (encabezado, contenido y footer) y scroll **exclusivo del contenido**. Esta fase amplía comportamiento para pantallas cortas (altura hasta 480 CSS px), paisaje y viewport estrecho tipo zoom.

## Criterios verificables

- La acción «Confirmar y siguiente» debe estar siempre dentro del viewport, con altura táctil ≥44 px, incluso con ayuda desplegada y foco por teclado.
- El documento no tiene overflow horizontal ni vertical exterior: la escena puede desplazarse independientemente.
- Se incluyen tamaños 320×568, 360×640, 360×760, 390×844, 412×915, 430×932, paisaje 740×360 y viewport CSS extremadamente estrecho 200×460 como **aproximación** a zoom. No confundir la aproximación con una prueba nativa certificada de zoom de navegador.
- Las ayudas expandidas no pisan el footer. El foco permanece accesible al confirmar la decisión y avanzar de área.
- `prefers-reduced-motion: reduce` anula la transición del progreso. Los márgenes de safe area de Android/iOS siguen mediante `env(safe-area-inset-*)`.
- V1 no cambia, no se recrea su layout ni se modifica el motor SKU.

## Evidencia

`tests/browser-i2-mobile-shell.e2e.mjs` ejecuta los controles geométricos y de teclado en Chromium móvil; se añade al workflow enfocado y a la regresión Chromium completa.

## Pendientes deliberados

En un dispositivo físico debe repetirse la revisión con teclado del sistema real, barras de navegador, gestos, zoom del sistema y TalkBack, que siguen en I2-37/I2-38. Esta microfase no declara aceptación humana.

**Siguiente fase:** I2-09, retroceso/confirmación y botones fijos en estados de navegación más complejos.
