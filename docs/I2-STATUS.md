# Implementación 2 · Estado verificable de Misión CD

**Corte:** 23 de octubre de 2026 (Chile) · **Base V1:** v11.68 r177.  
**Plan técnico:** [41 microfases I2-00–I2-40](I2-PLAN-MAESTRO.md) · [Roadmap ejecutivo de 9 fases](I2-ROADMAP-EJECUCION-2026-10-23.md).  
**Enlace de la alfa:** https://harrysxavio.github.io/cd-simulator/juego/  
**Documentación del primer corte vertical:** [I2-MVP-ALFA.md](I2-MVP-ALFA.md).

## Resumen

- **I2-00–I2-03: 4 de 41 microfases con PR fusionado a main (~9,8 % de entregas).** El avance por número de microfases no es porcentaje de esfuerzo ni equivale a certificación del producto final.
- **MVP alfa vertical integrado en PR #79.** Campaña reproducible, ocho decisiones, revelación explícita de demanda +40 %, consulta de cinco recuperaciones, resultado SKU físico y reinicio. Es un corte transversal para probar usabilidad, **no un cierre automático de I2-04 a I2-40**.
- **Control técnico del MVP:** [PR #79](https://github.com/harrysxavio/cd-simulator/pull/79) con Node, Chromium completo y pruebas enfocadas aprobadas antes del merge, commit `5f0186352022e52f398e25ff6afdf0ee7313ba74`. Comprobación post-merge de publicación, HTTP y Chromium en `main` se registra como tarea de liberación.
- **Defecto V1 #73 cerrado:** [PR #74](https://github.com/harrysxavio/cd-simulator/pull/74) integrado, suites main y PR aprobadas. V1 sigue operativa en la ruta raíz.
- **Validación humana aún abierta:** [issue #67](https://github.com/harrysxavio/cd-simulator/issues/67): Android físico, TalkBack, comprensión pedagógica con usuario principiante. Ninguna prueba en Chromium emulado reemplaza esta aceptación.

## Microfases integradas y evidencia

| Microfase | Entrega | Merge | Estado |
| --- | --- | --- | --- |
| I2-00 | Auditoría V1, plan, hallazgos y pruebas | [#71](https://github.com/harrysxavio/cd-simulator/pull/71) | Integrada |
| I2-01 | Contrato de decisiones y unidades SKU | [#76](https://github.com/harrysxavio/cd-simulator/pull/76) | Integrada |
| I2-02 | Ruta real `/juego/`, retorno y aislamiento V1 | [#77](https://github.com/harrysxavio/cd-simulator/pull/77) | Integrada |
| I2-03 | Acceso desde V1, navegación móvil y verificador Pages | [#78](https://github.com/harrysxavio/cd-simulator/pull/78) | Integrada |

## Fases ejecutivas

| Fase | Microfases | Estado formal | Evidencia, pendiente y gate |
| --- | --- | --- | --- |
| F0 · Auditoría | I2-00 | **Completada** | Auditoría y plan fusionados; QA Android de V1 sigue issue independiente |
| F1 · Dos modos navegables | I2-01–03 | **Implementada** | Contrato, ruta y enlace integrados; validar publicación de la alfa |
| F2 · Motor/estado/economía | I2-04–06 | **En curso (alfa parcial)** | Adapter SKU de un caso integrado; falta matriz 8×5, almacenamiento migrable y guardas económicas |
| F3 · UX móvil y guía | I2-07–12 | **Prototipo, no certificada** | Una escena y footer fijo ya evaluados en Chromium; faltan guía final y aceptación Android |
| F4 · Configuración y tutorial | I2-13–17 | **Prototipo parcial** | Introducción y elección básica; faltan configuraciones completa y tutorial accesible |
| F5 · Ocho áreas | I2-18–25 | **Recorrido alfa, no cerrado** | Alternativas reales y secuencia de ocho áreas; falta microaprendizaje y feedback específico por área |
| F6 · Demanda sorpresa y recuperación | I2-26–30 | **Recorrido alfa, no cerrado** | Revelación explícita y cinco estrategias; faltan diagnósticos completos y controles avanzados |
| F7 · Resultados/gamificación | I2-31–35 | **Resultado básico alfa** | KPIs físicos y costos modelados parciales; faltan logros, reto, niveles y comparador más completo |
| F8 · Certificación y publicación estable | I2-36–40 | **Pendiente** | Controles, múltiples dispositivos, accesibilidad/TalkBack, evaluación y release estable |

## MVP alfa: exactamente qué puede probarse

1. Abrir `/juego/` desde la raíz o mediante enlace directo; volver a V1 sin perder campaña.
2. Jugar un caso **fijo** de tres SKU, 200 pedidos planificados en muestra, con demanda real de 280 pedidos (sorpresa +40 %) después del reveal explícito.
3. Seleccionar opciones de las ocho áreas y consultar ayuda opcional, sin cifras físicas de futuro durante el plan.
4. Elegir una de cinco recuperaciones, plazo y cobertura; consultar el efecto **calculado**, confirmar y visualizar expedidos, pendientes y costo incremental **parcial**.
5. Reiniciar la misión y recuperar un avance intermedio por `localStorage` propio, sin guardar datos personales ni libro físico detallado.

**No prometer todavía:** economía total, escenarios configurables libres, múltiples desafíos, personaje avanzado, mejoras móviles en V1 ni certificación humana. Los montos CLP del modelo son ilustrativos: desconocido no significa cero. Despachar desde CD no equivale a entregar al cliente.

## Regla de avance

Cada microfase futura debe contar con contrato, tests, PR, merge y evidencia de despliegue cuando corresponda. La siguiente microfase formal es **I2-04**, cuyo adaptador debe verificar **ocho configuraciones × cinco recuperaciones** contra V1 y aplicar restricciones de frontera física. El MVP alfa es una aceleración de demostración, no una excusa para dar fases por completas.

## Referencias de QA del MVP

- [Node completo PR #79](https://github.com/harrysxavio/cd-simulator/actions/runs/40055438267)
- [Chromium completo PR #79](https://github.com/harrysxavio/cd-simulator/actions/runs/40055438303)
- [Suite focalizada teléfono + motor](https://github.com/harrysxavio/cd-simulator/actions/runs/40055438292)
- [Despliegue main PR #79](https://github.com/harrysxavio/cd-simulator/actions/runs/40055970843)
- [Verificación pública main PR #79](https://github.com/harrysxavio/cd-simulator/actions/runs/40055970726)
- [Chromium main PR #79](https://github.com/harrysxavio/cd-simulator/actions/runs/40055970697)
