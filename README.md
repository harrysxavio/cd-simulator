# CD Simulator — Operations Decision Lab

**Demo:** https://harrysxavio.github.io/cd-simulator/

Simulador web responsive y gratuito para explorar decisiones básicas de capacidad, dotación, acumulación de pedidos y costo laboral en un centro de distribución. Datos ilustrativos, no operacionales reales.

## Versión 1.2 — flujo más realista

El flujo ahora incluye **picking → packing → despacho → salida/transporte**, además de pendientes de días anteriores. El volumen procesado es el mínimo entre demanda total y capacidad de cada etapa.

Variables: pedidos nuevos, pedidos pendientes, operarios de picking/packing/despacho, productividad horaria de cada etapa, horas por jornada, eficiencia común, costo horario por operario y límite de salida/transporte.

El costo laboral diario suma la dotación de **las tres etapas**, no solo picking. Los indicadores muestran carga procesada y pendientes; **cumplimiento de capacidad no equivale a OTIF** ni garantiza entregas a tiempo.

Se conservan las funciones de v1.1: comparador de referencia y propuesta, meta de cumplimiento y dotación de picking, barras comparativas, costos, exportación CSV y escenarios guardados en localStorage.

## Fórmulas

- Carga = pedidos nuevos + pedidos atrasados.
- Capacidad por etapa = piso(operarios de la etapa × productividad por hora × horas × eficiencia/100).
- Procesados = mínimo(carga, picking, packing, despacho, salida/transporte).
- Pendientes = carga - procesados.
- Cumplimiento de capacidad = procesados / carga × 100.
- Costo laboral diario = (operarios picking + packing + despacho) × horas × costo horario.
- Costo laboral unitario = costo laboral diario / procesados.
- Dotación picking para meta = techo(techo(carga × meta/100) / (productividad picking × horas × eficiencia/100)).

La recomendación advierte si packing, despacho o salida no permiten cumplir la meta; **no optimiza automáticamente dotación de todas las áreas**.

## Prueba de referencia v1.2

Datos iniciales: 1.200 pedidos, 0 atrasados, 10 operarios picking a 18 pedidos/h, 8 operarios packing a 25 pedidos/h, 8 operarios despacho a 25 pedidos/h, 8 horas, 85% de eficiencia, 1.100 de límite de salida, costo 5.500 CLP/h por operario.

Resultados esperados:
- Picking: **1.224**; packing: **1.360**; despacho: **1.360**; salida: **1.100**.
- Procesados: **1.100**; pendientes: **100**; cumplimiento de capacidad: **91,67%**.
- Dotación total: **26**; costo laboral directo: **1.144.000 CLP/día**; costo unitario: **1.040 CLP/pedido**.
- Meta 95%: 1.140 pedidos, picking requiere 10 operarios; no es factible sin ampliar salida al menos a 1.140.

## Limitaciones y supuestos

Es un **modelo determinista de capacidad**, no un gemelo digital ni un WMS. Supone pedidos homogéneos, un único turno, misma eficiencia y costo horario para todas las áreas. No contempla SKU/líneas por pedido, tiempos de desplazamiento, inventario, ausentismo, variabilidad, horas extra, costos de transporte, instalaciones, CAPEX ni SLA por pedido. No predice OTIF, rentabilidad total ni ROI. Para uso real, calibrar las productividades y restricciones con datos medidos.

## Uso desde Android

Abrir el enlace de demo. Ajustar parámetros, fijar referencia y comparar propuestas. Los escenarios guardados permanecen **solo en el navegador y dispositivo actual** mientras no se borren los datos del sitio. No requiere login, API, servidor ni instalación.

## Tecnologías y publicación

HTML5, CSS3, JavaScript nativo, localStorage. Publicación estática en GitHub Pages desde `main` / `root`.

## Historial
- **1.0:** capacidad simple de picking y despacho.
- **1.1:** comparación, recomendador, gráficos, economía y guardado.
- **1.2:** picking, packing, despacho, salida, backlog y costo laboral directo de las tres áreas.

## Licencia
MIT.
