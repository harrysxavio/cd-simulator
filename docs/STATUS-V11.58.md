# Estado v11.58 · M6-29 · Contrafactual físico de un parámetro SKU

**Estado:** EN CURSO — implementación en rama `feat/m6-29-single-factor`; validación PR, Node, Chromium, merge, Pages y HTTP público pendiente. **Plan vigente:** [43 microfases](EXECUTION-PLAN-43.md).

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
- Regresión completa de Node y Chromium: pendiente de ejecución en CI.

## Puerta de cierre

- [ ] PR con Node y Chromium aprobados.
- [ ] Merge en `main` y regresión Node/Chromium de `main` aprobadas.
- [ ] Publicación GitHub Pages v11.58 r167 aprobada.
- [ ] Verificación HTTP de HTML, JS, CSS y `release.json` aprobada.
- [ ] Registro maestro/README actualizado a «completada», enlaces de evidencia y M6-30 como siguiente fase.

**Límite:** es sensibilidad computacional con condiciones controladas, no una estimación calibrada de costo, causalidad empresarial ni capacidad de personal real. Android físico y TalkBack siguen pendientes de M7.
