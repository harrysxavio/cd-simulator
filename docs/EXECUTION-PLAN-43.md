# Plan maestro operativo · 43 microfases

**Adoptado por el responsable del proyecto:** 2026-10-09. **Versión base:** v11.23. **Estado:** vigente hasta reemplazo documentado.  
**Este documento es la fuente de verdad del plan para futuras conversaciones, agentes y sesiones**. Leerlo junto al estado verificable más reciente (`docs/STATUS-V11.62.md`) y la evidencia de GitHub Actions; no asumir que un commit o una PR verde demuestran una publicación pública.

## Objetivo y principios

Cerrar M2–M8 mediante **43 entregas pequeñas (00–42)**, conservando M1 y U0/U1 completos en su alcance inicial. Priorizar integridad física, después resultados económicos, recuperación, causalidad, didáctica y estabilización. Los cambios funcionales deben reutilizar el código existente y no rehacer módulos ya operativos.

**Contrato por microfase**
1. Identificar el comportamiento actual y pruebas existentes antes de modificarlo.
2. Resolver **un cambio coherente** en rama aislada; escribir criterio de aceptación y ejemplos de negocio.
3. Ejecutar pruebas de unidad e invariantes relevantes, luego E2E Chromium móvil/escritorio cuando afecte la UI.
4. Abrir PR; **no integrar** si los checks requeridos fallan. Confirmar `main` sin errores y, si modifica lo publicado, Pages + verificación HTTP real (incluyendo `release.json`).
5. Registrar evidencia (PR, SHA, suites, URL pública, limitaciones) y mover el estado a completa **solo al cumplir la definición de terminado**.

**Estados permitidos:** pendiente · en curso · bloqueada · completada. Una versión de código en rama no significa entrega completada. Evitar porcentajes inventados. En Android físico/TalkBack, registrar evidencia manual; una emulación Chromium nunca sustituye esa prueba. En condiciones de bloqueo, registrar causa y avanzar solo sobre etapas independientes.

## Microfases y criterios de aceptación

| ID | Hito | Entrega pequeña | Criterio verificable |
|---|---|---|---|
| **00** | Base | Verificar v11.23 | PR+regresión+E2E aprobados, manifest/HTML/JS de Pages coinciden con main; verificar versión en Android físico cuando se disponga. |
| **01** | M2 | Contrato de unidades y períodos | Diferenciar pedido completo, unidades físicas SKU, unidades equivalentes por jornada, CLP y días 0–12; rechazar unidades/alcances incompatibles, sin cambiar cifras. |
| **02** | M2 | Datos iniciales comunes | Una campaña comparte demanda/escenario/apertura; no sumar inventario del catálogo con reserva o stock agregado ajeno. |
| **03** | M2 | Compra planificada inmutable | Orden original con identidad, SKU, cantidades y fecha no cambia cuando se revela shock. |
| **04** | M2 | Ejecución y lecturas únicas | Diagnóstico, Resultados y ocho áreas reutilizan el mismo registro de eventos, sin segundo replay ni cálculo físico incompatible. |
| **05** | M2 | Persistencia y reinicio | Guardar/cargar/reiniciar conserva ID, supuestos, compras y movimientos; migra estados antiguos. |
| **06** | M3 | Comercial/Planning | Forecast y cobertura afectan el compromiso original una sola vez; shock no altera compras pasadas. |
| **07** | M3 | Compras | Ordenes trazadas, fill-rate, lead time y recepciones tardías, sin atribuir recepción anticipada. |
| **08** | M3 | Recepción | Capacidad diaria y cola real de unidades; entregado por proveedor no implica recibido. |
| **09** | M3 | Calidad | Lotes retenidos/liberados por día; stock sin liberar no se prepara. |
| **10** | M3 | Inventario | Conciliación apertura + recibido = consumido + libre + retenido + reserva, por SKU. |
| **11** | M3 | Picking | Preparación separada de expedición, limitada por BOM completo y capacidad física. |
| **12** | M3 | Transporte | Salida del CD solo tras preparación y capacidad; no equivale a entrega al cliente. |
| **13** | M3 | Ocho áreas finales | Proyecciones y KPI nacen de los mismos eventos diarios, sin sumas entre modelos. |
| **14** | M4 | Catálogo de costos | Valores y supuestos por SKU, recurso, actividad y moneda trazables. |
| **15** | M4 | Valor de inventario | Stock inicial, recepción, consumo y cierre valorizados y reconciliados. |
| **16** | M4 | Costo de compras | Separar compra comprometida, recepción, consumo y caja simulada. |
| **17** | M4 | Costos operacionales | Cobrar refuerzo y horas solo si hubo recursos aplicables. |
| **18** | M4 | Resultado económico | Ingreso de expedición y costos de campaña con definición explícita; no confundir EBITDA, utilidad ni caja. |
| **19** | M4 | Auditoría de costos | Evitar doble conteo, conservar resultados reproducibles y casos extremos. |
| **20** | M5 | Baseline inmutable | Todas las alternativas nacen del mismo estado congelado. |
| **21** | M5 | No intervenir | Comparador de esperar con backlog y fechas correctas. |
| **22** | M5 | Compra urgente | SKU, PO, plazo, recargo y recepción trazados, nunca antes de la llegada. |
| **23** | M5 | Reserva interna | Zona, lote cuando exista, traslado y costo sin crear stock. |
| **24** | M5 | Capacidad adicional | Recursos solo donde operan; refuerzo inútil no inventa despachos. |
| **25** | M5 | Combinación | Acciones compatibles simuladas juntas sin sumar beneficios individuales. |
| **26** | M5/U3 | Comparador | Antes / alternativa / diferencia; órdenes, fechas, costos y restricciones. |
| **27** | M5/U2 | Confirmación | Persistencia de decisiones y calendario; no prometer entregas al cliente. |
| **28** | M6 | Identificación física | Restricciones a partir de eventos SKU, no de una heurística agregada. |
| **29** | M6 | Contrafactual simple | Evaluar una intervención y su efecto bajo condiciones fijas. |
| **30** | M6 | Contrafactual conjunto | Detectar restricciones simultáneas y resultados no aditivos. |
| **31** | M6 | Recomendaciones | Priorizar servicio/costo/viabilidad con evidencia y límites. |
| **32** | M6/U4 | Explicación de decisiones | Situación → acción → efecto → causa respaldada; distinguir hipótesis de hecho. |
| **33** | M7/U5 | Jerarquía móvil | KPI compactos y claridad sin redundancias ni barras superpuestas. |
| **34** | M7 | Ruta principiante | Instrucciones simples y primera campaña guiada comprobable. |
| **35** | M7 | Ruta intermedia | Restricciones y retroalimentación con ejercicios. |
| **36** | M7 | Ruta avanzada | Decisiones múltiples con análisis físico-económico. |
| **37** | M7 | Glosario contextual | KPI, unidades, fórmulas y ejemplos solo cuando son relevantes. |
| **38** | M7/U5 | Accesibilidad real | Android físico, TalkBack, foco, contraste y prueba de comprensión. |
| **39** | M8 | Regresión integral | Suite física/económica, escenarios extremos y E2E completa. |
| **40** | M8 | Auditoría funcional | Navegación, accesibilidad, persistencia y defectos cerrados. |
| **41** | M8 | Documentación final | Guía para usuarios, arquitectura, limitaciones y ejemplos. |
| **42** | M8 | Entrega estable | CI, Pages HTTP, manifiesto/JS, etiqueta final y evidencias. |

## Dependencias y decisiones para futuros agentes

- **Orden recomendado:** 00 → 01–05 → 06–13 → 14–19 → 20–27 → 28–32 → 33–38 → 39–42; controles UX/transversales durante todo el desarrollo.
- **No mezclar** la simulación agregada `flow()` (jornada/unidades equivalentes) con `eventSimulation()` (cohorte de órdenes completas/SKU/días). Cambiar de alcance solo mediante una transformación explícita y auditada; nunca sumar ambos.
- **No falsear completitud:** M2/M3 contienen puente parcial v11.23, M4–M7 siguen parciales. Una implementación con pruebas en PR no cierra su fase si falta integrar/validar en producción.
- **UX acordada:** tarjetas compactas, una idea por bloque, lenguaje accesible, progresión situación → decisión → efecto y detalle técnico desplegable; evitar números gigantes, unidades repetidas y controles superpuestos.
- **Historial:** conservar `docs/ROADMAP.md` como referencia técnica histórica; **este plan sustituye su secuencia de ejecución**. Cualquier ajuste futuro debe actualizar esta tabla, motivo, criterios y microfase activa en un commit verificable.

## Registro de avance

| ID | Estado al adoptar | Evidencia y próximo control |
|---|---|---|
| 00 | **En curso** | v11.23 PR #19 aprobó `Model regression tests` y `Browser end-to-end smoke`; falta confirmar ejecución de Pages **y respuesta HTTP pública**. |
| 01 | **CI y merge aprobados** | PR #20 fusionado en `main`; el HTTP público todavía requiere validación separada. |
| 02 | **Código, CI y merge aprobados** | PR #22 fusionado en main; falta verificación HTTP pública de v11.25. |
| 03 | **Código/CI/merge aprobados** | PR #23 integrado en main con v11.26; falta certificación HTTP pública. |
| 04a | **Código/CI/merge aprobados** | PR #25 integrado como v11.27: vistas SKU vs. jornada y CSV correctamente etiquetados. |
| 04b | **Código/CI/merge aprobados** | PR #26 fusionado en main como v11.28; caché SKU limitada y vistas compartidas. |
| 05 | **Código/CI/merge aprobados** | PR #27 en main, v11.29, migración a sesión v3 y reinicio seguro. |
| 06 | **Código/CI/merge aprobados** | PR #28 fusionado en main como v11.30: Comercial/Planning comparten forecast y compromiso de compras. |
| 07 | **Código/CI/merge aprobados** | PR #29 en main como v11.31; llegada proveedor/PO, cola y recibos físicos auditados. |
| 08 | **Código/CI/merge aprobados** | PR #30 integrado como v11.32; cola FIFO física de Recepción auditada por PO/SKU/día. |
| 09 | **Código/CI/merge aprobados** | PR #31 fusionado como v11.33; lotes retenidos/liberados y cero-eventos corregidos. |
| 10 | **Código/CI/merge aprobados** | PR #32 en main (v11.34), inventario SKU por día/ubicación conciliado. |
| 11 | **Código/CI/merge aprobados** | PR #33 fusionado como v11.35: preparación por pedido/BOM con evento propio y despacho todavía acoplado. |
| 12a | **Código/CI/merge aprobados** | PR #34 fusionado, v11.36. FIFO físico de staging y transporte con capacidad independiente probados. |
| 12b | **Código/CI/merge aprobados** | PR #35 v11.37: campaña, Inventario y ocho áreas reconciliados, staging en modo opt-in. |
| 12c | **Código/CI/merge aprobados** | PR #36 v11.38, activación staging con 3 KPI, persistencia y sesiones migradas; Node+Chromium verdes. |
| 13a | **Completada** | PR #37 fusionado como v11.39 (SHA ce52b36); Model regression #38280303705 y Browser smoke #38280302776 verdes; Pages #38280302926 verificado. |
| 13b | **Completada** | PR #38 v11.40 fusionada en `main` (549c5e2); modelo y Chromium de rama/main verdes; Pages deploy #38282619824 y HTTP #38282620106 aprobados. Contrato auditable de supuestos agregado→SKU, sin mezclar existencias ni economía. Ver STATUS-V11.40.md. |
| 04c | **Completada** | PR #39 v11.41 integrada en `main` (merge e8d94a47). Modelo #38284569085, Chromium #38284569172, despliegue #38284568413 y Pages HTTP #38284569139 aprobados. Ocho hipótesis mapeadas a compromisos/eventos SKU con evidencia. Ver STATUS-V11.41.md. |
| 04d | **Completada (alcance seguro)** | PR #40 v11.42 fusionada en `main` (merge 72fffc2); modelo #38294405709, Chromium #38294405777, Pages deploy #38294405618 y HTTP #38294405842 aprobados. Un contrato compartido entre Resultados/Recuperación y KPI técnico duplicado retirado. Economía y heurística agregadas quedan identificadas hasta M4/M6. Ver STATUS-V11.42.md. |
| 14 | **Completada** | PR #41 v11.43 fusionada a `main` (`ca92d70`), modelo #38303809990, Chromium #38303810043, Pages #38303808959 y HTTP #38303810006 aprobados. Tarifa CLP única por SKU/recurso/proxy con fuentes auditables y actividades sin costo conocido. Ver STATUS-V11.43.md. |
| 15 | **Completada** | PR #42 v11.44 fusionada en `main` (d132809). Modelo #38308500673, Chromium #38308500757, Pages #38308500685 y HTTP #38308500774 aprobados. Conciliación CLP del mismo libro físico SKU por día, zona y catálogo, sin doble conteo ni pagos inventados. Ver STATUS-V11.44.md. |
| 16 | **Completada** | PR #43 v11.45 integrada en `main` (683fda8). Modelo #38335533678, Chromium #38335533680, Pages #38335533220 y HTTP #38335533663 aprobados. Compras SKU por PO: compromiso, proveedor, tránsito, muelle, ingreso físico valorizado y caja no comprobada. Ver STATUS-V11.45.md. |
| 17 | **Completada** | PR #44 v11.46 integrada en `main` (5407119). Modelo #38336924290, Chromium #38336924312, Pages #38336924413 y HTTP #38336924292 aprobados. Costos de refuerzo cobrados solo por jornada operativa activada, con capacidad contratada/usada/ociosa auditada y sin inventar horas ni salarios. Ver STATUS-V11.46.md. |
| 18 | **Completada** | PR #45 v11.47 integrada en `main` (3e03422); modelo #38342297015, Chromium #38342296935, Pages #38342297012 y HTTP #38342296927 aprobados. Contribución parcial SKU por pedido expedido, material consumido y refuerzo aplicable; compromisos/proxies excluidos, sin confundir caja, utilidad ni EBITDA. Ver STATUS-V11.47.md. |
| 19 | **Completada** | PR #46 v11.48 integrada en `main` (7d8849c); Node #38386765739, Chromium #38386765814, Pages #38386765517 y HTTP #38386765720 aprobados. Auditoría SKU por evento/PO/día, 3 partidas incluidas y 6 excluidas sin doble conteo ni caja inventada; guardia de sintaxis JS nueva. Ver STATUS-V11.48.md. |
| 20 | **Completada** | PR #47 v11.49 integrada en `main` (b9d6217); Node #38400327588, Chromium #38400327536, Pages #38400327324, HTTP #38400327630 aprobados. Una base congelada y compartida por cinco alternativas, rechazo de cambios físicos implícitos y caché acotada. Ver STATUS-V11.49.md. |
| 21 | **Completada** | PR #48 v11.50 integrada en `main` (d688d0b). Node #38453947047, Chromium #38453946397, Pages #38453945793 y HTTP #38453947375 aprobados. Esperar **reutiliza el replay físico original**, sin acción/costo incremental, con backlog y fechas exactas; staging en baseline evita deltas falsos. Ver STATUS-V11.50.md. |
| 22 | **Completada** | PR #49 v11.51 integrada en `main` (5e0a180); Node #38473362127, Chromium #38473362124, Pages #38473360995 y HTTP #38473362204 aprobados. Auditoría SKU/PO de faltante, compra, muelle, recepción física y Calidad, recargo separado de pagos; corrección de fecha visible y pruebas móviles. Ver STATUS-V11.51.md. |
| 23 | **Completada** | PR #50 v11.52 integrada a `main` (`038f382b`); Node #38642335671, Chromium #38642335909, Pages #38642335694 y HTTP #38642335619 aprobados. Reserva interna por SKU/día validada contra inventario y costo estándar sin inventar PO, stock ni gasto por traslado no tarifado. Ver STATUS-V11.52.md. |
| 24 | **Completada** | PR #51 v11.53 integrada en `main` (merge `3dca1a537`); Node #38648258802, Chromium #38648258763, Pages #38648258432 y HTTP #38648258841 aprobados. Trazabilidad de capacidad de pedidos por jornada, cupos utilizados/ociosos y costo único de refuerzo, sin atribución falsa en opción combinada. Ver STATUS-V11.53.md. |
| 25 | **Completada** | PR #52 v11.54 fusionada en `main` (merge `9f7663ff`); Node #38655484791, Chromium #38655484946, Pages #38655484338 y HTTP #38655484786 aprobados. Cuatro escenarios sobre baseline congelado, resultado conjunto del replay físico y efectos no aditivos/costos trazados. Ver STATUS-V11.54.md. |
| 26 | **Completada** | PR #53 v11.55 fusionada en `main` (`10028b30`); Node #38659081568, Chromium #38659081577, Pages #38659081984 y HTTP #38659081564 aprobados. Cinco escenarios comparados con mismo baseline, días, pedidos, colas y costos, en panel compacto móvil. Ver STATUS-V11.55.md. |
| 27 | **Completada** | PR #54 v11.56 fusionada en `main` (`9fada009`); Node #38662180974, Chromium #38662180944, Pages #38662180719 y HTTP #38662180825 aprobados. Confirmación de las 5 acciones con testigo de consistencia física, persistencia, control de corrupción, compatibilidad v1 y prevención de duplicados. **M5-20 a M5-27: 8/8 completadas.** Ver STATUS-V11.56.md. |
| 28 | **Completada** | PR #55 v11.57 fusionada en `main` (`cb30f53a`); Node #38664748313, Chromium #38664748355, Pages #38664747840 y HTTP #38664748269 aprobados. Cinco áreas con colas físicas/limitación observada, cronología y coincidencias sin inventar causa raíz. Ver STATUS-V11.57.md. |
| 29 | **Completada** | PR #56 v11.58 integrada en `main` (`85627952`); Node #38994383724, Chromium #38994383607, Pages #38994383039 y HTTP #38994383562 aprobados. Contrafactual de una sola variable sobre cohorte, PO y apertura inmutables; costos no calibrados y ninguna causa raíz exclusiva inventada. Ver STATUS-V11.58.md. |
| 30 | **Completada** | PR #57 v11.59 integrado en `main` (`9ec918be`); Node #38996096100, Chromium #38996096074, Pages #38996095929 y HTTP #38996096082 aprobados. Cuatro replays comparables base/A/B/A+B, interacción no aditiva, cohortes y PO conciliadas, sin costo ni causalidad falsos. Ver STATUS-V11.59.md. |
| 31 | **Completada** | PR #58 v11.60 integrada en `main` (`27045ba`); Node #39086330289, Chromium #39086330318, Pages #39086330099 y HTTP #39086330310 aprobados. Dos criterios explícitos sobre cinco recuperaciones auditadas, no confundir costo parcial con total, reserva sin tarifa ni viabilidad real supuesta. Ver STATUS-V11.60.md. |
| 32 | **Completada** | PR #59 v11.61 fusionada en `main` (`66508633`); Node #39088085201, Chromium #39088086296, Pages #39088085229 y HTTP #39088085226 aprobados. Cinco decisiones explicadas Situación → Acción → Efecto → Evidencia y límites sin inventar costos/entregas. **M6-28 a M6-32: 5/5 completadas.** Ver STATUS-V11.61.md. |
| 33 | **Completada** | PR #60 v11.62 integrada en `main` (`60439cec`); Node #39090154816, Chromium #39090154806, Pages #39090154239 y HTTP #39090154807 aprobados. KPI SKU compactos en filas móviles 44–68 px, supuestos largos plegados, manifiesto PO visible; ocho áreas y navegación sin regresiones en 360/412 px. **M7: 1/6.** Ver STATUS-V11.62.md. |
| 34 | **Completada** | PR #61 v11.63 fusionada en `main` (`401b4ad`); Node #39123401120, Chromium #39123401129, Pages #39123401100 y HTTP #39123401111 aprobados. Cuatro etapas didácticas opcionales, instrucciones por área 1–8, ayuda plegable sin mutación del estado ni simulación extra. **M7: 2/6.** Ver STATUS-V11.63.md. |
| 35–42 | **Pendientes de cierre** | Tras M7-34: M7-35, explicación didáctica de decisiones y alertas, y posteriores M7/M8. |

**Actualización operativa obligatoria:** cambiar solo las filas afectadas, incluir enlace PR/commit, checks y nota de bloqueo; jamás suponer que un cierre hecho en otra conversación se produjo sin evidencias en GitHub.
