# Plan maestro operativo · 43 microfases

**Adoptado por el responsable del proyecto:** 2026-10-09. **Versión base:** v11.23. **Estado:** vigente hasta reemplazo documentado.  
**Este documento es la fuente de verdad del plan para futuras conversaciones, agentes y sesiones**. Leerlo junto al estado verificable más reciente (`docs/STATUS-V11.30.md`) y la evidencia de GitHub Actions; no asumir que un commit o una PR verde demuestran una publicación pública.

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
| 06 | **En curso** | PR v11.30: forecast/Planning SKU único, compartido por ocho áreas; verificar Node+Chromium, merge y Pages. |
| 04c–04d | **Pendientes** | Transición física de decisiones y retiro del paralelo; dependen parcialmente de M3. |
| 07–42 | **Pendientes de cierre** | Existen funcionalidades parciales previas; verificar implementación individual al llegar a cada ID. |

**Actualización operativa obligatoria:** cambiar solo las filas afectadas, incluir enlace PR/commit, checks y nota de bloqueo; jamás suponer que un cierre hecho en otra conversación se produjo sin evidencias en GitHub.
