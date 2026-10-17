# Estado v11.59 · M6-30 · Restricciones simultáneas sobre la misma cohorte SKU

**Estado:** EN CURSO (candidato en `feat/m6-30-paired-counterfactual`). Cierre sujeto a CI/merge/Pages/HTTP. Plan maestro: [43 microfases](EXECUTION-PLAN-43.md).

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
- Regresión Node y Chromium: pendiente de ejecución en CI.

## Puerta de cierre
- [ ] PR con Node y Chromium aprobados.
- [ ] Merge `main` y Node/Chromium aprobados.
- [ ] Pages desplegado v11.59 r168 y HTTP real de manifest, HTML, CSS y JS aprobado.
- [ ] README y plan maestro cierran M6-30 e identifican **M6-31** como siguiente.

**Alcance:** simulación educativa determinista, no auditoría de operación real, forecast de entrega ni costo calibrado. Android físico/TalkBack pendiente de M7.
