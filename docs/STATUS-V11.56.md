# Estado v11.56 · M5-27 · Confirmación y persistencia verificable

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md). **Estado:** en validación; pendiente Node, Chromium, merge, Pages y HTTP antes del cierre.

## Objetivo

Cerrar M5 asegurando que la alternativa confirmada en Recuperación corresponda exactamente a la **misma cohorte SKU, baseline, fecha, compra y resultado físico** que el usuario examinó, y que la confirmación no se duplique ni desaparezca silenciosamente al actualizar la página.

## Cambios

- La confirmación admite las cinco acciones ya ofrecidas en el comparador: esperar, reserva, compra urgente, refuerzo de capacidad y compra + refuerzo. La opción confirmada **no retrocede a esperar**.
- Nuevo registro **v2** con testigo determinista compacto: utiliza el baseline original, manifest de PO, apertura, órdenes fechadas, expediciones por jornada, movimientos internos, llegadas y valores económicos del **replay elegido**. No guarda el libro completo en `localStorage`.
- Al recargar, la aplicación reconstruye la misma cohorte SKU desde decisiones guardadas, compara el testigo y las cantidades/costos declarados, y solo habilita el bloqueo de decisión si concilia todo. Si cambia la campaña, la configuración o se altera la evidencia, el registro no se aplica.
- Los testigos son **sumas de comprobación no criptográficas** y detectan inconsistencias accidentales o cambios simples; no pretenden autenticar datos contra un usuario que controla su almacenamiento local.
- Las confirmaciones antiguas v1 siguen siendo legibles en sus tres opciones; nuevas confirmaciones v2 se distinguen y conservan compatibilidad con el esquema de sesión v3.
- Doble clic o recarga no genera una segunda PO. Confirmar implica una acción explícita y almacenamiento verificado; si `localStorage` falla, se informa y no se anuncia confirmación persistida.
- Reiniciar campaña limpia todas las decisiones guardadas; el SKU agregado de una jornada no se fusiona con los modelos de inventario, pedidos y costos de la cohorte.
- Pruebas Node y Chromium para cinco opciones, combinación de acciones, refuerzo, recarga, corrupción de cifras, decisión histórica y reinicio. Mobile 360 y 412 px.

## Límites

- La confirmación es **solo dentro del simulador**: no emite orden real, no reserva efectivo, no contrata trabajadores, no asigna ETA real ni confirma entrega al cliente.
- La firma no es seguridad criptográfica, auditoría externa ni protección contra edición maliciosa del almacenamiento.
- Android físico/TalkBack permanece pendiente para M7.

## Evidencia de cierre

- PR y CI: **pendientes**.
- Merge en main + Node/Chromium: **pendientes**.
- Pages v11.56 revisión 165 y HTTP público: **pendientes**.
- **Próxima M6-28:** diagnóstico de cuello de botella físico a partir del libro SKU real, no de causalidad supuesta.
