# Estado del proyecto · v11.24 · microfases 00–42

**Fecha:** 2026-10-09. **Plan oficial:** [43 microfases](EXECUTION-PLAN-43.md). Los estados cambian solo después de pruebas y publicación verificadas.

## Microfases

| ID | Estado | Evidencia disponible | Pendiente antes de cerrar |
|---|---|---|---|
| 00 · Validar versión de base | **En curso** | PR #19 v11.23 fusionado, CI Node y Chromium aprobados | HTTP de Pages real, versión visible y recursos JS; una captura Android permite comprobación manual |
| 01 · Unidades/horizontes | **En curso, PR #20** | Contrato `src/measurements.js` + tests Node; Diagnóstico, ocho áreas y adaptador reutilizan tipos; versión 11.24 de rama | CI Node, Chromium, fusión a main y validación Pages v11.24 |
| 02–05 · M2 restante | **Pendiente** | Conservan avances parciales de M2 | Stock/escenario inicial común, plan original inmutable, ejecución unificada y persistencia |
| 06–13 · M3 | **Pendiente** | Vistas SKU y balance físico parcial | Picking/Transporte separados, unificación de recursos y pruebas por área |
| 14–19 · M4 | **Pendiente** | Valorización SKU y economía agregada separada | Libro económico único, sin doble conteo |
| 20–27 · M5/U2/U3 | **Pendiente** | Espera, compra extraordinaria y traslado de reserva | Recurso adicional, combinaciones, comparador y seguimiento |
| 28–32 · M6/U4 | **Pendiente** | KPI SKU y diagnóstico provisional | Causalidad y recomendaciones auditadas con contrafactuales SKU |
| 33–38 · M7/U5 | **Pendiente** | UX móvil v11.22 y tutoriales técnicos opcionales | Niveles didácticos y prueba Android/TalkBack real |
| 39–42 · M8 | **Pendiente** | CI y release manifest | Auditoría final, documentación y release estable |

## Qué se implementa en v11.24

- `measuredCount()` valida número entero no negativo, magnitud y alcance.
- `addMeasuredCounts()` **rechaza** sumar pedidos completos, unidades SKU, unidades equivalentes de jornada o horizontes distintos.
- `skuServiceMeasurements()` asegura que pedidos reales = expedidos + pendientes, y declara día 0 y día final del horizonte.
- Resultado SKU y Diagnóstico comparten datos dimensionales inmutables, sin reejecutar eventos ni modificar unidades físicas.
- En `campaignSkuContract()` los nombres de unidad provienen de la misma definición que las áreas.

**No cambia:** volumen comprado, stock inicial, compromisos, precios, motor de una jornada, eventos de 12 días ni entrega al cliente. Los modelos todavía son diferentes; M2 y M3 siguen abiertos.

## Evidencia pendiente de cierre

- Registrar resultado Node y Chromium de PR #20.
- Después de fusionar, validar Pages y el workflow **Live GitHub Pages release verification** sobre el HTML y JS públicos.
- Nunca etiquetar Android real como probado a partir de Playwright móvil emulado.
