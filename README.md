# CD Flow Lab — un pedido, siete áreas

**Aplicación pública:** https://harrysxavio.github.io/cd-simulator/

Aplicación didáctica y responsive para mostrar **cómo se relacionan las decisiones de planificación, compras, recepción, calidad, inventario, picking y transporte** en el procesamiento de pedidos mult-SKU de un centro de distribución.

## Caso base

Un lote de **100 pedidos**. Cada pedido requiere:
- SKU A: 2 unidades, stock inicial 180, compra prevista 80.
- SKU B: 1 unidad, stock inicial 95, compra prevista 35.
- SKU C: 3 unidades, stock inicial 150, compra prevista 150.

Las áreas se conectan así:
1. **Planificación:** porcentaje de pedidos liberados al flujo.
2. **Compras:** porcentaje de la compra prevista que llega hoy del proveedor.
3. **Recepción:** unidades entregadas que se pueden procesar en el día.
4. **Calidad:** porcentaje de unidades recibidas aprobadas.
5. **Inventario:** exactitud/disponibilidad utilizable del stock inicial más unidades aprobadas.
6. **Picking:** líneas preparables por día; cada pedido tiene 3 líneas (una por SKU).
7. **Transporte:** límite de pedidos completos que pueden expedirse.

**Nota de procesos:** P2P se refiere al abastecimiento desde compras hasta recepción/stock; picking y transporte son parte del fulfillment del pedido y no son etapas de P2P estrictamente.

## Cálculo

- Unidades entregadas de cada SKU = piso(compra prevista × porcentaje entrega).
- Capacidad de recepción se distribuye proporcionalmente a unidades entregadas, con redondeo conservador.
- Unidades aprobadas = piso(unidades recibidas × porcentaje de aprobación de calidad).
- Stock utilizable = piso((stock inicial + aprobado) × porcentaje de disponibilidad).
- Cobertura por SKU = piso(stock utilizable / unidades por pedido).
- Pedidos con stock = mínimo de las coberturas de A, B y C.
- Pedidos preparados = mínimo(100, pedidos liberados, pedidos con stock, piso(líneas picking/3), capacidad de transporte).
- Pendientes = 100 - pedidos preparados.

El modelo no asume que aumentar una capacidad siempre mejore la salida: las restricciones aguas abajo o la falta de un SKU pueden neutralizar el efecto.

## Cómo probarlo

- **Mejorar compras:** sube entregas del proveedor y disponibilidad de inventario, con impacto visible en el SKU limitante.
- **Problema de calidad:** disminuye la aprobación de unidades y reduce la cantidad de pedidos completos.
- **Reforzar picking:** muestra que incrementar capacidad de picking puede no aumentar el flujo cuando faltan productos.
- **Aplicar mejora sugerida:** propone un ajuste incremental que aumenta pedidos completos, si existe alguno dentro del rango.
- **Guardar y exportar:** escenarios locales y CSV de los resultados.

## Alcance y limitaciones

Herramienta **educativa de capacidad y disponibilidad**, no WMS, APS, MRP, gemelo digital ni cálculo OTIF. Un solo lote y día, sin cronograma de entregas, lead times, inventario reservado, lotes de proveedor, trazabilidad, costos ni simulación estocástica. Los porcentajes representan supuestos configurables. El indicador de pedidos completos no significa que hayan sido entregados al cliente.

Sin servidor, dependencias, cuentas, seguimiento ni transmisión de datos. Los escenarios guardados utilizan localStorage en el navegador actual.

## Tecnología

HTML, CSS, JavaScript nativo. GitHub Pages desde rama `main` y carpeta raíz.

## Evolución

- v1.0: cálculo simple de picking/despacho.
- v1.1: comparaciones y costos.
- v1.2: ampliación de etapas de capacidad.
- **v2.0:** rediseño orientado a áreas conectadas, disponibilidad de tres SKU y ejemplos operativos prácticos.

Licencia MIT.
