# Estado M8-40 · Auditoría funcional y correcciones seguras

**Fecha:** 22 de octubre de 2026 en Chile; evidencias CI registradas el 23 de octubre UTC.  
**Estado:** **COMPLETADA EN ALCANCE AUTOMATIZADO**.  
**Release publicada:** **v11.68 r177**, desde `main`.  
**Entrega:** [PR #68](https://github.com/harrysxavio/cd-simulator/pull/68), merge [`a980824`](https://github.com/harrysxavio/cd-simulator/commit/a980824be40647a68e18a1319e6f00dad4bd7f23).  
**Dependencia bloqueante del lanzamiento final:** M7-38 **sin aceptación manual de Android real, TalkBack y comprensión de principiante**, [issue #67](https://github.com/harrysxavio/cd-simulator/issues/67).

## Alcance y resultados de auditoría

| Control | Evidencia verificada | Resultado |
|---|---|---|
| Navegación | E2E de etapas Operación, Diagnóstico, Recuperación, Resultados y cinco vistas; navegación de ocho áreas | Aprobado en Chromium; Android físico pendiente |
| Persistencia | Suite v3, migración v2, controles de estado corrupto, recarga y reinicio | Aprobado en Node y Chromium |
| Integridad física | M8-39: 8 escenarios × 5 decisiones con órdenes, PO, capacidades, recepción, inventario y transporte conciliados | Aprobado; sin cambios del motor |
| Economía | Balance CLP por stock y contribución parcial sin inferir facturación/pagos/utilidad reales | Aprobado en suite |
| Accesibilidad | Pestañas ARIA, navegación por teclado, foco, contraste y ancho móvil 360/412 px en Chromium | Automatizada aprobada; **NO certificación TalkBack física** |
| Versión/caché | Comparación semántica de mayor/menor + `assetRevision` dentro de versión; pruebas de error y recuperación del enlace | **Dos defectos corregidos** |
| CI | `checkout@v5`, `setup-node@v5`, `permissions: contents: read` en los workflows de test | Aprobado en PR y `main` |

## Defectos encontrados y solucionados

1. **Prioridad equivocada del número de revisión.** Antes se comparaba `assetRevision` incluso si la versión semántica era diferente, pudiendo anunciar como anterior una versión realmente posterior. Corregido: comparador numérico de mayor/menor, revisión como desempate únicamente dentro de la misma versión. Incluye validación de revisiones negativas, fraccionarias y fuera de rango seguro.
2. **Enlace potencialmente obsoleto tras error del manifiesto.** Un enlace de una comprobación anterior podía continuar visible durante una consulta inválida. Corregido: se oculta al iniciar y únicamente se muestra tras respuesta válida, con regla CSS explícita para `hidden`. E2E de manifiesto inválido y nueva consulta satisfactoria.
3. **Deuda de mantenimiento de GitHub Actions.** Se actualizaron `checkout` y `setup-node` a versión 5 y se restringió el token de lectura de código en workflows de Node/Chromium. Se conserva Node 22 para las pruebas del simulador; las acciones usan su runtime interno actualizado.

No se modificaron algoritmos de Comercial, Planning, Compras, Recepción, Calidad, Inventario, Picking, Transporte ni la economía SKU; los ajustes del frontend se limitan al verificador de publicación y sincronización de versión estática.

## Evidencia de puertas de calidad

| Etapa | Suite | Evidencia |
|---|---|---|
| Pull request | Model regression tests: **442/442 aprobadas** | [Run #39883936081](https://github.com/harrysxavio/cd-simulator/actions/runs/39883936081) |
| Pull request | Browser E2E: **80/80 aprobadas** | [Run #39883936855](https://github.com/harrysxavio/cd-simulator/actions/runs/39883936855) |
| `main` | Model regression tests: **aprobada** | [Run #39884537160](https://github.com/harrysxavio/cd-simulator/actions/runs/39884537160) |
| `main` | Browser E2E: **80/80 aprobadas, 0 fallidas** | [Run #39884537098](https://github.com/harrysxavio/cd-simulator/actions/runs/39884537098) |
| `main` | GitHub Pages build + deploy: **aprobado** | [Run #39884537044](https://github.com/harrysxavio/cd-simulator/actions/runs/39884537044) |
| `main` | Live Pages HTTP: **aprobado** | [Run #39884537144](https://github.com/harrysxavio/cd-simulator/actions/runs/39884537144) |

URL de entrega: https://harrysxavio.github.io/cd-simulator/?release=11.68-r177

## Límites, estado y siguiente paso

- **M8-40 completada solo para la auditoría funcional automatizada**; M8 **2/4**.
- **M7-38 mantiene pendiente** Android físico, TalkBack y prueba con principiante; M7 **5/6**. No ocultar este bloqueo en reportes de lanzamiento.
- **M8-41 siguiente:** redactar manual para principiante, casos de uso completos, glosario, arquitectura y mapa de componentes, límites de las inferencias y checklist de soporte.
- **M8-42 pendiente:** certificación/etiquetado de entrega estable tras terminar documentos y resolver aceptación manual.
- **Hito 00:** deuda histórica de regularización de certificación; verificar su evidencia original antes de modificar su estado.

Las pruebas con Chromium validan funcionalidad del prototipo, no productividad real, SLA del cliente ni integración con WMS/ERP. No declarar costo desconocido como cero ni interpretar expedición como entrega.
