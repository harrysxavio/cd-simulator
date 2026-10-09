# Auditoría funcional · Supply Chain Operations Lab v11.14

**Fecha de revisión:** 2026-10-09. **Alcance:** comportamiento existente hasta v11.14, sin afirmar capacidades de un WMS real.

## Hallazgos reproducidos en código

| Prioridad | Hallazgo | Causa | Corrección |
| --- | --- | --- | --- |
| Alta | No había botón de reinicio en Diagnóstico o Recuperación | Los controles existentes estaban dentro de `#operationsSection` y `#dashboardSection`, ocultos en otras etapas | Barra `.session-controls` permanente, con botón `#resetAnytime`, confirmación y nuevo ID |
| Alta | Al tocar Operación tras revelar sorpresa se volvía al Diagnóstico | `showSection('operations')` redirigía si `revealed===true` | Navegación permitida, decisiones iniciales **no editables** tras revelar |
| Alta | La versión nueva devolvía partidas guardadas al Diagnóstico | Arranque `showSection(revealed?'preliminary':'operations')` sin guardar sección activa | Almacenamiento `currentSection` y migración de estado v11.13 sin esa propiedad |
| Media | El flujo no distinguía claramente consulta del plan y cambio del plan | La navegación mezclaba `phase` con `revealed` | Etiqueta de solo lectura y protección tanto de botones como entradas numéricas |
| Media | Entradas numéricas de planificación/refuerzo no tenían etiqueta accesible | Etiqueta `<label>` sin relación programática con el control | Se agregaron `aria-label` explícitos |

## Matriz de verificación automatizada

### A. Motor operacional agregado y costos

`tests/campaign-audit-matrix.test.mjs` ejecuta 60 casos (5 perfiles de demanda/inventario × 4 combinaciones de decisiones × 3 niveles de acciones).

Invariantes: unidades no negativas; Recepción ≤ entrega; Calidad ≤ recepción; Picking ≤ disponibilidad; expedición ≤ preparación y demanda; pendientes = demanda − expedición; consistencia interna entre compras, gastos, caja, ingresos, costo y resultado. También comprueba que añadir capacidad en Recepción, Picking o Transporte no reduce expedición, manteniendo otras variables constantes.

### B. SKU, compras, Calidad, recuperación y valorización

El mismo archivo ejecuta 36 combinaciones (3 políticas × 4 recuperaciones × 3 perfiles de llegada, Calidad, proveedor y capacidad).

Invariantes: pedidos identificables, no duplicar despachos, `completados + pendientes = solicitados`; stock inicial + recibido = despachado + disponible + retenido; valor físico por SKU y agregado; orden original congelada; ninguna recepción antes del día de llegada; caja incremental aritmética; auditoría de compras y lotes.

### C. Experiencia en navegador real (Chromium)

`tests/browser-smoke.e2e.mjs` sigue el recorrido de ocho áreas → sorpresa → recuperación → resultado → cinco vistas → conciliación SKU → controles de compras urgentes → recarga → CSV → reinicio, en escritorio y emulación Pixel 7. Observa excepciones JavaScript, errores HTTP y desborde horizontal a 360/412 px.

`tests/browser-session.e2e.mjs` agrega cuatro pruebas: (1) partida anterior sin `currentSection` con demanda revelada, navegación a Operación, solo lectura, cancelación/reinicio; (2) restauración real de cinco pantallas tras recargar; (3) almacenamiento malformado, barra fija y reinicio táctil móvil; (4) nombres accesibles en los campos visibles.

**Estado de la ejecución:** consultar los enlaces de GitHub Actions del PR y `main`. Este documento describe qué verifican los tests, no certifica tests aún no ejecutados.

## Comportamientos esperados tras la corrección

1. **Nueva campaña**, desde cualquier pantalla: solicita confirmación. Cancelar no cambia ninguna decisión. Confirmar reinicia estrategia, parámetros del escenario, decisiones de áreas, acciones, sorpresa, políticas y recuperación SKU, y asigna nuevo ID.
2. **Ver operación**, tras descubrir sorpresa: muestra las decisiones históricas sin permitir reescribir forecast, compras ni otros valores del plan. El diagnóstico y la recuperación siguen accesibles.
3. **Actualizar la versión:** si hay una sesión guardada, conserva ID, decisiones, sorpresa y pantalla cuando el dato está disponible. Las partidas antiguas sin `currentSection` se abren en una etapa segura.
4. **Configuración y recuperación:** sus campos deben tener nombres accesibles para tecnologías asistivas.

## Limitaciones y riesgos no resueltos

- **M2/M3:** el motor agregado de una jornada y la cohorte SKU de 12 días aún no representan la misma población física. No sumar sus cifras de unidades, inventario o compras.
- **M4:** resultado operacional y caja son proyecciones didácticas; no constituyen contabilidad ni pagos verificados. El inventario inicial agregado y el de SKU no comparten origen.
- **Funcionalidad del CD:** faltan devoluciones, cancelaciones, seguridad por roles, multiusuario, integración WMS/ERP, impuestos, transporte entregado y vencimientos.
- **Compatibilidad futura:** el contrato de persistencia valida algunos tipos/rangos; futuras migraciones de esquema deben conservar pruebas de recuperación de sesiones.
- **Accesibilidad:** la comprobación de etiquetas y Chromium móvil no reemplaza auditoría WCAG completa, teclado/lector de pantalla ni prueba en Android físico.
- **Rendimiento:** el simulador recalcula varias alternativas al renderizar; falta perfilado sobre teléfonos de gama baja y escenarios de mayor volumen.
- **Despliegue:** GitHub Pages puede mantener caché temporal al cambiar versiones; se versionan CSS y JS en la entrada HTML, pero no hay un mecanismo formal de migración transaccional.

## Criterio de entrega

Integrar solamente cuando el pipeline del PR y luego el de `main` confirme pruebas Node y Chromium aprobadas; verificar además publicación GitHub Pages. Al publicar informar las pruebas verificadas y las limitaciones pendientes, sin atribuir una auditoría completa de producción.
