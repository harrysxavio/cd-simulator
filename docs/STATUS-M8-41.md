# Estado M8-41 · Documentación final y material de aprendizaje

**Fecha de verificación:** 2026-10-23 (Chile).  
**Estado:** **COMPLETADA en alcance documental y de validación automática**.  
**Versión funcional:** v11.68 r177, sin cambios en algoritmos, interfaz ni manifiesto.  
**PR:** [#69](https://github.com/harrysxavio/cd-simulator/pull/69), merge [8fb6d34](https://github.com/harrysxavio/cd-simulator/commit/8fb6d346b888fe26650abff6edc2bff7b2d71035).

## Qué se entregó

| Archivo | Entrega |
|---|---|
| [GUIA-USUARIO.md](GUIA-USUARIO.md) | Primera campaña, ocho áreas, cuatro etapas, cinco vistas, compras, recuperación, guardar/reiniciar y CSV |
| [ESCENARIOS-DE-APRENDIZAJE.md](ESCENARIOS-DE-APRENDIZAJE.md) | Seis casos de dificultad progresiva: shock, compra tardía, Recepción/Calidad, transporte/staging, sobreplanificación y doble restricción |
| [ARQUITECTURA-Y-DATOS.md](ARQUITECTURA-Y-DATOS.md) | Diagramas Mermaid de arquitectura y flujo físico, trazabilidad y contratos de conciliación, módulos, persistencia y CI |
| [GLOSARIO-Y-LIMITES.md](GLOSARIO-Y-LIMITES.md) | Unidades, KPIs, costos, proxies económicos, ejemplos de errores y límites del diagnóstico |
| [SOPORTE-Y-VERIFICACION.md](SOPORTE-Y-VERIFICACION.md) | Diagnóstico de fallos, reporte de incidencias, comandos de pruebas y checklist de readiness para M8-42 |
| [README.md](../README.md) | Índice actual de documentos vigentes, con distinción explícita de alcances |
| [documentation-contract.test.mjs](../tests/documentation-contract.test.mjs) | Test automatizado de enlaces, versión y conceptos obligatorios |

## Aceptación técnica

Se verificaron los siguientes controles para el commit de integración 8fb6d34:

| Puerta | Resultado | Evidencia |
|---|---|---|
| Pull request: Node | Aprobada, **445/445** | [GitHub Actions #39899586623](https://github.com/harrysxavio/cd-simulator/actions/runs/39899586623) |
| Pull request: Chromium | Aprobada, **80/80** | [GitHub Actions #39899586768](https://github.com/harrysxavio/cd-simulator/actions/runs/39899586768) |
| main: Node | Aprobada, **445/445** | [GitHub Actions #39900135229](https://github.com/harrysxavio/cd-simulator/actions/runs/39900135229) |
| main: Chromium | Aprobada, **80/80** | [GitHub Actions #39900135151](https://github.com/harrysxavio/cd-simulator/actions/runs/39900135151) |
| main: Pages | Aprobado | [GitHub Actions #39900135035](https://github.com/harrysxavio/cd-simulator/actions/runs/39900135035) |
| main: HTTP público | Aprobado | [GitHub Actions #39900135361](https://github.com/harrysxavio/cd-simulator/actions/runs/39900135361) |

El nuevo contrato en Node verifica rutas Markdown internas de los cinco documentos, su referencia a la versión 11.68 r177 y declaraciones esenciales sobre SKU/12 días, motor agregado, compras, interpretación de costos y bloqueo TalkBack. **No certifica comprensión humana ni accesibilidad en teléfono real.**

## Qué NO se ha certificado

- **M7-38 sigue pendiente:** Android físico, navegación real mediante TalkBack y prueba de comprensión de un principiante. [Issue #67](https://github.com/harrysxavio/cd-simulator/issues/67). Las verificaciones automáticas en Chromium no sustituyen esa evidencia.
- La cohorte física SKU tiene una escala/horizonte distinto de las cifras agregadas de una jornada. Los manuales no deben habilitar doble conteo ni confundir expedición y entrega.
- Una tarifa desconocida no es cero; costos de compra y contribución parcial no equivalen a caja, factura, utilidad ni EBITDA.
- La microfase histórica 00 sigue pendiente de regularización de sus puertas originales si no se recupera evidencia.
- **M8-42 entrega estable aún pendiente.** La publicación de los archivos de documentación no implica etiquetar la aplicación como producto final.

## Siguiente paso del plan

**M8-42:** certificación final de suite integral, disponibilidad pública, licencia/README, versión y etiqueta candidata. El **cierre estable** se bloqueará hasta la evidencia de Android físico/TalkBack y comprensión de M7-38. Se puede preparar el paquete técnico y el checklist sin falsificar aprobaciones manuales.

Documentación vigente: [plan maestro](EXECUTION-PLAN-43.md) y [procedimiento de soporte](SOPORTE-Y-VERIFICACION.md).
