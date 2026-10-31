# I2-37.1 · Corte 1: cierre gerencial en seis preguntas

**Fecha:** 31-10-2026. **Estado:** implementación en rama y PR pendiente de QA/merge. No representa cierre final de I2-37.1, I2-35, F7 o F8.

## Problema
El resultado de la campaña incluía tablero de cuatro ejes, ocho áreas, auditorías, Nico y una larga lista de detalles. La información existía, pero un principiante debía desplazarse por múltiples bloques para entender la relación entre **objetivo → decisión → resultado → costo → cliente → próximo intento**.

## Solución visible
En ambas rutas de cierre (recuperación clásica y combinación confirmada), se presenta primero un resumen de Nico en **seis preguntas**:

1. ¿Qué debía lograr? Objetivo de expedición y límite de gasto incremental.
2. ¿Qué sucedió? Expedidos/pendientes a día 12, en pedidos completos.
3. ¿Qué cambió con mi decisión? Diferencia frente al plan sin intervención.
4. ¿Qué sacrifiqué? Gasto incremental; CLP por pedido recuperado únicamente cuando el denominador es positivo.
5. ¿Qué pasó con el cliente? Se sabe que salió del CD, **no** que se entregó.
6. ¿Qué probaría ahora? Siguiente hipótesis de mejora coherente con las alertas (servicio/costo/pendientes).

**Contrato:** `src/i2-six-question-summary.js` es una lectura pura de `i2SafeScorecard` + `i2EvaluateObjectives`. No genera datos, no modifica el motor, no inspecciona futuro antes del reveal, no inventa productividad/entrega/EBITDA. Usa los mismos resultados físicos de 12 días, y mantiene los paneles técnicos para quien quiera profundizar.

**Archivos:** `src/i2-six-question-summary.js`, `juego/app.js`, `juego/styles.css`, `tests/i2-six-question-summary.test.mjs`, `tests/browser-i2-six-question-summary.e2e.mjs`.

## Puertas de aceptación
- [ ] Node suite completa y prueba nueva (clásico y overtime, datos corruptos).
- [ ] Chromium E2E completo + caso Pixel 7: resumen visible, seis respuestas, sin scroll externo horizontal, recarga y sin filtración antes de revelar.
- [ ] Verificación V1 intacta.
- [ ] PR fusionada y verificación HTTP de `/juego/`, app.js y styles.css con las nuevas firmas.
- [ ] Android real, TalkBack y evaluación pedagógica con principiante (#67): pendiente humana, **no aprobable** por CI.

## Riesgo y siguiente paso
El resumen acorta el camino cognitivo, pero **no elimina todavía** la larga auditoría disponible en la vista de resultados; falta decidir con usuarios dónde colocar análisis profundo y si conviene un diálogo paso a paso. Tampoco crea incidentes independientes de demanda ni aumenta estrategias reales. Completar I2-35.2/35.5 con física y cronología antes de anunciar diversidad operacional.

**Checkpoint para retomar:** inspeccionar PR de esta rama, CI y publicación, actualizar el status. No incrementar el contador principal de 35/41 por tratarse de una hija parcial.
