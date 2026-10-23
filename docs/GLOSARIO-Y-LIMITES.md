# Glosario operativo, indicadores y límites de interpretación

**Versión:** v11.68 r177 · Este glosario distingue la campaña física SKU del ejercicio agregado de una jornada. Los términos pueden compartir nombre pero no necesariamente dimensión, horizonte ni cálculo.

## 1. Las cinco unidades que no deben confundirse

| Concepto | Qué es | Ejemplo |
|---|---|---|
| Pedido completo | Solicitud de cliente con todas las líneas requeridas | Un pedido combinado requiere 1 SKU A + 1 SKU B |
| Unidad SKU | Una pieza física de un producto definido | 3 unidades A son 3 piezas, no 3 pedidos |
| Jornada agregada | Modelo de flujo de unidades equivalentes durante un turno | 566 expedibles no significan 566 pedidos completos |
| Día de campaña | Índice de simulación de la cohorte SKU, típicamente 0–12 | Día 2 de recepción, no fecha contractual |
| CLP ilustrativo | Monto calculado con tarifas ficticias y supuestos | Compra comprometida no equivale a desembolso pagado |

**Regla operativa:** no sumar ni dividir métricas de distinto horizonte y unidad. Antes de interpretar una cifra, pregunta: ¿qué cuenta?, ¿en qué fechas?, ¿de qué cohorte?, ¿proviene de qué motor?

## 2. Demanda, compra y proceso físico

| Término | Definición práctica | Lo que NO significa |
|---|---|---|
| Forecast | Estimación comercial antes de conocer la demanda real | Demanda efectivamente ocurrida |
| Cobertura de Planificación | Fracción de necesidades de reposición cubierta por la compra original | Stock disponible garantizado |
| Sorpresa de demanda | Aumento/disminución respecto de demanda base tras planificar | Que se puedan modificar órdenes anteriores |
| PO original | Orden de compra comprometida en la planificación del ejercicio | Mercadería ya recibida o pagada |
| Compra urgente | Nueva orden adicional para intentar cubrir faltantes | Recepción automática instantánea |
| Lead time | Plazo supuesto entre un hito de compra y la llegada | Compromiso real de proveedor |
| Fill rate proveedor | Proporción realmente entregada frente a cantidad pedida | Proporción recibida por el CD, o tasa de cumplimiento de pedidos cliente |
| Arribo al muelle | Mercadería entregada físicamente por proveedor en la simulación | Entrada ya recepcionada o liberada |
| Recepción | Ingreso controlado según capacidad de Recepción | Mercadería lista para Picking |
| Retenido en Calidad | Lote recibido que aún no se libera | Merma/rechazo definitivo |
| Disponible | Existencia liberada y utilizable según reglas del motor | Promesa de entrega al cliente |
| Stock no verificable | Existencia física cuya confiabilidad/identificación restringe su preparación | Stock desaparecido |
| RESERVA-CD | Porción ubicada del mismo inventario inicial | Almacén externo o compra nueva |
| PICK-FACE | Ubicación lógica desde la cual se prepara mercancía | Modelo WMS de racks y ubicaciones reales |
| Picking | Preparación del BOM completo de una orden | Expedición física necesaria |
| STAGING-CD | Zona de espera de pedidos preparados si transporte está separado | Despacho ni entrega confirmados |
| Expedición | Salida de pedido completo desde el CD simulado | Última milla, POD o entrega final |
| Backlog | Pedidos que siguen pendientes de expedir | Todos atrasados frente a un SLA de cliente validado |

## 3. Indicadores de servicio y productividad

### Pedidos expedidos y pendientes (cohorte SKU)

**Pedidos pendientes = pedidos reales − pedidos completos expedidos.**

Ejemplo: 280 reales y 139 expedidos implican **141 pendientes**. Se cuenta cada pedido una vez y no se mezclan piezas de SKU con pedidos.

**Cumplimiento físico de expedición al corte = 100 × expedidos / pedidos reales.** Esto es una interpretación de servicio de salida del CD. No demuestra OTIF ni entrega final, pues no existen promesas de cliente reales.

**Días-pedido de espera (backlog order-days):** suma diaria de pedidos aún pendientes durante los días evaluados. Si 4 pedidos esperan 3 días cada uno, son 12 días-pedido. No debe presentarse como “12 pedidos tardíos” ni como días de atraso contractual.

**Pedidos en plazo del laboratorio:** la referencia interna puede usar los pedidos despachados el día 0; no equivale a una promesa contractual ni a un SLA medido.

### Capacidad, utilización y productividad (jornada agregada)

**Capacidad:** volumen máximo simulado en una etapa, dependiendo de dotación, horas, política y recursos. No asegura que exista stock o flujo para utilizarla.

**Utilización = volumen procesado / capacidad de la etapa**, cuando el denominador sea positivo. Una utilización baja puede indicar falta de alimentación, no necesariamente personal sobrante.

**Productividad de Picking = unidades preparadas / número de operarios**, bajo los supuestos de la jornada. Para evaluar productividad real se necesitarían horas efectivas verificadas, mix, complejidad, tiempos y datos observados.

**Restricción:** recurso o disponibilidad que limita la progresión del flujo bajo un conjunto de supuestos. Puede desplazarse a otra área al cambiar capacidad o abastecimiento.

### Diagnóstico y causalidad

Una **alerta** es señal de algo que merece revisión; una **hipótesis** es una explicación a probar; un **contrafactual** modifica una variable manteniendo las demás constantes; una **causa raíz validada** requiere evidencia del proceso real. Un simulador puede demostrar propiedades de su modelo, no demostrar una causa raíz observada en tu operación.

## 4. Costos y términos económicos

### Vista Costos del modelo agregado

| Indicador | Interpretación permitida |
|---|---|
| Costo de mercancía expedible | Valorización ilustrativa del material atribuido a unidades expedidas, incluyendo material del stock inicial |
| Gastos operacionales | Dotación, refuerzos, transporte, empaque y otros supuestos según el motor |
| Costo total | Costo mercancía expedida + gastos operacionales; aplica a la **jornada agregada** |
| Costo por unidad expedible | Costo total / unidades expedidas cuando hay denominador válido |
| Desembolso total de jornada | Compras recibidas modeladas + gastos operacionales; diferente del costo de mercancía |
| Ingresos potenciales | Unidades expedibles × ingreso supuesto unitario |
| Resultado operacional simulado | Ingresos potenciales − costo total de este ejercicio; no es contabilidad certificada |

### Libro SKU y recuperación

**Valoración SKU:** valor de apertura + costo estándar de recepciones = costo de SKU expedido + valor del stock físico final (disponible, retenido, reservado y staging según corresponda).

**Compromiso de compra:** precio y cantidad de la PO adicional; no afirma factura pagada o mercancía recibida.

**Costo de refuerzo aplicado:** tarifa ilustrativa de los recursos/turnos de capacidad efectivamente activados según las reglas del modelo. No demuestra nómina real, horas reales, ni que sean factibles contratarse.

**Contribución parcial SKU = valor potencial de pedidos completos expedidos − costo estándar del material expedido − costo de refuerzo aplicado.** Excluye conceptos que no están contabilizados en ese resultado parcial. No se debe llamar utilidad, EBITDA o margen neto.

**Caja incremental simplificada** en el comparador = ingreso adicional supuesto − compromiso/desembolso incremental modelado. Es un proxy, no un estado de flujo de efectivo, una cuenta bancaria, cobros o pagos verificados.

**Resultado económico proxy** agrega/sustrae supuestos como penalidad ilustrativa por backlog y tenencia de stock. No corresponde a utilidad neta; nunca se lo debe mezclar con el margen del motor agregado.

**Costo no tarifado:** el proceso puede tener un costo real, pero **este prototipo no conoce una tarifa calibrada**. Cero sería una afirmación incorrecta; presenta el valor como desconocido/no modelado.

## 5. Ejemplos de interpretación correcta

| Mensaje tentador | Interpretación técnica correcta |
|---|---|
| “Subimos Picking 20 % y subieron cero los despachos: no sirve el área” | El modelo puede tener una restricción upstream de stock; no implica que Picking carezca de valor |
| “Llegó el camión con compra urgente: recuperamos 100 pedidos” | Verificar recepción, liberación por Calidad, BOM completo y despacho real dentro del horizonte |
| “La reserva es gratis” | Trasladar stock no aumenta el saldo, pero mano de obra, movimiento y espacio podrían tener costos no tarifados |
| “Comprometí 400 mil pesos de compra: ya salieron 400 mil de caja” | Compromiso y pago son hitos distintos y los pagos reales no están modelados |
| “Tengo 80 pedidos preparados” | Solo los expedidos cuentan como salida del CD; staging no es despacho |
| “Mi simulación muestra el 95 % OTIF” | El simulador no valida fecha de promesa cliente, entrega de última milla ni POD |
| “Sumé ingresos de jornada y cohorte SKU” | Mezcla de unidades, horizonte y fuentes que produce doble conteo o resultados inválidos |

## 6. Qué sí y qué no permite concluir

**Sí, dentro de sus supuestos:** detectar restricciones simuladas, comprobar conservación de inventario, analizar el efecto de lead times, comparar acciones frente a un baseline fijo y desarrollar criterio para tomar decisiones con métricas.

**No, sin fuentes externas y calibración:** dimensionar una bodega real, estimar dotación contractual, confirmar rentabilidad, estimar IVA/EBITDA, demostrar cumplimiento de SLA, medir entregas reales, validar disponibilidad de un proveedor, evaluar seguridad operacional física o atribuir causalidad de incidentes reales.

El proyecto no recibe datos empresariales reales y no tiene conexiones a WMS/ERP/TMS. La prueba automatizada de accesibilidad y emulación móvil no sustituye revisión en dispositivo con TalkBack, [pendiente en M7-38](M7-38-ANDROID-A11Y-CHECKLIST.md).

## 7. Criterio de calidad de cualquier indicador nuevo

Antes de incorporar un KPI exige: **nombre**, **objetivo de negocio**, **unidad**, **horizonte**, **población de pedidos/SKU**, **fuente**, **fórmula**, **tratamiento de nulos**, **limitaciones** y **prueba de conciliación**. Si falta uno de esos campos, no presentarlo como indicador de gestión certificado.

Más información: [guía de usuario](GUIA-USUARIO.md), [casos prácticos](ESCENARIOS-DE-APRENDIZAJE.md) y [arquitectura](ARQUITECTURA-Y-DATOS.md).
