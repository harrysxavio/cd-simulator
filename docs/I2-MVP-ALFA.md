# Misión CD · MVP alfa vertical — alcance y validación

**Estado:** candidato en PR, **no declarar publicado antes de Node, Chromium, Pages y HTTP públicos verdes**. El roadmap completo de 41 microfases permanece vigente: este corte alfa atraviesa algunos requisitos de I2-04, I2-07–12, I2-17–30 y I2-31 como demostrador, **pero no los cierra formalmente**. Cada fase seguirá su propia aceptación.

## Lo visible en el primer MVP

1. Acceso desde V1 a `/juego/`; regreso a V1 sin sobrescribir `supply-lab-v90`.
2. Una sola escena por vez, botón inferior siempre disponible; scroll dentro del contenido, no en toda la página.
3. Ocho decisiones con alternativas extraídas del catálogo real `NODES` y explicaciones bajo demanda.
4. Demanda real **oculta hasta pulsar «Revelar demanda»**; caso fijo +40 %, con 200 pedidos planificados en una muestra SKU y 280 reales. No inventar información para «ayudar» al usuario a adivinar.
5. Cinco recuperaciones canónicas, plazos `1/2/5/10/13`, coberturas `0/25/50/75/100`; vista previa opcional y confirmación.
6. Resultado de expedidos y pendientes a día 12, diferencia contra baseline, costo incremental **modelado y parcial**, desglose por ocho áreas después de la revelación.
7. Reintento y sesión local separada `supply-lab-i2-v1`; únicamente elecciones y posición, sin persistir ledgers físicos ni datos personales.

## Fuente del cálculo y obligaciones

- `src/i2-mvp-adapter.js` valida decisiones de I2 y llama **directamente a** `campaignSkuContract` + `createSkuSessionCache`; esta última genera una sola vista física SKU con `recoveryComparison`, `supplyBridge` y `campaignAreaReadModel`. Ninguna fórmula operativa duplicada en `juego/app.js`.
- Todas las alternativas parten de **la misma compra original**, del mismo opening físico y de la misma demanda real del caso; la compra urgente (si corresponde) es adicional e independiente.
- Este MVP **no** garantiza que una acción mejore servicio; no combina linealmente efectos de recuperaciones.
- Las cifras de la cohorte SKU nunca se suman con las «unidades equivalentes» del agregado de una jornada.
- «Despachado desde el CD» ≠ «entregado al cliente»; el costo total integral no está disponible. Los CLP ilustrativos no son gasto ni compra ejecutada.
- Se usa solo un caso didáctico **predeterminado** para la alfa. Configuración amplia, guía como personaje, dificultades, gamificación por logros, historial de escenarios y QA humano quedan para fases posteriores.

## Criterios para llamar a esto MVP alfa **jugable**

- Una persona puede iniciar, elegir en 8 áreas, revelar y confirmar una intervención hasta ver KPIs físicos reales, sin error JS/HTTP.
- Footer visible sin scroll vertical **externo** en 320/360/390/412/430 px; sin overflow horizontal ni cierre de explicaciones forzoso.
- La sorpresa no aparece ni se ejecuta en el flujo previo a pulsar el botón.
- Refresh durante misión conserva decisiones; reiniciar cambia solo la sesión I2, no la V1.
- La comparación de los mismos inputs de V1 e I2 es exacta en pedidos, PO, ledger de referencia y costo incremental modelado.
- La compra urgente con llegada al día 13 **no puede aumentar despachos al día 12**.
- Node + Chromium + Pages + **GET público real de JS, CSS e index** aprobados.

## Próximas fases después de la alfa

- I2-04 adaptador y matriz 8×5 exhaustiva, sin limitarse a este caso.
- I2-05 estado y migraciones completas; I2-06 privacidad/economía completa.
- I2-07–12 UI final, microtutorial, personaje optativo y prueba de ergonomía.
- I2-13–17 onboarding y configuración básica/avanzada; I2-18–25 detalle didáctico completo por área.
- I2-26–35 escenarios reproducibles, diagnóstico y recuperación ampliados, resultado y gamificación pedagógica.
- I2-36–40 matriz de controles, accesibilidad/TalkBack, evaluación con principiantes y liberación estable.
