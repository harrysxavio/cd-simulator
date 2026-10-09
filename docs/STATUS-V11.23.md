# Estado verificable de fases · v11.23

**Fecha:** 2026-10-09. **Criterio:** no se eleva una fase a «completa» sin cumplir toda su definición de terminado. La fusión y publicación de esta rama requieren CI verde y verificación HTTP de GitHub Pages.

## Fases técnicas

| Fase | Estado | Entregado | Falta |
|---|---|---|---|
| M1 · QA Chromium | ✅ Completada | Recorrido E2E desktop/Chromium móvil, pruebas de regresión y snapshots de fallos | Android físico se valida en M7 |
| M2 · Campaña canónica | 🟡 Parcial avanzada | Pedidos, compras, lotes, traslados y despachos conciliados con ID SKU; diagnóstico, Resumen y ocho áreas usan la misma proyección física v11.23 | Stock inicial/escenario/horizonte único y retiro del cálculo físico agregado paralelo |
| M3 · Ocho áreas integradas | 🟡 Parcial avanzada | Eventos SKU alimentan ocho lecturas; exactitud física y reserva conservadas | Picking y transporte separados por eventos reales, diagnóstico causal desde eventos, capacidad y recursos unificados |
| M4 · Libro económico | 🟡 Parcial | Auditoría valorizada SKU y compromisos de compra | Costos completos por evento y caja/compromiso devengado en un solo libro, sin doble conteo |
| M5 · Recuperación | 🟡 Parcial | Espera, compra adicional, reserva interna y comparación de refuerzo | Decisiones simultáneas confirmables, SLA y costo real de los recursos usados |
| M6 · Diagnóstico | 🟡 Parcial | Se ve la brecha **física SKU** de la misma cohorte en Diagnóstico y Resultados; las hipótesis agregadas están marcadas | Derivar restricciones efectivas y recomendaciones contrastadas desde eventos SKU, incluidas combinaciones |
| M7 · UX y aprendizaje | 🟡 Parcial | Tarjetas compactas, progresión situación → decisión → efecto, detalle técnico opcional y coherencia de unidad de medida en Diagnóstico | Android real, accesibilidad TalkBack, ejercicios principiante/intermedio/avanzado y pruebas de comprensión |
| M8 · Publicación | 🔵 En curso | Release manifest, validación HTTP y suites CI | Verificar v11.23 en sitio público tras CI, cerrar deudas y versionar entrega final |

## Experiencia U0–U5

| Fase | Estado | Siguiente compromiso |
|---|---|---|
| U0 · Escenarios | ✅ Completada | Mantener regresiones de shock / atrasos / reservas |
| U1 · Diagnóstico gerencial | ✅ Alcance inicial completo; ampliado v11.23 | Sustituir hipótesis de una jornada por causalidad física SKU (M6) |
| U2 · Recuperación física | 🟡 Parcial avanzada | Priorización de pedidos, ubicación/lote, costos del traslado y fecha prometida |
| U3 · Comparación antes de confirmar | 🟡 Parcial | Comparador cruzado para medidas conjuntas sin mutación |
| U4 · Resultado explicable | 🟡 Parcial | Integración económica y contrafactual verificable |
| U5 · UX móvil | 🟡 Parcial | Android real, revisión de accesibilidad y validación educativa |

## Qué cambia en v11.23

1. El diagnóstico preliminar deja de rotular los KPI primarios como si una unidad agregada fuera un pedido. «Demanda real», «Salieron del CD» y «Falta atender» representan **pedidos completos de la cohorte SKU de 12 días**.
2. Los tres números vienen de la **misma instancia inmutable** que utilizan «Resultados → Resumen» y «Resultados → Áreas». No se ejecuta un replay adicional por entrar en Diagnóstico.
3. La antigua heurística de restricción se conserva como **hipótesis del modelo agregado de una jornada**, no como causa SKU verificada; no se infiere un cuello de botella real a partir del número de pedidos sin despachar.
4. Se corrige la etiqueta estática de «Versión visible» para concordar con el release efectivo.
5. Las pruebas de negocio comparan diagnóstico/resultado y aseguran conservación de pedidos bajo espera, compra urgente, traslado y bloqueo de capacidades.

**Límites:** las compras originales continúan congeladas; no se modela entrega final ni promesa comercial; no se integraron costos de jornada con los de 12 días; los CTA de intervención por área aún son del modelo anterior. Por tanto, ni M2, M3, M4 ni M6 se declaran completos.

## Orden recomendado

1. Validar CI Node, Chromium y publicación HTTP real en v11.23.
2. M2/M3: mover el **diagnóstico de restricción** y las decisiones correctivas a los eventos de la misma cohorte SKU, retirando gradualmente la heurística agregada de una jornada.
3. M4: unificar recursos, costos, compras comprometidas y valorización antes de afirmar una rentabilidad de campaña.
4. U2/U3: fechas prometidas y reprogramación honesta; después M5/M6 y U4.
5. M7/U5: prueba real Android y aprendizaje con usuarios, sin volver a sobrecargar las pantallas.
