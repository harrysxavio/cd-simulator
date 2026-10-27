# I2-31 · Resultado principal del gerente y la mirada de Nico

**Objetivo:** enseñar al jugador a juzgar su resultado con criterio de gerente de CD, a partir de hechos auditables y no de métricas o causas ficticias.

## Presentación móvil

En el resultado final se mantienen exactamente **dos indicadores destacados**: pedidos completos expedidos del CD y pedidos pendientes al corte día 12. Debajo aparece una opción desplegable **«Ver tablero gerencial · cuatro ejes»**; el panel no invade la pantalla cuando está cerrado.

Los cuatro ejes tienen un valor, un estado interpretativo, una fórmula, umbral, explicación y fuente desplegables. También se puede abrir «La mirada de Nico como gerente», que separa **lo que salió bien, los riesgos/sacrificios, tres preguntas y el impacto limitado que conocemos del consumidor**.

## Criterios de evaluación (transparencia por eje)

| Eje | Fuente | Umbral real del ejercicio | Límite |
|---|---|---|---|
| Servicio | Pedidos expedidos / pedidos observados × 100 | Meta configurada 85/90/95%; atención a 10 puntos de distancia y crítico por debajo | Salida CD no es entrega a domicilio |
| Capacidad/productividad | Pedidos expedidos / 12 jornadas (ritmo medio) | **Sin semáforo certificable**. Se muestra «Sin evaluación» mientras falten dotación, horas trabajadas, capacidad nominal comparativa y turnos totales | No etiquetar pedidos/jornada como productividad por persona-hora ni ocupación certificada |
| Costo incremental | CLP extra modelados / límite configurado | Verde hasta límite, atención hasta 110%, crítico encima | No incluye costo operativo total, pago, P&L o beneficio contable |
| Tiempo/stock | Pendientes al cierre / observados | Verde si 0; atención si más de 0 pero <=10%; crítico sobre 10% (criterio didáctico expreso) | No atribuye causa a falta de stock, preparación o despacho sin comprobar SKU/eventos |

Las señales de espera en Recepción y Calidad se presentan exclusivamente como datos de **plan original sin recuperación**. Nunca se suman las unidades SKU con pedidos, ni se presentan como causas probadas de los pendientes tras intervenir.

## Modelo auditado

`i2ManagerResultBoard({state,scorecard,baseline,objectives,mode})` recibe un `i2SafeScorecard` del resultado confirmado clásico o conjunto, los objetivos de I2-14 y el diagnóstico original I2-27 (`i2ManagementDiagnosis` sobre `i2MvpPhysicalResult(option='wait')`). No crea ningún evento de inventario, presupuesto o recuperación. Exige conservación de pedidos, mismo escenario original y valor `null` explícito en costo total, utilidad y entrega final al cliente.

Nico identifica mejoras frente al baseline, gasto extra por decisiones poco útiles, servicio rojo, costo rojo y pendientes. **No declara éxito global si hay semáforos críticos.** Propone preguntas sobre BOM/stock liberado, capacidad vs gastos y mediciones operativas faltantes, sin asumir que una cola proviene de un único cuello.

La presencia de `result` no debe alterar el estado guardado, la decisión confirmada, las compras originales, las capacidades del motor, la semilla ni la lógica de V1.

## QA

- Node: 5 semillas × tres recuperaciones clásicas; 5 × multiacciones confirmadas, ambos modos con mismo baseline; fórmula/umbral/fuentes por los cuatro ejes y niveles de Nico; entradas inconsistentes y resultados financieros falsos rechazados.
- Chromium Android simulado: dos recorridos a resultados clásico y conjunto; 4 ejes bajo un disclosure; Nico y fuentes; ausencia de spoiler antes del reveal, 2 KPIs en encabezado, sin scroll exterior, botones visibles, recarga y V1 intacta.
- Cerrar microfase solo tras pruebas de modelo, suite I2 enfocada, Chromium integral, PR fusionada y actualización de estado. La URL pública GitHub Pages y el dispositivo Android físico/TalkBack deben verificarse por separado.

**F7 permanece abierta:** I2-32 (detalle de ocho áreas), I2-33 (economía auditada), I2-34 (aprendizaje e insignias), I2-35 (retos y balance). No declarar 5/5 con esta entrega sola.
