# Lab11 · Nico contextual en diario, Calidad y verificación real de los 24 PNG

**Corte:** 1 de noviembre de 2026. Complemento del PR #139, que integró las 24 imágenes originales de la carpeta `juego/assets/nico/expansion-2026-10-31/`.

## Hechos verificados del repositorio
La expansión cuenta con **24 PNG de 320 × 320**, con manifiesto y SHA-256 por archivo: 6 escenas (13–18), 6 gestiones (19–24), 4 resultados (25–28) y 8 gestos (29–36). **Son ilustraciones en tarjetas con esquinas externas transparentes, no siluetas de personajes sin fondo**. Por eso deben mantenerse sus bordes naturales y el fondo azul oscuro/naranja del resto de la UI, no recortarse agresivamente.

El PR #139 conecta los 7 pasos del tutorial, las 8 áreas, demanda observada, consejos y resultados con representaciones distintas. Este complemento cubre pantallas creadas **después del inicio de ese PR**.

## Reglas de uso en las pantallas nuevas

| Momento verificado por el motor | Imagen de la carpeta | Regla |
| --- | --- | --- |
| Jornada ordinaria del diario operativo | `escenas/14_presentar_informacion.png` | No da indicios de eventos futuros |
| Jornada con interrupción física activa, ya observada | `gestos/32_preocupacion.png` | Solo si hay incidente activo ese día |
| Segundo incidente de Calidad, momento de decidir | `gestos/29_idea.png` | No aparece durante el primer incidente |
| Jornada 5 con línea alternativa de Calidad contratada | `escenas/17_explicar_impacto.png` | Solo si el motor registró costo de ese turno |

Nico presenta la información y los costos junto con texto. Las imágenes son decorativas (alt vacío) para no duplicar lectura accesible. Cuentan con fallback a una pose PNG antigua verificable y a `nico.svg`; no alteran el motor, el stock, las PO, los KPI ni el localStorage. La opción de Calidad cuesta $70.000 didácticos y puede liberar hasta 80 SKU, nunca promete un beneficio no calculado.

## Aceptación automatizada
- `tests/i2-nico-expansion-daily.test.mjs`: catálogo y cuatro momentos sin spoilers.
- `tests/browser-i2-nico-daily-quality.e2e.mjs`: prueba Pixel 7 a 360 px; día 3 imagen de datos, día 4 idea ante Calidad, día 5 explicación de impacto con costo físico, día 6 imagen normal; todos los PNG se decodifican y no hay desbordamiento horizontal.
- `scripts/verify-pages.mjs`: descarga los **24 PNG reales desde GitHub Pages** y exige SHA-256 idéntico al manifiesto versionado. Comprueba además el módulo y la UI publicados. Un merge sin publicación o una imagen corrupta no supera esta puerta.
- Gating: Node completo, I2 focused, Chromium integral, deploy Pages y verificación HTTP.

## Límites
QA visual humana en Android físico, VoiceOver/TalkBack y validación gerencial siguen pendientes. No se declara I2-36 ni I2-35 completas: el estado principal se mantiene **35/41** hasta aceptación formal, seis fases I2-35–I2-40 abiertas. No importar ni recrear imágenes: ya están presentes y versionadas.
