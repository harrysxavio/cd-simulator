# I2-10 · Hojas de ayuda contextual accesible

**Alcance:** ayuda opcional en Comercial, Planificación, Compras, Recepción, Calidad, Inventario, Picking y Transporte. No cambia el motor, elecciones, guardado ni la V1.

## Comportamiento

- Cada una de las ocho pantallas tiene dos accesos cortos: «¿Qué significa esta área y su KPI?» y «¿Qué podría cambiar con mi decisión?». No se muestran textos largos abiertos por defecto.
- Al activar un acceso aparece un `<dialog>` modal del navegador con título y texto de la fuente canónica V1. Contenido mediante `textContent`, no HTML interpolado.
- Se anuncia mediante `aria-labelledby`, `aria-describedby`, `aria-modal`; el modal usa una capa superior y foco retenido de forma nativa.
- El cierre puede realizarse con «Cerrar ayuda» de altura táctil ≥44px o con Escape, devolviendo el foco al control que abrió la ayuda, sin perder la opción elegida.
- El modal usa `max-height:80dvh`, scroll propio y contraste del tema. El footer de decisión permanece en su sitio y el scroll del documento exterior no se activa.
- Reabrir varias veces no crea copias persistentes ni modifica `localStorage`; las ayudas nunca ejecutan el modelo físico antes de la sorpresa.

## Verificación

- `tests/browser-i2-help-dialog.e2e.mjs` cubre teléfono 320/360/430px, foco, Escape, restablecimiento del elemento, touch y privacidad del estado.
- `tests/browser-i2-mobile-shell.e2e.mjs` y `tests/browser-i2-navigation.e2e.mjs` usan la nueva ayuda modal y validan que el footer siga accesible.
- El resumen financiero final mantiene sus `<details>` originales; las ocho áreas usan ahora un diálogo breve por tema.

## Limitaciones

La compatibilidad con lector de pantalla TalkBack y los gestos físicos no puede certificarse en Chromium emulado. Quedan para la validación manual de I2-38. La preferencia de mostrar/ocultar una persona guía es I2-12; esta microfase no introduce personaje ni forzamiento de ayuda.

**Siguiente microfase:** I2-11, progreso y mapa de cuatro capítulos.
