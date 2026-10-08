# Supply Chain Operations Lab — v8.2

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

## Modelo económico y límites

- El resultado operacional simulado es ingreso potencial menos costo de mercancía expedible y gastos operacionales.
- El desembolso de la jornada contabiliza compras recibidas por separado; no se reconoce todo lo comprado como costo de venta.
- El stock inicial y la reserva utilizada se valorizan según el costo unitario configurado.
- Las decisiones especiales y las acciones correctivas incorporan recargos de referencia didácticos.
- La meta de costo unitario es global. No se inventan presupuestos por área.
- No se trata de un estado de resultados completo: se excluyen impuestos, depreciación, mermas valorizadas, inventario final contable y entregas confirmadas.
- Una jornada, unidades agregadas, sin SKU ni pedidos individuales. Datos ficticios y deterministas.
- La información se guarda localmente en el navegador.

## Arquitectura

- `index.html` — estructura semántica y navegación.
- `src/engine.js` — áreas, decisiones y parámetros (incluye compatibilidad con un evaluador anterior).
- `src/flow.js` — propagación de unidades y acciones correctivas.
- `src/scenario.js` — configuración, validación y modelo económico.
- `src/app.js` — experiencia de usuario, KPI, diagnóstico, navegación y exportación CSV.
- `src/styles.css` — estilos responsivos.
- `tests/model.test.mjs` — regresión del modelo (`node --test tests/model.test.mjs`).
- `archive/` — versiones anteriores.

Aplicación estática en GitHub Pages, sin dependencias de frontend ni backend.

## Estado de calidad

Se realizan pruebas de sintaxis, cálculo y navegación simulada; estas pruebas **no sustituyen** una revisión visual en Chrome Android, accesibilidad con lector de pantalla ni validación por usuarios externos. El simulador es una herramienta didáctica, no un software de planificación empresarial.

## Portafolio y autoría

Proyecto conceptualizado y dirigido con criterios de Supply Chain, mejora continua, productividad y costos, desarrollado iterativamente con asistencia de IA. El valor del ejercicio está en definir las reglas de negocio, cuestionar resultados, detectar inconsistencias y decidir qué merece automatizarse, no en presentar la generación de código como una hazaña técnica.

## Próximas fases

Pendiente: metas estratégicas, KPI con objetivos por área, evaluación del criterio del usuario, comparación de escenarios y validación con usuarios externos.
