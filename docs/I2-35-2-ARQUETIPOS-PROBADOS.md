# I2-35.2 · Catálogo basado en evidencia (primera entrega)

**Estado:** contrato de **tres sondas físicas reproducibles**, pendientes de CI e integración; ninguna está declarada misión jugable. [Plan maestro](I2-PLAN-MAESTRO.md), [matriz física integrada I2-35.1](I2-35-1-CAPACIDADES-FISICAS.md).

## Evidencia concreta
| ID | Contexto | Prueba que debe mantener | Límite |
|---|---|---|---|
| ARC-06 | Alta demanda y límite físico Picking 10 SKU/día | 59 expedidos con tope, 98 sin tope: +39 | Quitar restricción en configuración NO es acción gerencial después de evento |
| ARC-05 | Compras express, stock bajo, Calidad lenta vs prioritaria | Pico retenido 12→0 unidades SKU, expedidos 103→103 | Mejorar un KPI local no garantiza servicio; no existen rechazos de calidad |
| ARC-08 | Calidad lenta; hora adicional costosa | 98→98 expedidos, gasto incremental CLP 0→300.000 | Sin recuperación; gasto no equivale a costo total |

**Modelo único:** `src/i2-operational-archetype-probes.js` importa exclusivamente `i2MvpPhysicalResult`. No duplica movimientos ni modifica baseline, semilla ni inventarios originales. `playable:false` en todas las fichas evita anunciar una misión no terminada. Las pruebas verifican el comportamiento físico.

## Para habilitar misiones en I2-35.2
1. Definir objetivo, disponibilidad inicial, restricciones selladas y momento de revelación; no revelarlas antes.
2. Convertir cada uno en estrategia realmente decidible con información disponible entonces, sin cambiar retroactivamente la historia.
3. Mostrar objetivos y umbrales de servicio/gasto antes de actuar. Comparar con no intervenir y alternativas compatibles.
4. Validar la física y pruebas de escenario extremo, cronología de intervención, ahorro marginal y contraejemplos.
5. Implementar selección en `/juego/` y prueba E2E móvil + accesibilidad, registrar Pages+SHA y QA humana cuando corresponda.

**Advertencia de diversidad:** 3 sondas reproducibles ≠ 3 retos jugables ni cumplimiento global de los 8 arquetipos. ARC-04 (muelle) y ARC-07 (transporte) todavía no tienen testigo de cola; ARC-03 (proveedor tardío) necesita evento exógeno nuevo. Los cinco shocks originales siguen siendo shocks de demanda.

## Checkpoint
- Rama `feat/i2-35-2-evidence-archetypes`, PR por crear; parte de main tras merge de #129.
- Archivos: `src/i2-operational-archetype-probes.js`, `tests/i2-operational-archetype-probes.test.mjs`, este documento y adenda de STATUS.
- CI Node/Chromium del HEAD pendientes.
- Siguiente: revisar tests, fusionar si verdes, y luego diseñar un primer escenario jugable basado en ARC-06 sin confundir cambio externo de límite con una decisión gerencial durante el evento.
- PR #127 mantiene en paralelo el laboratorio de comparaciones post-resultado.
