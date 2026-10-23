# Implementación 2 · Estado verificable por microfase

**Fecha de corte:** 2026-10-23 · **Proyecto:** Misión CD (experiencia didáctica y gamificada para teléfono).  
**Plan técnico:** [I2-PLAN-MAESTRO.md](I2-PLAN-MAESTRO.md) · **Roadmap ejecutivo:** [I2-ROADMAP-EJECUCION-2026-10-23.md](I2-ROADMAP-EJECUCION-2026-10-23.md).  
**V1 base:** v11.68 r177. La V1 permanece independiente y accesible; el juego aún no existe.

## Estado resumido (no confundir evidencia y planificación)

- **I2-00 = completada técnicamente**: auditada, revisada y fusionada a `main` como [PR #71](https://github.com/harrysxavio/cd-simulator/pull/71). SHA merge `675d0945daca8d510caef127c70a6265ead45b95`.
- **Cuatro controles post-merge aprobados:** [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40018532638), [Chromium](https://github.com/harrysxavio/cd-simulator/actions/runs/40018532417), [Pages](https://github.com/harrysxavio/cd-simulator/actions/runs/40018532178) y [HTTP real](https://github.com/harrysxavio/cd-simulator/actions/runs/40018532596).
- **1/41 microfases completadas técnicamente (2,4 %).** I2-01 a I2-40 pendientes. Este porcentaje es número de entregas, **no porcentaje de esfuerzo ni de juego listo**.
- **QA V1 no completamente cerrado:** Android físico/TalkBack/comprensión pendiente (issue [#67](https://github.com/harrysxavio/cd-simulator/issues/67)); M8-42 no habilita release estable. Un error real de ayuda de planificación/forecast está documentado en [#73](https://github.com/harrysxavio/cd-simulator/issues/73). No declararlo corregido hasta aprobar y fusionar su PR.
- **Cobertura limitada y explícita:** 32 botones HTML identificados + controles dinámicos; la auditoría y la suite Chromium representan recorridos, no una prueba exhaustiva de cada botón en cada estado. La matriz exhaustiva es I2-36.

## Tabla de trabajo vigente

| Fase | IDs | Estado a 23-10 | Evidencia / siguiente acción |
| --- | --- | --- | --- |
| F0 Auditoría base | **I2-00** | **Completada técnicamente** | PR #71 + cuatro jobs verdes |
| F1 Doble modo | I2-01–03 | Pendiente | I2-01 contrato; I2-02 ruta; I2-03 botón con destino real |
| F2 Datos e independencia | I2-04–06 | Pendiente | Igualdad física V1/I2, storage separado, privacidad |
| F3 Shell e interacción móvil | I2-07–12 | Pendiente | 0 scroll externo para confirmar; CTA persistente |
| F4 Onboarding y primera decisión | I2-13–17 | Pendiente | Guía opcional y microescena reutilizable |
| F5 Ocho áreas | I2-18–25 | Pendiente | Comercial → Planning → Compras → Recepción → Calidad → Inventario → Picking → Transporte |
| F6 Sorpresa y recuperación | I2-26–30 | Pendiente | Revelación explícita y 5 contrafactuales |
| F7 Resultado y gamificación | I2-31–35 | Pendiente | Trazabilidad, economía honesta, insignias, replay |
| F8 QA y publicación | I2-36–40 | Pendiente | Matriz controles, Android/TalkBack/usuario, release |

## I2-00 · Acta de cierre técnico

1. Auditoría de código, botones estáticos y dinámicos, recorrido V1 y documentación de límites.
2. Nueva batería automatizada de auditoría móvil, regresión y verificación de publicación.
3. Fricción móvil cuantificada en Chromium 360×760: 3.134px de documento contra 760px de viewport; CTA Continuar inicia a 2.769px. Se justifica shell con footer persistente.
4. Resultado: PR integrado y controles CI/main exitosos. **No existe prueba visual Android física** ni prueba de comprensión real.
5. Hallazgo posterior documentado: #73 no debe esconderse aunque la batería aprobó; requiere corrección semántica separada en V1.

## Próxima unidad I2-01 · Contrato de producto

**Entrada:** auditoría I2-00 integrada, motor V1 disponible.  
**Salida exigida:** contrato por cohorte SKU, horizonDays=12, decisiones por 8 áreas, tres SKU, compra original y cinco recuperaciones; `source`, `unit`, `scope`, `confirmed`, `seed`; diferencias V1/I2 explícitas.  
**Pruebas:** ninguna decisión de ayuda muta la cohorte; misma entrada implica mismos pedidos/PO/stock; no mezclar modelo agregado y SKU; forecast/compra no es stock físico.  
**Cierre:** PR pequeño + Node y Chromium V1 + revisión API pura + merge y actualización de este archivo.

## Reglas de transición

- I2-02 debe crear una ruta `/juego/` válida antes de I2-03. **Prohibido botón Jugar sin destino funcional**.
- Cada microfase es PR separado salvo razón documentada; no declarar completa sin merge/regresión y HTTP si toca publicación.
- No modificar el motor de V1 por fines estéticos; corregir defectos reales por PR aparte con pruebas.
- La fase F8 no se da por concluida sin QA físico y comprensión por usuario real.
- Mantener historial M7-38, M8-42 y M00 independiente de I2. El éxito CI no equivale a aceptación humana.
