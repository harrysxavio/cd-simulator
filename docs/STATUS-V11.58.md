# Estado v11.58 · M6-29 · Contrafactual físico de un parámetro SKU

**Estado:** **COMPLETADA (16 de octubre de 2026, Chile)**. Implementada, fusionada y publicada en `main`, con Node, Chromium, Pages y HTTP públicos aprobados. **Plan vigente:** [43 microfases](EXECUTION-PLAN-43.md).

## Alcance

- `src/recovery-single-factor.js`: contrafactual determinista con un único parámetro operativo modificado sobre `createRecoveryBaseline()` ya congelado y auditado. El resultado NO altera la decisión seleccionada, sesión persistida ni el flujo agregado de una jornada.
- Variables admitidas: capacidad física de Recepción, tasa de liberación de Calidad, exactitud/verificabilidad de Inventario, capacidad física de Picking, capacidad de Transporte **solo en modo staging separado** y límite común de pedidos por día (se declara explícitamente su efecto compartido).
- Los límites `null` significan **sin tope parametrizado**. No se convierten a cero ni se inventa un límite para habilitar una mejora ficticia.
- Todo el replay del contrafactual conserva la cohorte y BOM por pedido, apertura y reserva, compras originales, proveedor, fechas y demás restricciones. Rechaza otra cohorte, alteración de PO, apertura o más de una variable.
- Comparación visible: antes / después / diferencia de pedidos expedidos y pendientes, más secuencia diaria y días-pedido de backlog para el mismo horizonte SKU.
- Interpretación: efecto condicional dentro del modelo. Mejorar un parámetro puede no aportar nada si otra restricción permanece activa. No se afirma causa raíz única, OTIF real, entrega de última milla ni beneficio garantizado.
- Costo incremental de esta intervención: **no calibrado (null)**, jamás CLP 0 por defecto. No se suma al resultado económico de las recuperaciones existentes.

## Pruebas incorporadas

- `tests/recovery-single-factor.test.mjs`: incrementos de Recepción, Calidad, Inventario, Picking, Transporte separado y capacidad conjunta; restricciones simultáneas sin beneficio; entradas inválidas; determinismo y preservación del baseline; serie diaria y no costo cero.
- `tests/browser-single-factor-m6-29.e2e.mjs`: experiencia Android emulado 360/412 px, escritorio, panel expandible, selección real de factor, comparaciones 13 días, versión publicada y persistencia sin escribir decisiones.
- Regresión completa de Node y Chromium: aprobada en PR y después de integrar en `main`.

## Puerta de cierre

- [x] [PR #56](https://github.com/harrysxavio/cd-simulator/pull/56) aprobado: [Node #38994041262](https://github.com/harrysxavio/cd-simulator/actions/runs/38994041262) y [Chromium #38994041292](https://github.com/harrysxavio/cd-simulator/actions/runs/38994041292).
- [x] [Merge `85627952`](https://github.com/harrysxavio/cd-simulator/commit/85627952a762765ef509c77a02970a9253f35ae9) y [Node #38994383724](https://github.com/harrysxavio/cd-simulator/actions/runs/38994383724) / [Chromium #38994383607](https://github.com/harrysxavio/cd-simulator/actions/runs/38994383607) de `main` aprobados.
- [x] [GitHub Pages v11.58 r167 #38994383039](https://github.com/harrysxavio/cd-simulator/actions/runs/38994383039) aprobado.
- [x] [Verificación HTTP real #38994383562](https://github.com/harrysxavio/cd-simulator/actions/runs/38994383562) aprobada (HTML, JS, CSS y `release.json`).
- [x] Registro maestro y README actualizados a «completada» con evidencias. Siguiente: **M6-30**, contrafactual conjunto con restricciones simultáneas y efecto no aditivo.

**Límite:** es sensibilidad computacional con condiciones controladas, no una estimación calibrada de costo, causalidad empresarial ni capacidad de personal real. Android físico y TalkBack siguen pendientes de M7.
