# Lab11 · I2-36 · Auditoría de consistencia visual del tema oscuro

**Fecha:** 01-11-2026. **Estado:** cambio preparado en rama; CI y merge se confirman por separado.

## Problema verificado contra código publicado
Misión CD utiliza `--bg:#0e1726`, `--panel:#172438`, `--detail-bg:#142236`,
`--border:#3c506a`, `--text:#f3f5fa` y `--primary:#f97316`.
Sin embargo, los componentes agregados en I2-35.5c/c2/c3a/c3b
referenciaban variables **inexistentes** `--surface`, `--line` y
`--muted-surface` con fallbacks **blancos** y gris claro, y un
borde **azul** `#2563eb`. Esto crea tarjetas blancas con letras
claras y una jerarquía de color incoherente. Además se encontraban
fondos marfil detrás de ilustraciones de Nico y un botón de reto
operacional sin tratamiento visual específico.

## Correcciones incluidas
- Portada de incidente opcional, detalle de eventos, incidentes del día,
  tarjetas de respuesta, confirmación, primera orden y cierre con dos
  decisiones pasan a usar `--panel`, `--detail-bg`, `--border` y
  `--text`; sin fallbacks de tema claro.
- Bordes de énfasis de eventos y de cierre usan `--primary` naranja.
- El botón de activación de incidente usa naranja/detalle del tema,
  tamaño táctil 48px, estado deshabilitado y contorno de foco.
- Fondos de retratos de Nico en paneles antiguos usan `--detail-bg`;
  no se modifica el arte ni sus archivos originales.
- Se conservan estados KPI semánticos verde/ámbar/rojo; el naranja
  representa la marca o el énfasis, no un resultado de negocio.
- Modo de alto contraste `forced-colors` usa colores del sistema,
  con foco destacado, en vez de imponer un esquema oscuro ilegible.
- Texto de la misión explica correctamente que cada futuro incidente
  se revela en su jornada, no únicamente en el cierre.

## Pruebas y criterios de aceptación
`tests/browser-i2-theme-consistency.e2e.mjs` valida el CSS fuente
sin variables inexistentes y comprueba mediante `getComputedStyle`
en Chromium Pixel 7 de 360px y 412px que las tarjetas realmente se
muestran con fondo oscuro, acento naranja, sin banda azul ni desborde
horizontal, desde la portada hasta el cierre del reto combinado.

`scripts/verify-pages.mjs` verifica la hoja de estilos **servida en
GitHub Pages**, no solo el archivo del repositorio. Además se requiere
regresión Node, focused I2, Chromium integral y Pages HTTP verde.

## Trabajo pendiente (sin cambiar conteo)
Este corte mejora el estándar visual I2-36, pero **no cierra I2-36**:
quedan ajustes de interacción, accesibilidad en Android físico,
TalkBack y validación humana. El objetivo total sigue siendo **35/41
padres completos, 6 pendientes I2-35–I2-40**. La siguiente prioridad
continúa siendo palancas físicas de Recepción/Calidad con fecha y costo,
misiones diferenciadas y QA/aceptación integral.

No afirmar publicación hasta merge y verificación HTTP positiva.
