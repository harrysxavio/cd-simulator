# I2-16 · Nico, tutor opcional con tres niveles

**Fase:** F4 · **Fecha:** 25-10-2026 · **Estado:** implementación pendiente de pruebas y PR merge.

## Contrato de producto

- **Presentación corta:** Nico es un *coordinador ficticio del CD*, no un sistema de recomendación autónomo ni fuente de verdad. La portada lo presenta con una imagen pixel-art original, pequeña y local (`juego/nico.svg`), y explica que las decisiones son del usuario.
- **Sin opt-in implícito:** inicialmente los consejos están ocultos. Mostrar al personaje no activa tutoría ni consentimiento. El botón de consejo existente permite habilitarla u ocultarla.
- **Perfiles:** Novato, Intermedio y Avanzado, independientes de dificultad, semilla, inventario, capacidades, costos o progreso. Cambian solamente texto didáctico y la duración de la explicación. Nivel por defecto Novato.
- **Tutorial:** panel desplegable opcional con tres pasos adaptados al nivel. No bloquea el botón principal ni genera navegación extra. Se puede cambiar de perfil sin reiniciar la campaña.
- **Aislamiento:** `src/i2-nico-tutorial.js` opera exclusivamente sobre estado de navegación, catálogo de áreas y tips estáticos; nunca importa motor, simulador SKU, pedidos físicos, compras, costos ni resultados.
- **Persistencia:** clave nueva `supply-lab-i2-nico-level-v1` guarda solo el identificador de nivel. La clave anterior de consentimiento/visibilidad `supply-lab-i2-guide-v1` no se cambia, ni el estado I2 ni V1.
- **Arte:** SVG original local de 32×32 px escalado a 40, con paleta contenida azul petróleo/naranja/amarillo, sin Javascript, fuentes externas, enlaces, bibliotecas, tracking ni animación. Imagen decorativa con nombre Nico explícito en HTML; fallback “NC” si no carga. El estilo es un concepto inicial, sujeto a aceptación visual humana.
- **Accesibilidad:** controles táctiles de al menos 44 px, `label` ligado a selector, `summary` nativo, foco contrastado, modo forced-colors, contenido escrito que no depende de imagen. Las modales de ayuda conservan X, Escape, backdrop y restauración de foco implementados en I2-10 / PR #97.

## Qué se verifica

1. Los tres niveles generan 24 consejos de área no repetidos y sin spoilers de demanda real, costos ni pedidos.
2. Cambiar perfil o activar/ocultar consejos deja el estado de campaña I2 y la clave V1 inalterados.
3. Preferencia de nivel persiste tras recarga y no cambia el cálculo del mismo motor físico.
4. Portada compacta para 320/360/390/430 px y pantalla horizontal, sin desplazamiento exterior ni pérdida del botón principal.
5. El archivo SVG se sirve localmente y carga en Chromium sin imágenes externas.
6. Suites Node generales, I2 focused, navegador general y luego Pages/HTTP postmerge.

## Fuera de I2-16

La plantilla de tres pestañas Decisión/Indicadores/Nico y gesto swipe opcional corresponde a **I2-17**; no se adelanta. El arte mostrado es concepto técnico, no aprobación estética ni QA de TalkBack. Android físico, pruebas humanas, KPI de costos integrales y registro de tiempos/productividad continúan pendientes en sus fases respectivas.
