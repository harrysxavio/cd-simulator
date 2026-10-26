# I2 · Nico original y voz didáctica, no robótica

**Fecha:** 25-10-2026 · **Naturaleza:** ajuste de calidad transversal a I2-12/16/17 y F5–F8. **No suma una microfase** al plan de 41 ni cambia la siguiente I2-21.

## 1. Arte recuperado y probado

El usuario subió **exactamente los 21 PNG** a `juego/assets/nico` (no `juegos/`). Contrastamos SHA de objeto Git de cada archivo contra los bytes originales del ZIP y SHA-256 de todo el respaldo. Resultado: **21/21 coincidencias**.

- Personaje de cuerpo completo en la tarjeta inicial.
- 12 expresiones registradas en `src/i2-nico-art.js`; se elige expresión por momento pedagógico, sin inventar nueva imagen.
- Antes de conocer la demanda: saludo, duda, explicación, pista y aviso sin revelar resultado. Después: recuperación, análisis y satisfacción vinculada a metas didácticas.
- 5 **láminas completas** de iconos quedan catalogadas para segmentación posterior; no deben estirarse como icono individual ni presumir canal alfa.
- Fallback a `juego/nico.svg` si alguna ruta no carga; texto legible por sí mismo y no dependiente de color.
- Ver integridad en `tests/i2-nico-art.test.mjs` y recorrido `tests/browser-i2-nico-original-art.e2e.mjs`.

## 2. Estándar de voz de Nico

**Propósito:** un colega de bodega que acompaña y enseña, no un chatbot que recita KPI.

- **Tono:** cercano, amable, claro, sereno; lenguaje cotidiano con ejemplos de cajas, stock, muelle y pedidos.
- **Estructura de cada consejo opcional:** «qué significa la decisión» (1–2 frases) → «por ejemplo…» → una pregunta corta que ayude a elegir. No imponer la «mejor» alternativa.
- **Tres niveles:** novato con palabras cotidianas; intermedio conectando áreas y riesgos; avanzado con rigor técnico y límites del modelo pero lenguaje natural. Nunca ser más largo solo por parecer experto.
- **Límites de honestidad:** Nico no conoce la demanda futura, no usa una simulación física para aconsejar antes del reveal y no promete que comprar más produzca más ventas. Compra comprometida ≠ dinero pagado; llegada ≠ recepción; preparado ≠ despachado; despacho ≠ entrega al cliente. Costo total desconocido ≠ $0.
- **Opt-in y accesibilidad:** consejos ocultos inicialmente, con botón para ver/ocultar, foco visible y texto entendible incluso si no carga la ilustración. La preferencia y el nivel se guardan aislados de V1 y del estado de decisiones I2.

## 2 bis. Evolución pendiente: Nico como mentor de gestión

**Corte 26-10-2026:** el consejo corto actual de Nico está implementado, pero **no equivale a una guía completa de gerencia**. La nueva especificación vinculante en [Revisión pedagógica y gerencial](I2-REVISION-PEDAGOGICA-GERENCIAL-2026-10-26.md) exige una segunda capa opcional «Entender esta área con Nico» para cada una de las ocho áreas con propósito, secuencia operacional, palancas de gerente, indicadores auditables, riesgo, efecto sobre cliente y ejemplo por SKU/día. No reducir esa ficha a 1–2 frases ni sustituir el consejo breve ya probado. Tutorial de CD/rol/roadmap/variables saltable y reabrible; informe «La mirada de Nico como gerente» tras recuperar con fortalezas, debilidades y estrategias alternativas, fundadas en ledger. **Todo esto sigue pendiente de implementación y prueba**, incluidos accesibilidad y comprensión real; no marcarlo listo por editar este documento.

## 3. Correspondencia visual con escenas

| Contexto | Nico visual | Mensaje deseado |
| --- | --- | --- |
| Inicio | Cuerpo completo | «¡Hola! Soy Nico… Vamos a recorrer el CD juntos.» |
| Comercial | Duda | Explicar pronóstico con ejemplo de falta/sobrante, no revelar el shock |
| Planificación | Pista | Cobertura frente a stock y compromiso |
| Compras | Explicación | Orden, cumplimiento, llegada y recepción no son lo mismo |
| Recepción | Análisis | Cola física en muelle y capacidad del turno |
| Calidad | Pista | Liberar no es lo mismo que recibir |
| Inventario | Análisis | Stock físico frente a stock localizable/utilizable |
| Picking | Explicación | Pedidos completos requieren SKU y capacidad |
| Transporte | Pista | Preparación, expedición y entrega final separados |
| Pre-reveal | Alerta | Plan cerrado, suspenso sin filtración del resultado |
| Crisis/recovery | Demanda y recuperación | Examinar tiempos y costos antes de intervenir |
| Resultados | Análisis / Mejora / Meta | Reacción derivada de dos metas verificables, sin fingir rentabilidad total |

## 4. Aceptación automática y humana

- Node: 3 niveles × 8 áreas sin resultados futuros, ejemplos concretos, preguntas abiertas, estado no mutado, coherencia con V1; 21 hashes SHA-256.
- E2E: retrato original cargado (no 404), expresión de consejo visible, toggles y niveles persistentes, sin spoiler, 320–430 px y footer fijo; regresión general Chromium.
- F8 pendiente: revisar Android real y TalkBack con usuario novato, en especial proporción del personaje, volumen visual, fondos claros sobre tarjetas oscuras y comprensión de explicaciones. No considerar prueba automática equivalente a aprobación humana.

**Evolución futura:** segmentar láminas a iconos semánticos después de una revisión visual, mantener assets originales versionados; mejorar reacciones posrevelación contra métricas realmente disponibles, sin inventar indicadores.
