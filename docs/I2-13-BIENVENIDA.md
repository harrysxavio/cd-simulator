# I2-13 · Bienvenida y briefing de la primera misión

**Objetivo:** entrar al primer desafío rápidamente, entender qué es un centro de distribución y saber exactamente qué aprenderás, sin leer paneles extensos ni revelar información futura.

## Experiencia de primera entrada
- **Una portada, una acción:** «Comenzar misión» abre directamente Comercial. No se obliga a pasar por configuraciones, un tutorial ni decisiones adicionales (≤3 acciones hasta la primera área; este caso requiere una).
- **Contexto humano:** «Hoy tú diriges el centro de distribución» y explicación sencilla de CD; responsabilidad de administrar recepción, organización, preparación y despacho.
- **Datos iniciales:** 8 áreas, **3 tipos de producto (SKU)** y **12 días**; base de 200 pedidos previstos en la muestra pedagógica. Son datos de planificación, no demanda real ni despachos.
- **Tres pasos breves:** elegir alternativas en ocho áreas → descubrir demanda tras cerrar el plan → recuperar y aprender. No mostrar resultado físico, demanda real, sorpresa porcentual ni costo antes del evento de revelación.
- **Salida segura:** «Laboratorio» vuelve a V1; el juego se mantiene en su clave independiente y puede reanudarse al volver.
- **Retorno al briefing:** si el jugador retrocede desde un área ya planificada a la portada, el CTA es «Continuar mi plan» y avanza a la **primera área sin confirmar**, conservando las decisiones selladas. Si todas están confirmadas y se volvió a la portada, muestra la última área cerrada y se accede al reveal mediante su botón original.
- **Costo real:** operación ficticia, sin ordenar compras ni efectuar movimientos.

## Frontera de datos
`src/i2-first-mission-briefing.js` proyecta únicamente `I2_PRODUCT_SCOPE`, `I2_MVP_CASE.plannedOrders` y el estado de navegación validado. No consume `campaignSkuContract`, inventario, demanda real ni el ledger. La introducción no supone que el usuario conozca abreviaturas logísticas.

## QA requerido

`tests/i2-first-mission-briefing.test.mjs` verifica los 3 indicadores, 3 pasos, denominaciones canónicas, la ausencia de spoilers y que volver a la portada nunca elimina decisiones.

`tests/browser-i2-first-briefing.e2e.mjs` recorre pantalla Android simulada 320–430px y 740×360: no hay scroll externo, CTA visible, decisión inicial en un clic, navegación atrás, recarga, regreso efectivo a V1 y retoma en el primer punto incompleto sin mutar `supply-lab-v90`.

Node, Chromium completo y puerta focused son obligatorias antes del merge; tras la integración, Pages y HTTP público deben validar la entrega.

**Límites:** el MVP sigue usando escenario alfa fijo. I2-14 cubrirá configuración básica; I2-15 la avanzada; I2-16 tutor didáctico optativo. La evaluación de Android físico, TalkBack y comprensión de usuarios principiantes permanece pendiente.
