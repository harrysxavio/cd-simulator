# I2-35.5c · Primera misión opcional con incidente físico sorpresa

**Corte:** 31-10-2026 · **Estado:** código en rama y PR por validar. No cierra
35.5c completo ni los padres I2-35/36/37/38/39/40.

## Nuevo recorrido del jugador
- Portada: botón opt-in «Activar misión con incidente sorpresa», oculto como
  tipo/fecha hasta revelar, con opción de desactivar antes de confirmar.
- La semilla operacional se selecciona una sola vez con aleatoriedad del
  navegador y se **persiste antes de las ocho decisiones**. Es independiente
  de `seed` de demanda, de las elecciones del gerente y del score.
- Reinicio de la misma misión mantiene ambas semillas. Las partidas antiguas
  sin `eventSeed` siguen exactamente sin incidentes.
- No se combina este primer piloto con el diagnóstico de Picking limitado
  para evitar mezclar dos prescripciones didácticas.
- Después de revelar: Nico muestra día, etapa y duración de la parada,
  además del resultado físico bajo la misma demanda, plan y compras con
  y sin interrupción. Una diferencia de **cero expediciones** es válida;
  no se inventan perjuicios, multas, costos ni causas.
- La recuperación clásica y la multiacción confirman su resultado con el
  mismo calendario del baseline; el laboratorio de cinco estrategias recibe
  también ese calendario, sin contrafactual mezclado.

## Límites sin ocultar
- Las jornadas físicas se simulan de una vez (0–12). La parada se muestra en
  el análisis posterior al reveal, **no** como una escena animada en su día.
- Las palancas de recuperación actuales pueden representar actuaciones
  retroactivas. En este modo se rotulan explícitamente
  **«laboratorio retrospectivo»**, no como órdenes gerenciales emitidas
  en tiempo real.
- La misión puede causar colas sin reducir despachos finales, si existen
  holguras o restricciones distintas. No modificar seeds para prometer
  un resultado emocionante.
- Simulación didáctica, sin entrega confirmada al consumidor ni contabilidad
  completa.

## Pruebas y aceptación
1. Node: persistencia, normalización estricta, estado anterior sin semilla,
   reintento idéntico, demandas/PO congeladas, mismo baseline en cinco
   estrategias y multiacción.
2. Chromium Pixel 7: botón activable, estado persistente, no spoilers,
   revelación con explicación, retorno y recarga, 360 px sin overflow.
3. Regresión V1, I2 general y prueba enfocada; PR+merge con suites verdes.
4. Pages/HTTP: verificar JS/CSS y la nueva entrada realmente servidos.
5. QA real Android/TalkBack y prueba pedagógica: **pendientes humanas**.

## Siguiente corte obligatorio (35.5c2)
Introducir **reloj operacional y decisiones después de la observación**
con lead time y jornada mínima ejecutable. Implementar estrategias distintas
para recuperar Recepción y Calidad cuando el motor y la economía puedan
modelarlas de verdad; fijar un contrato de snapshot parcial por día y
conservar la base/PO al reejecutar. Luego 35.5d probar cinco seeds de
demanda por tres calendarios de eventos y aceptación móvil humana.
