# Estado de ejecución · v11.27 · microfase 04a

**Fecha:** 2026-10-09. **Plan oficial:** [43 microfases](EXECUTION-PLAN-43.md). **Desglose operativo:** [issue M2-04 #24](https://github.com/harrysxavio/cd-simulator/issues/24).

## Cambios implementados en 04a

- Auditoría [M2-04A-SCOPE-AUDIT.md](M2-04A-SCOPE-AUDIT.md): registro por pantalla y función de origen de los datos, magnitudes y decisiones aún pendientes de migración.
- Indicadores **SKU** principales y ocho áreas llevan `data-model-scope=sku-cohort`.
- Motor anterior de **una jornada agregada** se identifica en las vistas de diagnóstico técnico, flujo, costos y mejoras. El usuario ve una breve explicación donde tiene que decidir, sin tarjetas nuevas gigantes.
- «Flujo real por área» cambia a «Flujo agregado por área»; el CSV pasa a llamarse `supply-chain-jornada-agregada.csv`, con cabecera de modelo, período, unidades y límite de uso.
- Pruebas Node y de navegador (desktop/Pixel 7) comprueban etiquetas, no mezcla de métricas y descarga CSV real.
- Esta entrega NO modifica el resultado de unidades/órdenes ni reemplaza `flow()`; es una barrera de trazabilidad antes de la futura migración 04b–04d.

## Estado al preparar la entrega

| Microfase | Estado | Evidencia |
|---|---|---|
| 00 | **En curso** | Falta comprobar HTTP real de GitHub Pages, HTML, manifest, JS. La lectura pública por web/contendor falló por acceso de red; no es evidencia de que el sitio esté caído. |
| 01 | **Código/CI/merge aprobados** | PR #20 |
| 02 | **Código/CI/merge aprobados** | PR #22 |
| 03 | **Código/CI/merge aprobados** | PR #23, merge `56315f12374775ae7e7dcd902b9288c3063f8a44` |
| 04a | **En curso** | Nueva rama + pruebas, esperar CI Chromium/Node y merge. Publicación Pages sin certificar. |
| 04b, 04c, 04d | **Pendientes** | No están implementados. 04c/04d dependen del cierre físico M3. |
| 05–42 | **Pendientes de cierre** | Conservar implementaciones parciales ya disponibles. |

## Próximo

1. Confirmar pruebas CI Node/Chromium de 04a y fusionar solo si ambas están verdes.
2. Verificar GitHub Pages **por HTTP real** con manifest/HTML/JS v11.27. No marcar 00 ni despliegue como completado sin ese control.
3. Implementar **04b**: compartir la ejecución SKU entre las vistas en una sesión para evitar nuevos replays innecesarios y validar coherencia tras navegación y recarga.
