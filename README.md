# Supply Chain Operations Lab — v8.0

**[Abrir el laboratorio interactivo](https://harrysxavio.github.io/cd-simulator/)**

Simulador educativo, gratuito y sin registro para practicar decisiones conectadas en una **empresa ficticia de distribución**. Pensado para estudiantes, personas que comienzan en Supply Chain y profesionales que quieren experimentar con restricciones y trade-offs operacionales.

> **Idea central:** optimizar un área no garantiza mejorar el resultado de la empresa. Hay que distinguir capacidad local, flujo recibido, productividad observada, costo y resultado global.

## Recorrido de aprendizaje

1. **Configura (opcional):** parte con valores ficticios de ejemplo o personaliza demanda, stock, reservas, personal, costos y objetivos.
2. **Planifica:** toma decisiones en Comercial, Planning, Compras, Recepción, Calidad, Inventario, Picking y Transporte. En cada área puedes abrir **«Aprende el indicador»** para ver su fórmula, interpretación y vínculo con la estrategia.
3. **Diagnóstico preliminar:** identifica la diferencia entre capacidad propia y restricciones heredadas; revisa el resultado antes de cualquier recuperación.
4. **Recuperación opcional:** mantén la operación o elige mejoras puntuales, equilibradas, intensivas o cantidades personalizadas. El impacto se recalcula en toda la cadena.
5. **Resultado final:** compara cumplimiento, unidades expedibles y costos; consulta trazabilidad, flujo y economía en paneles desplegables.

## KPI de aprendizaje

| Área | Indicador pedagógico |
|---|---|
| Comercial | Error absoluto de pronóstico |
| Planning | Cobertura de la brecha de reposición |
| Compras | Cumplimiento de entrega del proveedor |
| Recepción | Unidades recibidas por operario y jornada |
| Calidad | Tasa de liberación |
| Inventario | Disponibilidad respecto de la demanda |
| Picking | Unidades preparadas por operario y utilización |
| Transporte | Utilización de la capacidad de expedición |

Los indicadores se calculan con el escenario actual. **Productividad observada ≠ productividad intrínseca del trabajador:** puede existir capacidad ociosa por restricciones aguas arriba. No se calcula OTIF, fill rate por pedido ni precisión estadística real de pronósticos históricos.

## Modelo y límites

- Una sola jornada, unidades agregadas y un único flujo de distribución; no hay SKU, pedidos individuales, plazos de entrega detallados, múltiples centros ni aleatoriedad.
- Los resultados son deterministas y **no equivalen a datos reales de ninguna empresa**.
- Las compras, recepciones, liberaciones, inventario disponible, preparación y expedición están encadenadas. Las acciones pueden mejorar un área sin mejorar el total.
- El costo operativo estimado considera personal, refuerzos, compras recibidas, recargo de compras urgentes, empaque, transporte y otros costos fijos.
- El **saldo operativo simulado** es ingresos de unidades expedibles menos desembolsos y costos modelados; **no es margen contable ni utilidad neta**. El costo de compras recibidas puede incluir unidades no expedidas y no se valoriza el consumo del inventario inicial. No hay impuestos, depreciación, devoluciones, costo de oportunidad ni inventario final contable.
- Los semáforos de costos usan un **presupuesto pedagógico distribuido proporcionalmente** desde la meta global, no presupuestos reales por centro de costo.
- La capacidad predeterminada representa una operación pequeña; si elevas la demanda, debes adaptar las capacidades y dotaciones en cada área.
- Los datos se guardan en el navegador (localStorage). No se envían a un servidor.

## Arquitectura

- `index.html` — estructura semántica y navegación.
- `src/engine.js` — áreas, decisiones y parámetros (incluye compatibilidad con un evaluador anterior).
- `src/flow.js` — propagación de unidades y acciones correctivas.
- `src/scenario.js` — configuración, validación y modelo económico.
- `src/app.js` — experiencia de usuario, KPI, diagnóstico, navegación y exportación CSV.
- `src/styles.css` — estilos responsivos.
- `archive/` — versiones anteriores.

Aplicación estática en GitHub Pages, sin dependencias de frontend ni backend.

## Estado de calidad

Se realizan pruebas de sintaxis, cálculo y navegación simulada; estas pruebas **no sustituyen** una revisión visual en Chrome Android, accesibilidad con lector de pantalla ni validación por usuarios externos. El simulador es una herramienta didáctica, no un software de planificación empresarial.

## Portafolio y autoría

Proyecto conceptualizado y dirigido con criterios de Supply Chain, mejora continua, productividad y costos, desarrollado iterativamente con asistencia de IA. El valor del ejercicio está en definir las reglas de negocio, cuestionar resultados, detectar inconsistencias y decidir qué merece automatizarse, no en presentar la generación de código como una hazaña técnica.
