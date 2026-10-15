# Estado v11.57 · M6-28 · Diagnóstico físico a partir de eventos SKU

**Estado:** **completada (14 de octubre de 2026, Chile)**. PR, Node, Chromium, Pages y HTTP públicos aprobados. **Plan vigente:** [43 microfases](EXECUTION-PLAN-43.md).

## Alcance comprobable

- `src/recovery-physical-signals.js`: **solo lectura** del replay de la opción SKU seleccionada y del snapshot de campaña ya auditado; no ejecuta una simulación adicional, modifica compras ni inventa movimientos, trabajadores o despachos.
- Conciliación física por día: solicitados = expedidos + sin preparar + preparados en staging. Los cinco indicadores interpretables son **Recepción** (unidades SKU esperando descarga), **Calidad** (unidades SKU retenidas), **Inventario** (unidades SKU físicamente existentes pero no verificables para Picking), **Picking** (pedidos todavía no preparados) y **Transporte** (pedidos preparados sin expedir, solo cuando el staging está habilitado).
- Por cada área registra cola al corte, máximo, día de mayor cola, días observados y días en que el límite configurado se alcanzó mientras había trabajo pendiente. Conserva fechas día 0–12, identifica coincidencias de señales, y rechaza sumarlas: un pedido puede aparecer asociado a varias colas.
- No asigna una **causa raíz única** a pedidos pendientes: las señales de saturación observada y las colas son hechos del modelo; determinar impacto requiere cambiar un solo factor sobre la misma base congelada (M6-29).
- En despacho conjunto no se inventa cola de Transporte; la separación solo existe con `separateTransport=true`.
- Interfaz compacta de cinco líneas en detalle cerrado inicialmente; desglose por día dentro de otro desplegable. Uso cómodo en 360/412 px y trazabilidad SKU/órdenes separadas.

## Casos de prueba

- Node: reconciliación contable de órdenes por etapa, recepción sin capacidad, Calidad sin liberación, exactitud inventario 0 %, Transporte cerrado con staging y sin staging, simultaneidad de restricciones, manipulación de registros.
- Chromium: móviles 360/412 px, escritorio, 13 días, distinción entre transporte separado/conjunto, persistencia tras recarga, ausencia de errores de consola.

## Límites pedagógicos

- Cola de Recepción/Calidad se mide en **unidades de SKU**, mientras Picking/Transporte se mide en **pedidos**: nunca se suman.
- El stock «no verificable» **sigue físicamente en el CD** y no es merma.
- Llegada de proveedor no equivale a recepción, Picking no equivale a despacho y despacho no prueba entrega al cliente.
- Las cifras son deterministas/sintéticas y no prueban causalidad empresarial.
- Android físico y TalkBack quedan para M7.

## Puerta de cierre

- [PR #55](https://github.com/harrysxavio/cd-simulator/pull/55): Node [#38664288714](https://github.com/harrysxavio/cd-simulator/actions/runs/38664288714) y Chromium [#38664288735](https://github.com/harrysxavio/cd-simulator/actions/runs/38664288735) **aprobados**.
- Merge funcional en `main` `cb30f53a`: Node [#38664748313](https://github.com/harrysxavio/cd-simulator/actions/runs/38664748313) y Chromium [#38664748355](https://github.com/harrysxavio/cd-simulator/actions/runs/38664748355) **aprobados**.
- GitHub Pages público v11.57 r166 [#38664747840](https://github.com/harrysxavio/cd-simulator/actions/runs/38664747840) y HTTP real [#38664748269](https://github.com/harrysxavio/cd-simulator/actions/runs/38664748269) **aprobados**.
- Siguiente: **M6-29**, contrafactual simple con una sola variable y condiciones físicas fijas.
