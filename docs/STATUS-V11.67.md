# Estado v11.67 · M7-38 · Accesibilidad móvil, foco y controles táctiles

**Estado:** **IMPLEMENTACIÓN EN CURSO, cierre físico pendiente.** Rama `feat/m7-38-mobile-accessibility`. Faltan inicialmente PR, regresiones Node/Chromium, merge, Pages y HTTP. **Android físico, TalkBack y prueba de comprensión todavía NO ejecutados**: requisitos explícitos del plan y bloqueo permanente del cierre formal hasta recibir evidencias. [Plan de 43 microfases](EXECUTION-PLAN-43.md).

## Cambios
- `index.html`: navegación de cuatro etapas y cinco vistas de resultados convertida en tablists con botones/tabpanels relacionados mediante `role`, `aria-selected`, `aria-controls` y `aria-labelledby`. Agregado enlace de teclado «Saltar al contenido principal». Los paneles inactivos mantienen `hidden` explícito.
- `src/accessibility-keyboard.js`: función inmutable/independiente del navegador para Flecha izquierda/derecha, arriba/abajo, Inicio y Fin con rotación entre pestañas. Eventos nativos de `src/app.js` activan la pestaña correspondiente sin introducir navegación diferente ni modificar el motor.
- `src/app.js`: regla de una única pestaña en orden normal de tabulación, foco retenido en mapa de ocho áreas y controles de decisión recreados después de cada elección. Los botones de mapa exponen nombre, posición y estado legible; los símbolos quedan excluidos del lector mediante `aria-hidden`. Configuración sigue siendo accesible desde su botón independiente.
- `src/styles.css`: foco de teclado visible, enlace de salto visible solo al enfocarse, pestañas 48 px de alto, paneles inactivos realmente ocultos, soporte de movimiento reducido.

## Validación automatizada
- `tests/accessibility-keyboard.test.mjs`: dirección, wrap, Inicio/Fin y estados inválidos.
- `tests/browser-accessibility-m7-38.e2e.mjs`: Chrome Android emulado 360/412 px y escritorio: tablists y tabpanels, foco de mapa y opciones, soporte teclado, salto al contenido, tactilidad mínima, contraste WCAG AA **calculado con CSS real (4,5:1)**, ausencia de overflow y errores de consola.
- Node y Chromium completos: pendientes de GitHub Actions.

## Puertas de integración y cierre
- [ ] PR con Node y Chromium aprobados.
- [ ] Merge `main` y suites Node/Chromium `main` aprobadas.
- [ ] Pages v11.67 r176 desplegado y verificación HTTP pública de HTML/CSS/JS/`release.json` aprobada.
- [ ] README, plan y evidencias del código actualizados.
- [ ] **Obligatorio y no sustituible:** Android físico, navegación real con TalkBack, validación táctil y comprensión de un principiante documentadas según [protocolo](M7-38-ANDROID-A11Y-CHECKLIST.md).

**Importante:** aun con cuatro checks automáticos verdes, el estado correcto será **«código publicado; accesibilidad física pendiente»**, **NO** «M7 6/6 completada». No se inventarán pruebas de dispositivos, de usuarios ni datos de accesibilidad reales. M8-39 puede planificarse, pero M7 no se declarará cerrada mientras esta puerta siga abierta.
