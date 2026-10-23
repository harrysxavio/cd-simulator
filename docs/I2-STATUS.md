# Implementación 2 · Estado verificable por microfase

**Proyecto:** Misión CD · Juego didáctico móvil conectado al motor de Supply Chain Operations Lab.  
**Plan vigente:** [I2-PLAN-MAESTRO.md](I2-PLAN-MAESTRO.md) · **Version V1 base:** v11.68 r177.  
**Punto de partida:** auditoría de UX y pruebas del sistema existente; no hay pantalla de juego ni botón activo todavía.

## Contadores (actualizar después de CI + PR + merge + HTTP)

| Paquete | Microfases | Estado inicial |
|---|---|---|
| Auditoría, entrada y doble modo | I2-00 a I2-03 | I2-00 en curso; 01–03 pendientes |
| Datos e independencia | I2-04 a I2-06 | pendientes |
| Shell e interacción | I2-07 a I2-12 | pendientes |
| Onboarding | I2-13 a I2-17 | pendientes |
| Ocho áreas | I2-18 a I2-25 | pendientes |
| Sorpresa y recuperación | I2-26 a I2-30 | pendientes |
| Resultados y gamificación | I2-31 a I2-35 | pendientes |
| QA y publicación | I2-36 a I2-40 | pendientes |

**Total inicial:** 0/41 entregas implementadas y verificadas; I2-00 es la primera entrega bajo revisión. Esta cifra se actualizará únicamente con evidencia posterior al merge.

## I2-00 · Auditoría y punto de partida

**Estado:** en curso hasta validar PR de auditoría y pruebas reales Chromium sobre main.  
**Cambios previstos:** auditoría V1, blueprint móvil, arquitectura/contratos, plan microfases y nueva prueba E2E que recorre controles críticos y mide geometría de pantalla.
**Sin cambios de runtime V1:** se mantienen index.html, src/, release.json y el motor.

**Evidencia requerida para pasar a completada:**
- PR fusionado, SHA de merge.
- Regresión Node y Chromium en PR y main, Pages/HTTP verificados.
- Tests de auditoría sin fallos (configuración, 8 áreas, diagnóstico, recuperación, cinco vistas, exportación, confirmación, reset).
- Matriz de problemas y severidad con límites de revisión explícitos.
- Descripción de I2-01 como siguiente dependencia, sin presentar botones de juego inexistentes.

## Estado de versión histórica V1 (no modificar por I2)

Plan separado: [EXECUTION-PLAN-43.md](EXECUTION-PLAN-43.md). Se conservan M7-38 pendiente Android físico/TalkBack, M8-42 cierre estable bloqueado y M00 certificación manual histórica abierta. **El diseño de una versión gamificada no resuelve ni cierra estos pendientes.**

## Reglas para futuros agentes

Primero confirmar main y runs; después leer plan I2, estado y auditoría. No inferir progreso I2 por la existencia de un documento y no modificar V1 sin criterio firmado. Una fase sin prueba de publicación/suite queda en curso. Registrar exactamente *qué se hizo*, *qué se verificó*, *qué no*, próximo paso y enlaces.

El botón «Jugar: Dirige tu CD» es parte de I2-03, que depende de la ruta jugable mínima I2-02. **No añadir botones de salida sin destino real.**
