# M8-42 · Acta de preparación técnica de candidata (NO cierre estable)

**Fecha:** 23 octubre 2026 · **Versión funcional:** v11.68 r177 · **Estado:** preparación técnica integrada; **M8-42 sigue ABIERTA/BLOQUEADA** por aceptación física/manual.

## Qué se implementó

- [PR #70](https://github.com/harrysxavio/cd-simulator/pull/70), merge [37b604a](https://github.com/harrysxavio/cd-simulator/commit/37b604a1106bedc0bb1de4cce5dae61f9fe38b47).
- [scripts/release-readiness.mjs](../scripts/release-readiness.mjs) y [núcleo](../scripts/release-readiness-core.mjs): verifican cabecera, manifest, imports, revisión, pauta física y evidencia.
- [RELEASE-ACCEPTANCE.json](RELEASE-ACCEPTANCE.json): registro estructurado con **Android físico, TalkBack y comprensión pendientes**. Campo `stableTag:null`.
- [tests/release-readiness.test.mjs](../tests/release-readiness.test.mjs): nuevos casos de consistencia, manipulación de evidencia y bloqueo de etiqueta.
- [RELEASE-CANDIDATE-M8-42.md](RELEASE-CANDIDATE-M8-42.md): matriz de validación y procedimiento de salida.
- [M7-38-ANDROID-A11Y-CHECKLIST.md](M7-38-ANDROID-A11Y-CHECKLIST.md): la pauta ahora señala **v11.68 r177**.
- Actualización de GitHub Actions: se ejecuta el preflight en la regresión Node.

**Resultado comprobado en PR #70:** [Node 449/449](https://github.com/harrysxavio/cd-simulator/actions/runs/39937103556) y [Chromium 80/80](https://github.com/harrysxavio/cd-simulator/actions/runs/39937103443), ambos `success`. El preflight respondió `technicalContract: passed`, `decision: blocked-manual`, `mayCreateStableTag: false`.

**Main:** comprobar los cuatro runs de Node, Chromium, Pages y HTTP **sobre el último commit de main después de esta acta** antes de afirmar validación final de publicación. La fase no se cerrará incluso si todos aprueban.

## Estado exacto

| Puerta | Estado |
|---|---|
| Contrato automatizado de candidato | Completado en PR; requiere mismo control en main |
| Modelo físico, economía y navegador | PR verde; repetir main |
| Pages y recursos HTTP | Históricamente verificados en v11.68; repetir main |
| Android físico en versión vigente | **SIN EJECUTAR** |
| TalkBack en teléfono real | **SIN EJECUTAR** |
| Comprensión de persona principiante | **SIN EJECUTAR** |
| Etiqueta y GitHub Release estable | **NO REALIZADOS** |

### Regla de no sobredeclaración

Un preflight técnico verde no certifica la experiencia real, no produce un tag ni convierte los datos ficticios en evidencia operacional. Para cerrar M8-42 se exige evidencia humana del [issue #67](https://github.com/harrysxavio/cd-simulator/issues/67) y validación de salida posterior. No hay fecha de cierre prometida ni procesos trabajando en segundo plano.

## Nota histórica M00

Se recuperaron cuatro runs exitosos originales de v11.23, documentados en [M00-EVIDENCIA-HISTORICA.md](M00-EVIDENCIA-HISTORICA.md). El antiguo control físico sigue sin documentarse; **M00 no se declara completada**.

**Fases vigentes:** M7 **5/6**, M8 **3/4**, total **40/43 microfases cerradas** (01–37 y 39–41). Pendientes 00, 38 y 42. El [plan maestro](EXECUTION-PLAN-43.md) es la fuente de verdad para futuras sesiones.
