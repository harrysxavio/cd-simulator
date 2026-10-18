# Estado v11.62 · M7-33 · Jerarquía visual móvil y KPI compactos

**Estado:** **COMPLETADA (17 de octubre de 2026, Chile)**. PR, Node, Chromium, merge, Pages y HTTP público verificados. **M7-33: 1/6 completada**. [Plan de 43 microfases](EXECUTION-PLAN-43.md).

## Alcance
- `src/app.js`: los tres indicadores de pedidos completos de **Resumen** y **Áreas** conservan sus valores físicos, con una sola etiqueta y una cifra por tarjeta; ya no repiten la unidad en un tercer renglón. Cada conjunto enuncia su unidad/alcance una vez. No hay pedidos nuevos ni mezcla SKU/unidades agregadas.
- En el **laboratorio de Inventario**, resumen corto de expedidos/pendientes seguido por panel plegable «Ver supuestos y recorrido físico». Se conservan **14 textos técnicos** dentro del panel y se mantiene visible el **manifiesto original de compra SKU** sobre pronóstico, compras, restricciones, recepciones, calidad, inventario y proxies económicos; todos los otros acordeones especializados siguen disponibles.
- `src/styles.css`: en móvil hasta 680 px, cada KPI usa una fila de 44 px o más, nombre alineado a la izquierda y número tabular a la derecha, sin bloques gigantes. Mantiene tres tarjetas en escritorio. Contraste, tactilidad del desplegable y lectura numérica son parte de las pruebas.
- Se abre la información necesaria cuando se solicita; el laboratorio físico, las cinco alternativas de recuperación, la persistencia y los modelos económicos no se cambian.
- Texto pedagógico reducido en los dos paneles principales sin eliminar advertencias de alcance: **despachos del CD ≠ entrega al cliente** y **SKU ≠ turno agregado**.

## Pruebas incorporadas
- `tests/browser-mobile-hierarchy-m7-33.e2e.mjs`: Pixel 7 ajustado a 360/412 px + escritorio; tres KPI en filas horizontales con altura 44–68 px; verificación de cero sublíneas de unidad; ocho áreas; navegación entre Resumen, Áreas e Inventario; supuestos ocultos por defecto, expandibles y completos; acceso a las opciones; ausencia de scroll horizontal y errores de consola.
- Suite Node/Chromium completa de regresión: **aprobada en PR y después del merge a `main`**. La regresión de Chromium detectó dos incompatibilidades de texto/visibilidad; se conservaron la referencia a 12 días y el manifiesto original, y la prueba histórica ahora abre el detalle operativo antes de auditar las cifras. La ejecución definitiva aprobó **68/68 pruebas**.

## Puerta de cierre
- [x] [PR #60](https://github.com/harrysxavio/cd-simulator/pull/60) aprobado: [Node #39089752715](https://github.com/harrysxavio/cd-simulator/actions/runs/39089752715) y [Chromium #39089752701](https://github.com/harrysxavio/cd-simulator/actions/runs/39089752701).
- [x] [Merge `60439cec`](https://github.com/harrysxavio/cd-simulator/commit/60439cecd1e2e7bf174422c5761e37fae7e1bd49) a `main`; [Node #39090154816](https://github.com/harrysxavio/cd-simulator/actions/runs/39090154816) y [Chromium #39090154806](https://github.com/harrysxavio/cd-simulator/actions/runs/39090154806) aprobados.
- [x] [Pages v11.62 r171 #39090154239](https://github.com/harrysxavio/cd-simulator/actions/runs/39090154239) publicado y [HTTP #39090154807](https://github.com/harrysxavio/cd-simulator/actions/runs/39090154807) aprobó HTML, CSS, JS y `release.json`.
- [x] Estado maestro/README actualizados con evidencia. Siguiente: **M7-34, primera campaña guiada**.

**Limitaciones:** 360 y 412 px en navegador emulado, no prueba con Android físico/TalkBack; esto último corresponde a M7-38. La jerarquía cambia la presentación, no la fidelidad del motor físico ni el alcance económico.
