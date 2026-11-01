# Lab12 · I2-36 · Integración de escenarios isométricos del CD

**Corte 01-11-2026. Estado: candidato en rama, no dar por publicado antes de PR verde, merge y Pages/HTTP.**

## Inventario recuperado y reorganización

Los diez PNG solicitados **sí estaban en `main`**, aunque anidados en
`juego/assets/nico/cd_pixelart_set_repo/` y no en la ruta prevista. Se trasladaron mediante
**Git tree SHA sin recompresión ni duplicación de contenido**, a:

- `juego/assets/cd-isometrico/01_centro_logistico_completo.png`
- `juego/assets/cd-isometrico/areas/02_comercial.png`
- `juego/assets/cd-isometrico/areas/03_planificacion.png`
- `juego/assets/cd-isometrico/areas/04_compras.png`
- `juego/assets/cd-isometrico/areas/05_recepcion.png`
- `juego/assets/cd-isometrico/areas/06_calidad.png`
- `juego/assets/cd-isometrico/areas/07_inventario_almacen.png`
- `juego/assets/cd-isometrico/areas/08_picking.png`
- `juego/assets/cd-isometrico/areas/09_transporte_despacho.png`
- `juego/assets/cd-isometrico/areas/10_monitoreo_gerencia.png`

También se reubicó el README del arte. **Peso original aproximado: 19,9 MB** en conjunto.
No se crearon imágenes nuevas ni se usó 3D. Las dimensiones reales y el tipo PNG/alpha
se extraen y registran desde el archivo por `tests/i2-cd-isometric-art.test.mjs`
en CI. Se requiere revisión humana visual de transparencia, recorte y consistencia.

## Decisiones de arquitectura y producto

- **Mapa declarativo puro:** `src/i2-cd-isometric-art.js` mantiene ruta única, etiquetas,
  orden y explicación operativa de cada escena, distinguiendo funciones administrativas
  (Comercial, Planificación y Compras) de actividades físicas.
- **UI desacoplada del motor:** `juego/cd-isometric-scenes.js` crea tarjetas compactas,
  modal ampliado, etiquetas externas de las ocho áreas, carga diferida y texto alternativo.
  No consulta demanda, semillas, partidas guardadas, SKU, economía ni KPI.
- **Nico como guía:** en `juego/nico-journey-dialog.js`, el tutorial de siete pasos presenta
  la vista general y recorre sucesivamente el mapa, planificación, picking y monitoreo.
  Mantiene Anterior/Siguiente/Saltar/Cerrar y el foco.
- **Ocho áreas:** `juego/app.js` muestra una escena compacta antes de las pestañas
  de decisión/indicadores/Nico. El usuario puede ampliar sin perder el formulario.
- **Monitoreo:** solo dentro del diagnóstico posterior a revelar, donde se aclara que
  las gráficas dibujadas **no son KPI de la partida**.
- **Incidentes:** Recepción y Calidad se representan solo en los puntos de
  respuesta observados, nunca como predicción de futuras incidencias.
- **Visual:** `juego/styles.css` preserva fondo azul oscuro y acento naranja;
  imágenes `object-fit:contain`, sin hotspots ambiguos, botones táctiles ≥44 px,
  compacto en 320 px, horizontal con alturas reducidas y `forced-colors`.

## Ocho submicrofases de integración (dentro de I2-36, sin IDs oficiales nuevos)

| Corte | Alcance | Estado de desarrollo | Aceptación |
|---|---|---|---|
| A1 | Descubrir diez recursos y mover sin duplicar | Implementado en rama | Metadatos PNG, visual y CI pendiente |
| A2 | Fuente única de rutas, componente, errores y lazy load | Implementado en rama | Node y Chromium pendientes |
| A3 | Mapa inicial y tutorial Nico progresivo | Implementado en rama | Chromium y comprensión humana pendientes |
| A4 | Ocho áreas con imagen compacta ampliable | Implementado en rama | E2E ocho decisiones pendiente |
| A5 | Monitoreo y oficinas de gerencia | Implementado en rama | E2E y revisión UX pendiente |
| A6 | Incidentes de Recepción y Calidad observados | Implementado en rama | E2E y validación contra eventos pendiente |
| A7 | Regresión física, móvil, accesibilidad y diez PNG | Pruebas escritas | Ejecución CI y Android/TalkBack pendientes |
| A8 | PR, merge y publicación Pages/HTTP SHA | Pendiente | No afirmar publicado antes de verificar |

## Pruebas y puerta de publicación

- Node: diez PNG presentes y firma PNG válida, ancho/alto, tipo color y tamaño,
  catálogo consistente y orden administrativo/físico.
- Chromium: HTTP 200 de diez PNG, decodificación real; tutorial/retorno sin escribir
  estado, ocho tarjetas por área, modal con foco, sin 404 ni error JS, comprobación
  de 320/360/430 px y horizontal, diagnóstico solo después de revelar.
- Regresión V1, pruebas I2 enfocadas y navegador integral en los workflows existentes.
- `scripts/verify-pages.mjs`: verificar código nuevo y SHA-256 comparando los diez
  PNG originales locales con los servidos realmente por GitHub Pages.
- Pendiente **QA humana** en Android físico/TalkBack y evaluación con personas.
- Optimizaciones siguientes: **derivados WebP/AVIF** a menor tamaño conservando
  los PNG originales; no inventar ahorro hasta medirlos y compararlos visualmente.

## Definición de terminado

**Ilustración del CD → explicación breve de Nico → decisión gerencial → consecuencia
calculada por motor canónico → aprendizaje.** El arte aporta contexto, no capacidad
adicional ni mejora una métrica. Permanecen abiertas I2-35–I2-40; el contador oficial
es 35/41 hasta que las fases padre realmente superen su aceptación.

**Jugar (versión publicada de main, no esta rama todavía):**
https://harrysxavio.github.io/cd-simulator/juego/
