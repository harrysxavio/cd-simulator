# Estado v11.62 · M7-33 · Jerarquía visual móvil y KPI compactos

**Estado:** EN CURSO; implementación en rama `feat/m7-33-mobile-hierarchy`. No declarar cerrada antes de Node, Chromium, merge, Pages y HTTP públicos. [Plan de 43 microfases](EXECUTION-PLAN-43.md).

## Alcance
- `src/app.js`: los tres indicadores de pedidos completos de **Resumen** y **Áreas** conservan sus valores físicos, con una sola etiqueta y una cifra por tarjeta; ya no repiten la unidad en un tercer renglón. Cada conjunto enuncia su unidad/alcance una vez. No hay pedidos nuevos ni mezcla SKU/unidades agregadas.
- En el **laboratorio de Inventario**, resumen corto de expedidos/pendientes seguido por panel plegable «Ver supuestos y recorrido físico». Se conservan dentro del panel **15 textos técnicos** sobre pronóstico, compras, restricciones, recepciones, calidad, inventario y proxies económicos; todos los otros acordeones especializados siguen disponibles.
- `src/styles.css`: en móvil hasta 680 px, cada KPI usa una fila de 44 px o más, nombre alineado a la izquierda y número tabular a la derecha, sin bloques gigantes. Mantiene tres tarjetas en escritorio. Contraste, tactilidad del desplegable y lectura numérica son parte de las pruebas.
- Se abre la información necesaria cuando se solicita; el laboratorio físico, las cinco alternativas de recuperación, la persistencia y los modelos económicos no se cambian.
- Texto pedagógico reducido en los dos paneles principales sin eliminar advertencias de alcance: **despachos del CD ≠ entrega al cliente** y **SKU ≠ turno agregado**.

## Pruebas incorporadas
- `tests/browser-mobile-hierarchy-m7-33.e2e.mjs`: Pixel 7 ajustado a 360/412 px + escritorio; tres KPI en filas horizontales con altura 44–68 px; verificación de cero sublíneas de unidad; ocho áreas; navegación entre Resumen, Áreas e Inventario; supuestos ocultos por defecto, expandibles y completos; acceso a las opciones; ausencia de scroll horizontal y errores de consola.
- Suite Node/Chromium completa de regresión: **pendiente CI**.

## Puerta de cierre
- [ ] PR con Node y Chromium aprobados.
- [ ] Merge a `main`, Node y Chromium de `main` aprobados.
- [ ] GitHub Pages v11.62 r171 y verificación HTTP de HTML, CSS, JS, `release.json` aprobadas.
- [ ] Estado maestro/README actualizados; siguiente **M7-34**: primera campaña guiada.

**Limitaciones:** 360 y 412 px en navegador emulado, no prueba con Android físico/TalkBack; esto último corresponde a M7-38. La jerarquía cambia la presentación, no la fidelidad del motor físico ni el alcance económico.
