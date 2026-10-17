# Estado v11.59 · M6-30 · Restricciones simultáneas sobre la misma cohorte SKU

**Estado:** **COMPLETADA (16 de octubre de 2026, Chile)**. PR, Node, Chromium, merge, Pages y HTTP público aprobados. Plan maestro: [43 microfases](EXECUTION-PLAN-43.md).

## Entrega funcional
- `src/recovery-paired-factors.js`: base original + solo A + solo B + ambas A+B sobre el mismo escenario SKU congelado. Usa los controles individuales de M6-29 y hace un replay **físico conjunto propio**, nunca suma pedidos simulados de dos corridas distintas.
- **Interacción en pedidos** = (despachos A+B − despachos base) − [(despachos A − base) + (despachos B − base)]. Puede ser positiva, negativa o nula; no se anuncia como causa raíz, beneficio económico ni pérdida empresarial probada.
- Valida invariantes: BOM e identidad de cada pedido, manifiesto y fechas de proveedor, apertura y reserva de stock, pedidos completos y conciliación diaria del baseline y ejecución conjunta; prohíbe factores duplicados u otros parámetros alterados.
- Capacidad `null` no se convierte en cero; Transporte se separa del Picking **solo con staging activado**. `dailyCapacity` conserva su significado de límite compartido.
- UI móvil con detalle inicialmente cerrado y ejecución diferida hasta abrir: selector de dos restricciones, cuatro resultados físicos, interacción y evolución diaria; no persiste elecciones contrafactuales ni modifica decisiones de recuperación.
- Costo incremental = **no calibrado**, nunca CLP 0 por defecto; sin horas de personal ni plazos de cliente inventados.

## Pruebas
- `tests/recovery-paired-factors.test.mjs`: sinergia recepción-calidad, picking-transporte con staging, conservación por día, bloqueos de parámetros, cero mutación del baseline y determinismo.
- `tests/browser-paired-m6-30.e2e.mjs`: UI desktop/móvil 360/412px, ejecución perezosa, selección de A/B diferentes, lectura 13 días y ausencia de overflow/errores.
- Regresión Node y Chromium: aprobada en el PR y después de integrar en `main`.

## Puerta de cierre
- [x] [PR #57](https://github.com/harrysxavio/cd-simulator/pull/57) aprobado: [Node #38995771982](https://github.com/harrysxavio/cd-simulator/actions/runs/38995771982) y [Chromium #38995771998](https://github.com/harrysxavio/cd-simulator/actions/runs/38995771998); se corrigió una expectativa de texto en E2E antes de fusionar.
- [x] [Merge `9ec918be`](https://github.com/harrysxavio/cd-simulator/commit/9ec918be0a91f6dbc15d7d0b73d6a11ce50d787e), [Node #38996096100](https://github.com/harrysxavio/cd-simulator/actions/runs/38996096100) y [Chromium #38996096074](https://github.com/harrysxavio/cd-simulator/actions/runs/38996096074) de `main` aprobados.
- [x] [Pages #38996095929](https://github.com/harrysxavio/cd-simulator/actions/runs/38996095929) desplegó v11.59 r168 y [HTTP público #38996096082](https://github.com/harrysxavio/cd-simulator/actions/runs/38996096082) aprobó manifiesto, HTML, CSS y JS.
- [x] README y plan maestro cierran M6-30. **Siguiente: M6-31**, recomendaciones con evidencia, costo y viabilidad explícitos.

**Alcance:** simulación educativa determinista, no auditoría de operación real, forecast de entrega ni costo calibrado. Android físico/TalkBack pendiente de M7.
