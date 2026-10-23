# M8-42 · Matriz de preparación de release (NO entrega estable)

**Versión funcional objetivo:** v11.68 r177 · **Estado:** candidata técnica en preparación, **bloqueada por aceptación manual M7-38**.  
**Regla:** una suite verde, una publicación pública o un manifiesto coherente **NO** sustituyen Android físico, TalkBack, prueba de comprensión ni una revisión de aprobación de release.

## 1. Fuentes de evidencia automatizada previas

El cierre documental M8-41 quedó publicado en el commit \`016b18c\`. GitHub verificó (23 octubre 2026 UTC):

| Puerta | Evidencia real | Estado histórico |
|---|---|---|
| Regresión Node | [#39900799016](https://github.com/harrysxavio/cd-simulator/actions/runs/39900799016) | Aprobada |
| Navegador Chromium escritorio/móvil | [#39900798931](https://github.com/harrysxavio/cd-simulator/actions/runs/39900798931) | Aprobada |
| GitHub Pages build + deploy | [#39900798967](https://github.com/harrysxavio/cd-simulator/actions/runs/39900798967) | Aprobada |
| HTTP público y manifiesto | [#39900798954](https://github.com/harrysxavio/cd-simulator/actions/runs/39900798954) | Aprobada |

**Estas ejecuciones son base histórica, no sustituyen los nuevos runs del PR de M8-42.**

## 2. Preflight automatizado incorporado

\`node scripts/release-readiness.mjs\` inspecciona la versión y revisión de \`release.json\`, cabecera e imports de HTML/JS, verificador de release, pauta de Android y el archivo estructurado [RELEASE-ACCEPTANCE.json](RELEASE-ACCEPTANCE.json).

- Si hay desalineación técnica, retorna error y el job Node falla.
- Si todo está consistente pero faltan pruebas humanas, retorna \`technicalContract: passed\` con \`decision: blocked-manual\`. **El CI termina verde en esta situación por diseño**, sin etiquetar estable.
- Si en el futuro se incorporan evidencias manuales válidas, retorna \`requires-final-human-and-ci-review\`; nunca \`stable\` ni autoriza crear tags.
- La prueba \`tests/release-readiness.test.mjs\` protege estos casos extremos y el bloqueo explícito.
- El script no llama APIs, no verifica el teléfono, no prueba que los datos cargados en una evidencia sean genuinos y **no crea releases o tags**.

## 3. Puertas de aceptación física pendientes

| Puerta | Estado | Qué registrar después de ejecutarla |
|---|---|---|
| Android físico | **Pendiente** | Fecha, versión exacta y dispositivo; navegación completa, tamaño táctil, textos y anomalías |
| TalkBack real | **Pendiente** | Android/Chrome/lector, anuncios de pestañas, foco, controles, orden de lectura, defectos y retest |
| Comprensión de persona principiante | **Pendiente** | Interpretación de «expedidos» y «costo no tarifado»; resultados, dificultades y cambios necesarios |

La única fuente de resultados manuales actualmente es **ninguna**: la pauta [M7-38](M7-38-ANDROID-A11Y-CHECKLIST.md) permanece sin ejecutar y el [issue #67](https://github.com/harrysxavio/cd-simulator/issues/67) sigue abierto. No marcar estos tres campos como \`passed\` mediante inferencia o emulación.

## 4. Qué falta para M8-42

- [ ] Incorporar PR de preflight técnico y verificar Node, Chromium, Pages y HTTP públicos en \`main\`.
- [ ] Ejecutar Android físico v11.68 r177 en modo normal y con TalkBack, registrar hallazgos.
- [ ] Ejecutar evaluación de comprensión y documentar los resultados.
- [ ] Corregir defectos con PR y repetir pruebas físicas necesarias.
- [ ] Confirmar \`main\`, coherencia de todos los activos y **nuevos** runs.
- [ ] Confirmar estado administrativo del hito histórico **00**, sin afirmar cierre sin fuente.
- [ ] **Solo entonces** efectuar revisión humana de salida, seleccionar un tag final y, si corresponde, crear release estable con su evidencia.

**No se ha creado tag final ni GitHub Release estable.** La publicación en Pages continúa como prototipo educativo. El estado de M8-42 se mantiene **en curso/bloqueada para cierre**.

## 5. Cómo retomar después de otra conversación

Consultar [plan maestro](EXECUTION-PLAN-43.md) y este documento, obtener en vivo \`main\`, los últimos cuatro runs y el issue #67. Continuar por la validación física; no crear otra versión ni iniciar subfases nuevas para reetiquetar una tarea manual pendiente como completada.

El último trabajo técnico de M8-42 puede adelantarse, pero **el proyecto sigue sin certificación estable**.
