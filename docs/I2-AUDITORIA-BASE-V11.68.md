# Implementación 2 · Auditoría base del simulador v11.68 r177

**Fecha:** 2026-10-23 · **Repositorio:** harrysxavio/cd-simulator · **Rama pública auditada:** main, commit base a7a8e7b · **Versión:** 11.68, assets 177.  
**Tipo:** auditoría de código, estructura de interfaz, pruebas automatizadas existentes y nueva comprobación de recorrido de controles en Chromium. **No es una inspección visual manual en un Android físico, ni un test con una persona principiante.**

## 1. Dictamen ejecutivo

La versión 1 es una **buena base lógica y educativa para reutilizar**: contrato de campaña, tres SKU, ocho áreas, manifest original de compras, cronología de eventos y cinco alternativas de recuperación. Los cálculos y el estado deben mantenerse canónicos. La principal deuda es de **interacción y carga cognitiva en pantallas pequeñas**, no de reescribir el motor.

El dolor reportado por un usuario que ya recorrió el teléfono es coherente con lo que muestra el código: las opciones, el contexto y el botón «Siguiente área» están dentro de un documento vertical extenso, y en móvil se desactivaron barras sticky para evitar tapar contenido. **No basta cambiar tamaños de tarjetas o colores**: hace falta una experiencia por escenas con zona de acción persistente, revelación progresiva y detalles opcionales.

### Alcance real de la revisión

| Fuente | Cobertura que aporta | Lo que NO acredita |
|---|---|---|
| index.html | Se identifican **32 botones declarados estáticamente** y pantallas accesibles | Que los 32 estén probados en todas las transiciones y estados |
| src/app.js, ~2.079 líneas | Eventos, navegación y botones dinámicos, guardado y flujo de decisión | Que una acción se entienda sin leer toda la página |
| src/styles.css, ~65 KB | Media queries y estilos móviles, ocultación de pestañas, foco y objetivos táctiles | Que la interfaz esté dentro de la altura útil de cada teléfono |
| tests/*.test.mjs | Modelo, inventario, costos, contratos y regresión de release | Usabilidad real ni TalkBack físico |
| tests/*.e2e.mjs | Recorridos Chromium escritorio y móvil emulado | Todos los botones y todas las combinaciones de navegación |
| tests/browser-i2-legacy-audit.e2e.mjs | **Nuevos tests**: controles de configuración, mapa, elecciones, recuperación, tabs, CSV, reinicio; medición vertical | Aceptación de UX humana ni funcionamiento nativo Android |

**Evidencia histórica previa:** main a7a8e7b: [Node #39938138781](https://github.com/harrysxavio/cd-simulator/actions/runs/39938138781), [Chromium #39938138911](https://github.com/harrysxavio/cd-simulator/actions/runs/39938138911), [Pages #39938139142](https://github.com/harrysxavio/cd-simulator/actions/runs/39938139142) y [HTTP #39938138747](https://github.com/harrysxavio/cd-simulator/actions/runs/39938138747), todos aprobados. Los resultados de nuevas pruebas de auditoría deben registrarse por su PR/run después de ejecutarse.

## 2. Hallazgos ordenados por impacto

| ID / Prioridad | Hallazgo sustentado | Evidencia | Acción recomendada |
|---|---|---|---|
| UX-01 / P0 para I2 | **Scroll vertical rompe secuencia elección → continuar**. El mapa de ocho áreas precede a una misión larga y las opciones comparten documento con información; la barra superior y tabs dejan de ser sticky en teléfono para evitar solapamiento | index.html: roadmap/mission; src/styles.css: .columns móvil y @media 680px, .session-controls/.result-tabs position static | I2: pantalla por escena, CTA inferior en zona segura y contenido interior con desplazamiento independiente; evitar doble scroll |
| UX-02 / P1 | **Diagnóstico denso**: ocho tarjetas con KPIs, hallazgos, causas, comparaciones y detalles; contenido útil pero presentación simultánea | renderDiagnosis(), preliminaryFindings y renderManagerBriefing() en src/app.js | I2: impacto sorpresa de 1 vista → causa principal → tarjetas de detalle seleccionables |
| UX-03 / P1 | **Recuperación muestra dos ámbitos relacionados pero distintos**: decisión SKU física y acciones agregadas de una jornada | recoverySection y src/app.js, renderSkuRecoveryMission() más sección "Recuperación independiente" | I2: recuperación física SKU como escena principal; laboratorio agregado claramente opcional e identificado |
| UX-04 / P1 | **Configuración obliga a interrumpir múltiples ajustes**: el onchange de cada campo regenerado ejecuta showSection('operations') | src/app.js setup(), línea de input.onchange | En V1: evaluar corrección de navegación; en I2: editor de configuración con guardar/cancelar, validación en el campo, vuelta al mismo lugar |
| UX-05 / P1 | **Sorpresa se revela automáticamente al entrar en Diagnóstico**. El botón “Revelar demanda real” puede quedar oculto antes de que se lo pueda usar en el recorrido normal | src/app.js showSection(): \`if(name==='preliminary'&&!revealed)revealSurprise()\`; renderDiagnosis(): \`revealDemand.hidden=revealed\` | En I2: revelación explícita, una sola vez, control determinista para probar casos. Auditar si conviene corregir el comportamiento antiguo por separado |
| UX-06 / P1 | **Indicadores de horizontes distintos comparten experiencia**: 12 días/pedidos completos SKU vs jornada/unidades agregadas/CLP de costos | index.html Resumen/Áreas/Inventario/Costos/Mejoras; docs/GLOSARIO-Y-LIMITES.md | I2: un solo marcador de servicio SKU por defecto; economía parcial SKU, agregada opcional con sello de alcance; nunca sumar |
| UX-07 / P2 | **Redundancia de CTA en resumen**: "Explorar las áreas" y "Explorar las ocho áreas" coexisten en un mismo panel | index.html botones overviewToAreas / primaryToAreas | I2: una acción primaria por escena y navegación contextual secundaria |
| UX-08 / P2 | **Barra de 4 pestañas + subpestañas de 5 vistas** es funcional pero exige interpretar arquitectura antes de jugar | index.html y showResultView() | I2: misión guiada → mapa de progreso → resumen final navegable; acceso a informe detallado aparte |
| UX-09 / P2 | **Lenguaje técnico y explicaciones en múltiples niveles** siguen cargados para novatos en escenarios complejos | src/app.js >160 KB, renderSkuLab(), renderDiagnosis(), docs/GUIA-USUARIO.md | I2: microcopy concreto, información "¿por qué?" a demanda, KPIs máximo dos en primera lectura, glosario contextual |
| QA-01 / P1 | **La cobertura general del navegador no demuestra exhaustividad de combinaciones de botones**. Hay 32 botones HTML, otros se generan por JS y las pruebas originales cubren recorridos focales | index.html, src/app.js, suites Chromium; nuevos tests de auditoría | I2: inventario de controles con ID, estado, acción y criterio; tests E2E por escena, overlay, retroceso, persistencia y orientación |
| QA-02 / P1 | **No hay aceptación Android físico/TalkBack ni comprensión de principiante**, aunque Chromium y contraste pasen | docs/M7-38-ANDROID-A11Y-CHECKLIST.md; issue #67 | Mantener bloqueo release de V1 y exigir test humano en I2, sin usar IA para inventar la evidencia |
| TECH-01 / P2 | **Acoplamiento de presentación**: app.js concentra interacción, renderizado, estado y orquestación; estilos en una hoja larga | src/app.js 161 KB; src/styles.css 65 KB | I2: frontend modular por pantallas, adaptador de motor puro, CSS por componente; migración gradual sin duplicar motor |

### Riesgos que NO se justifican afirmar

- No se ha demostrado una falla de cálculo ni de preservación de stock por los hallazgos de UX; **no reescribir los motores de eventos por estética**.
- No se ha detectado una filtración de datos o acceso a producción; es un prototipo estático ficticio.
- No atribuir a todos los botones “100 % probados” hasta que exista una matriz de estados y ejecuciones. La nueva suite es amplia pero no exhaustiva.
- La revisión estructural de CSS y las pruebas de navegador en CI **no equivalen a mirar las pantallas en un dispositivo real con sus barras de sistema**.

## 3. Botones y recorridos cubiertos / pendientes

El HTML expone 32 botones estáticos:

**Versión y acceso:** Verificar actualización; Ver operación; Nueva campaña global; Configurar campaña.  
**Configuración:** Restaurar datos de ejemplo; Guardar y volver.  
**Viaje principal:** Operación, Diagnóstico, Recuperación, Resultado final; Reiniciar campaña; Ver diagnóstico; Área anterior; Continuar; Revelar demanda; Explorar recuperación; compra urgente; continuar sin recuperación.  
**Resultados:** Resumen, Áreas, Inventario, Costos, Mejoras; accesos consecutivos de cada vista, explorar áreas SKU, regreso a recuperación; exportar CSV; reinicio final.  
**Ayuda:** ocultar/mostrar ayuda.

Además existen controles **dinámicos**, no contabilizados en esos 32: mapa de ocho áreas, alternativas de cada área, presets, campos de configuración, alternador de orientación, condiciones de compra, decisiones SKU, selectores de fechas y reservas, desplegables, gráficos y botón de confirmación.

**Cobertura automatizada hasta ahora:** los tests existentes ejercitan onboarding, decisiones de operación, las ocho áreas, diagnóstico, recuperación, espera, reserva, compras urgentes, confirmación y cancelación, cinco vistas, persistencia, exportación, reinicios, contraste/tamaño/teclado 360/412 y comportamiento de actualización. El nuevo \`browser-i2-legacy-audit.e2e.mjs\` amplía los recorridos **deliberadamente sin cambiar el simulador**.

**Por ampliar en Implementación 2:** matriz generada automáticamente de *todos* los controles accesibles por estado, activación con toque/teclado, botones ocultos/deshabilitados, menús y paneles; seguimiento de foco tras transiciones, modo offline/reload y restauración frente a error.

## 4. Recomendación de producto

**Mantener V1 tal como es** como laboratorio profundo, accesible mediante su enlace y un botón de regreso desde I2. **Crear un modo "Jugar / Dirigir un CD" separado** dentro del mismo sitio, con el mismo motor y una nueva capa móvil de interacción, onboarding progresivo, misiones y paneles opcionales. En la fase de ingreso, añadir un botón discreto que lleve a una ruta real existente; **no crear un botón sin destino funcional**.

La V2 debe reducir fricción sin perder trazabilidad: decisiones con consecuencias, plazos, compromiso de compra, capacidad e inventario conciliado; nunca regalar puntos por una compra no recibida ni prometer entregas por unidades solo preparadas.

## 5. Prioridades y decisiones de auditoría

1. **Prioridad 0:** resolver navegación y acción primaria en un viewport; evitar que el usuario busque abajo el botón tras seleccionar arriba.
2. **Prioridad 1:** separar información opcional de acción; preservar semántica física/económica; revelar sorpresa explícitamente.
3. **Prioridad 2:** progresión didáctica, personajes, misiones, retroalimentación, reto opcional.
4. **No ahora:** modelar 3D de bodega, multijugador, backend, datos reales, autenticación, scoring basado en utilidad contable ficticia.

Ver [plan maestro de Implementación 2](I2-PLAN-MAESTRO.md), [experiencia y pantallas](I2-EXPERIENCIA-MOVIL.md) y [arquitectura, contratos y QA](I2-ARQUITECTURA-Y-PRUEBAS.md). Esta auditoría tiene validez para la versión v11.68 r177 y debe actualizarse ante cambios de V1.
