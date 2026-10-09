# Plan UX/UI móvil y didáctica · Supply Chain Operations Lab

**Investigación v11.16; U1 v11.17; U2a compra SKU v11.18; U2b reserva ubicada y plan diario SKU v11.19** · Fecha 2026-10-09 · **Estado:** U1 aplicado a Diagnóstico; U2a compra SKU confirmable y U2b traslado de reserva con misma conservación física más calendario de pedidos expedidos. U2c (SLA/compromisos reales de cliente) y U3–U5 siguen pendientes. La experiencia de las ocho áreas todavía tendrá refinamientos posteriores.

Documento complementario: [pruebas reproducidas de sobredemanda y restricciones](SCENARIO-BUSINESS-ACCEPTANCE.md). Se conserva el [roadmap general](ROADMAP.md) de M1–M8: **no se crea un proyecto paralelo ni se salta la integración física.**

## 1. Objetivo del producto: de calculadora de KPI a aprendizaje por decisiones

El usuario debe poder responder sin tener conocimientos profundos de logística:

1. **¿Qué está pasando?** Ej. «Previmos 800 unidades, pero ahora se necesitan 1.400».
2. **¿Por qué hay problema?** Ej. «Hay stock para expedir 566 hoy; no faltan manos en Picking, faltan unidades disponibles».
3. **¿Qué opciones reales tenemos?** Verificar stock, pedir producto extra, redistribuir físicamente desde otra ubicación, reprogramar pedidos o esperar.
4. **¿Cuándo y cuánto cambia cada opción?** Pedidos/unidades recuperados por día, plazo de proveedor, atraso, stock restante, costo adicional y riesgo.
5. **¿Qué decidió y aprendió?** Resultado vs. no intervenir, restricciones restantes, errores evitados y KPI relacionados.

El simulador debe enseñar la secuencia causal antes de exponer tablas, fórmulas, 8×N KPI o valoraciones complejas.

### Dos niveles de lectura (una sola simulación)

- **Modo guiado predeterminado:** situación narrativa breve, entre 2 y 3 decisiones útiles a la vez, datos indispensables, botón «Probar esta opción» y comparación simple.
- **Detalle técnico a demanda:** capacidades, ABC, BOM, ledger por SKU/lote/día, margen proxy, ecuaciones y auditoría. Los datos avanzados usan exactamente el mismo estado de campaña, no otra ejecución invisible.
- **Modo exploración** (posterior): acceso más libre a áreas y parámetros. No obliga al usuario principiante a entender todos los controles.

## 2. Auditoría de jerarquía visual actual

| Síntoma comprobado en la estructura | Efecto para el usuario | Corrección |
| --- | --- | --- |
| Cuatro pestañas globales, cinco vistas de resultados y ocho áreas en roadmap | Se pierde la ubicación: «¿Dónde tomo la decisión?» | Un **paso principal activo**, progreso de cuatro momentos y una acción primaria contextual |
| Diagnóstico crea tarjetas de ocho áreas con varias métricas por área | Se diluye el cuello de botella principal | Mostrar **1 problema principal y hasta 2 contribuyentes**, lista de ocho áreas en «Ver todas» |
| Compra extraordinaria se elige en Resultados → Inventario | La decisión ocurre después del final pedagógico | Trasladar acciones correctivas viables a **Decidir**, antes del resultado final |
| Se muestran de entrada varios libros de compras, controles, plazos, comparadores y saldo por día | Lectura móvil muy larga; se mezcla recomendación con auditoría | Resumen arriba, tarjetas plegables por categoría, trazabilidad avanzada colapsada |
| Plan original congelado, pero Diagnóstico invita a recuperar Comercial/Planning/Compras históricas | Se ofrece una acción que no puede ejecutarse | Distinguir **«decisión original»** de **«acción correctiva nueva»**, sin editar pasado |
| Costos de caja proxy mezclados con estado de resultados agregado | Riesgo de concluir que gastar X produce ganancia Y real | Etiquetas explícitas: **costo supuesto, compromiso, efecto económico proxy, resultado simulado** |
| Porcentajes de stock y capacidades sin historia de arribos | No queda claro por qué la compra no resuelve el problema hoy | Línea de tiempo con **día de solicitud, llegada física, recepción, Calidad y despacho** |
| Al re-renderizar se construye todo SKU y cuatro comparadores | Retraso perceptible potencial en teléfonos | Computación memoizada por versión de escenario, renderizar detalle solo cuando se abre y pruebas de rendimiento |

**Las últimas dos filas se basan en la arquitectura de código; no se afirma una medición real de rendimiento en Android.**

## 3. Flujo propuesto de cuatro momentos

### MOMENTO A · Planificar (antes de conocer el shock)

- Encabezado: «Paso 1 de 4 · Prepara tu centro de distribución».
- Una misión por pantalla o bloque: **situación de esa área → opciones → efecto anticipado**.
- Ejemplo Comercial: «Esperas 1.000 unidades. ¿Qué demanda prepararías?». Opciones 80 % / 100 % / 115 %, con explicación comprensible. El usuario puede ver pronóstico, no la demanda futura.
- Cada decisión muestra **consecuencia inmediata y cadena de dependencia**: «Planning usará 800 unidades para calcular la reposición». No afirmar ganancias futuras no verificables.
- Una barra compacta de ocho áreas sirve de orientación; no repetir ocho paneles técnicos abiertos.

### MOMENTO B · Diagnosticar (shock revelado)

- Un evento destacado: «Llegaron más pedidos de los previstos».
- Primer bloque: **Demanda real · Unidades que hoy podríamos despachar · Unidades en riesgo**. Todo con unidad explícita (pedido o unidad).
- Segundo bloque: **«¿Qué nos está frenando?»**, con una explicación breve de causa y evidencia: «Picking dispone de capacidad, pero solo recibe stock equivalente a X unidades».
- Tercer bloque: hasta dos causas relacionadas. Semáforo: crítico cuando afecta servicio/fecha; amarillo cuando puede empeorar; verde cuando capacidad suficiente. No pintar de rojo por simple baja utilización heredada.
- CTA: **«Explorar alternativas»**. El usuario puede revisar datos de las ocho áreas en un acordeón.

### MOMENTO C · Decidir (recuperación)

Una tarjeta por acción realista y válida para el problema; máximo tres visibles inicialmente:

1. **Aprovechar stock existente:** revisar stock físicamente ubicado/verificable, liberar stock retenido **solo si pasa Calidad**, redistribuir reservas no asignadas a otro cliente y ajustar prioridades. No suma unidades sin origen.
2. **Pedir unidades adicionales:** emitir una **nueva PO** con SKU, cantidad, proveedor, costo y plazo supuesto/confirmado. La original queda intacta. Mostrar «Se podrá prometer desde el día N *si* Recepción, Calidad, Picking y Transporte lo permiten».
3. **Ajustar compromisos:** reprogramar entregas, priorizar pedidos críticos y comunicar fecha estimada. No hace desaparecer demanda, baja pendientes ni genera ventas ficticias.

Otras acciones contextuales: **transferencia entre CD con stock externo físico** (futuro); refuerzo de Recepción/Calidad/Picking/Transporte solo si esa área resulta limitante. Las acciones no pertinentes quedan accesibles en «Ver todas las opciones», con explicación de por qué no sirven *todavía*.

Cada tarjeta muestra «Ayuda a», «Depende de», «Llega», «Costo extra supuesto» y **«Pedidos que realmente rescata»** tras una simulación. Primario «Simular»; secundario «Ver detalle»; luego «Confirmar decisión» separado y reversible mientras no se confirme.

Un comparador debe mantener **la misma cohorte, compra original, proveedor y horizonte**, variando solamente la decisión que el usuario está probando; los resultados no se suman entre alternativas.

### MOMENTO D · Resultado y aprendizaje

- Comparación sencilla **Sin intervenir / Con tu decisión / Brecha restante**, además de día de impacto.
- Hasta cuatro KPI primarios: cumplimiento dentro del plazo definido, pendientes, costo incremental supuesto y capacidad realmente utilizada; explicar cómo se calcularon.
- Semáforo por área, ordenado por **contribución al problema**, con el vínculo «Qué pasó → Qué decidiste → Resultado».
- Explicación positiva cuando una medida fue inútil: «Reforzaste Picking, pero faltaba inventario; aumentaste costo sin mover más pedidos».
- «Ver recorrido por día» y «Abrir auditoría técnica» como secciones opcionales.
- Acción «Intentar otra estrategia» que bifurca una comparación **sin borrar la campaña original**, además de «Nueva campaña» permanente con confirmación.

## 4. Borrador de pantalla móvil: escenario del usuario

La cifra de la tarjeta debe provenir de **un único motor y una única unidad/horizonte** antes de activar este diseño en producción. Las cifras siguientes son un ejemplo del motor agregado; no se mezclan con cantidades SKU:

```text
[ Paso 2/4 · Diagnóstico ]       [↺ Nueva]

  ⚠ Llegaron más pedidos de los previstos
  Preparamos la operación para 800 unidades,
  pero hoy nos solicitan 1.400.

  DEMANDA REAL             1.400 unidades
  EXPEDIBLE HOY              566 unidades
  SIN COBERTURA HOY          834 unidades

  ¿QUÉ NOS ESTÁ FRENANDO?
  📦 Nos falta abastecimiento disponible.
  Picking puede procesar más, pero no tiene
  todas las unidades necesarias.

  [ ¿Cómo lo sabemos? ▾ ]

  ¿QUÉ HACEMOS?
  [ Revisar stock que sí tenemos       → ]
  [ Solicitar reposición adicional      → ]
  [ Reprogramar pedidos pendientes      → ]

  [ Comparar alternativas → ]
```

Y al seleccionar «Solicitar reposición»:

```text
[ Paso 3/4 · Decidir ]           [Volver]

  🛒 Compra extraordinaria
  No modifica la compra original.

  ¿Qué SKU y cuánto nos falta?
  [A · 218] [B · 22] [C · 7]   ← ejemplo de
                                  cohorte SKU
  Fecha de llegada [ Día 1 (supuesto) ▾ ]
  Costo adicional   [ CLP 660.790 aprox. ]

  Resultado estimado para esta cohorte:
     139 → 279 pedidos completos al día 12
      141 →   1 pedidos pendientes

  [ Simular cambio ] [ Ver detalle técnico ▾ ]
  [ Confirmar nueva orden ]
```

**No combinar ambos wireframes numéricamente sin la integración M2/M3.** La primera pantalla habla en unidades de la jornada; la segunda usa un ejemplo distinto de órdenes completas de 12 días. Son referencias de jerarquía visual, no un cierre combinado listo para producción.

## 5. Reglas visuales y de interacción móvil

- **Una pregunta principal por paso** al principio; las subpreguntas se revelan por necesidad. Patrón: [GOV.UK Question pages](https://design-system.service.gov.uk/patterns/question-pages/).
- **Divulgación progresiva**: primero decisiones frecuentes, luego parámetros raros, y auditoría compleja solo a petición. Referencia: [Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/).
- Cuerpo preferente **16 px o más**, renglones con `line-height` aproximado 1.5, máximo dos niveles de jerarquía visibles, tarjetas con márgenes consistentes. Evitar microtexto denso de 12–13 px para argumentos importantes. Objetivos de diseño sujetos a revisión visual.
- Botones principales **mínimo de diseño 44–48 px de alto**, con separación adecuada. El mínimo normativo WCAG 2.2 2.5.8 nivel AA es 24×24 CSS px o espaciamiento equivalente; nuestros tamaños de diseño son un objetivo más cómodo, no una interpretación distinta del estándar. [W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).
- Un único CTA primario por momento, contraste verificable, estado de selección claro, foco visible, etiquetas y anuncio `aria-live` cuando cambia el resultado.
- Reemplazar la navegación simultánea 4 pestañas globales + 5 vistas de resultado por **indicador de etapa** y subcategorías plegadas. Conservar acceso a «Ver operación» y **«Nueva campaña»** de v11.14, siempre disponibles sin competir con la acción principal.
- Al mostrar una intervención, **no desplazar bruscamente la pantalla** con tablas que aparecen/desaparecen. Mantener el encabezado, foco y contexto. Reducir animaciones si `prefers-reduced-motion`.
- En móviles comprobar **360 / 412 px**, zoom 200 %, teclado, foco, orientación, textos extensos y sticky bar que no tape botones. Prueba manual adicional en Android físico, independiente de emulación Chromium.
- Navegación y estado persistente: tras recargar conservar etapa, escenario, alternativa **simulada vs confirmada** y borradores; «Nueva campaña» siempre con confirmación y salida segura.

## 6. Roadmap de cambios por incrementos pequeños

| Incremento | Hitos vinculados | Entrega prioritaria | Aceptación verificable |
| --- | --- | --- | --- |
| **U0 · Puerta de escenarios** (**en este PR**) | M2, M3, M5, M8 | 6 casos de aceptación de negocio automatizados; E2E del caso +40 %; hallazgos y wireframes documentados | Regresión Node, Chromium desktop/móvil verde; valores verificables en Actions |
| **U1 · Diagnóstico comprensible** (siguiente) | M6, M7 | Rediseñar SOLO pantalla de Diagnóstico: resumen breve, 1 restricción prioritaria, evidencia y CTA «Explorar alternativas»; dejar los KPI completos plegados | Un principiante puede responder qué falta y por qué sin abrir detalle; no cambiar físicas ni costos |
| **U2 · Acciones físicas reales** | M2, M3, M5 | Registrar nueva PO posterior al shock, ingreso por plazo/capacidad; stock físico reasignable con trazabilidad; acciones bloqueadas por restricciones reales | Nunca crear stock, comprar retroactivamente o recuperar antes de Recepción/Calidad; pruebas por SKU y fecha |
| **U3 · Pantalla de alternativas** | M5, M6, M7 | Tres tarjetas relevantes, simulación antes de confirmar, comparación de costo y fecha; mover compra urgente desde Resultados a Recuperación | Solo ofrecer soluciones pertinentes y distinguir 0 beneficio / costo positivo; efecto reversible antes de confirmar |
| **U4 · Resultado narrativo y costos** | M4, M6, M7 | Una comparación antes/después del mismo motor; semáforos causales, fecha prometida, costo separado de caja/proxy; detalle plegado | Identidades físicas y monetarias conciliadas; no sumar motor agregado y SKU |
| **U5 · Refinamiento móvil y evaluación** | M7, M8 | Tipografía, espaciado, tarjetas, stepper, estados, rendimiento, WCAG y recorridos guiados; validación Android real | Sin overflow, CTAs accesibles, navegación estable y pruebas de comprensión con usuarios |

### Orden innegociable

- U1 puede implementarse **sin esperar** a consolidar los motores: se limita a claridad y navegación, sin mostrar promesas físicas nuevas.
- U2 y U3 **dependen** de las capacidades físicas reales: no maquillar una compra urgente dentro de un motor agregado que no tiene tal evento.
- U4 requiere un único universo económico, o debe mantener separadas las lecturas con títulos inequívocos.
- U5 itera sobre U1–U4; la accesibilidad esencial y el tamaño táctil deben mantenerse **desde U1**, no postergarse.

## 7. Pruebas de usabilidad y resultado de aprendizaje

Prueba piloto sugerida: **cinco personas** (tres sin experiencia logística y dos con experiencia). Estos son **criterios objetivo, NO resultados obtenidos**:

1. Al menos 4/5 identifican la causa predominante del faltante en **2 minutos**, sin ayuda del evaluador.
2. Al menos 4/5 eligen una intervención físicamente posible y explican por qué **antes** de ver la recomendación.
3. Al menos 4/5 distinguen una **compra nueva** de la compra planificada originalmente.
4. Nadie interpreta «stock en Calidad», «stock no verificable» y «stock en tránsito» como ya disponible para Picking.
5. Al menos 4/5 son capaces de regresar o reiniciar desde cualquier pantalla sin perderse.
6. No hay desbordamiento a 360/412 px, errores de ejecución ni controles primarios inalcanzables por teclado/lector; el seguimiento de rendimiento se mide en móvil real.
7. La pantalla de diagnóstico no se considera aprobada si aún muestra **más de tres decisiones primarias simultáneas** o si requiere comprender el ledger para elegir una acción.

## 8. Riesgos funcionales que no resuelve el maquillaje UI

- Mezclar demanda agregada de una jornada con cohorte SKU de 12 días.
- Modelo de reposición basado en coberturas de una demanda mensual hipotética, mientras el SLA de la campaña está pendiente de definición.
- Refuerzo de 13 días cobrado de manera fija independientemente de turnos seleccionados.
- Una nueva PO, una reubicación y un cambio de promesa al cliente no son el mismo evento: cada uno necesita origen, plazo, estado y efecto diferente.
- «Pedidos completados» y «pedidos entregados a tiempo» todavía necesitan definición de SLA, cortes y promesa de entrega.
- Precisión de pronóstico y confianza de inventario son decisiones/medidas distintas; ningún porcentaje crea stock.
- Un semáforo no debe responsabilizar Picking cuando carece de abastecimiento. La recomendación debe explicar causalidad y límites del contrafactual.

**Regla de producto:** No agregar otro dashboard de métricas hasta que podamos responder con claridad: *«¿Qué problema viste, qué alternativa aplicaste, qué cambió físicamente y qué aprendiste?»*
