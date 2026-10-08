# Supply Chain Operations Lab v4.0

**Demo:** https://harrysxavio.github.io/cd-simulator/

Laboratorio interactivo de decisiones operacionales inspirado en el flujo de una campaña de cosmética de venta directa. **Datos completamente ficticios**; no representa cifras ni procedimientos internos de Natura.

## Qué se hace

Recorre ocho misiones con iconos y decisiones independientes:

1. 📈 Comercial: forecast de campaña.
2. 🗓️ Planning: cobertura de necesidades de reposición.
3. 🛒 Compras: cumplimiento de entrega del proveedor.
4. 📦 Recepción: capacidad de ingreso de unidades.
5. 🛡️ Calidad: liberación de mercancía inspeccionada.
6. 🗃️ Inventario: stock disponible para preparación.
7. 🧺 Picking: líneas procesadas por jornada.
8. 🚚 Transporte: capacidad de salida de pedidos.

El usuario puede regresar a cualquier nodo, cambiar una decisión y revisar las consecuencias en el dashboard y el diagnóstico. El reporte final prioriza alternativas que incrementan pedidos completables con las demás decisiones constantes.

## Escenario y supuestos

Campaña de 1.000 pedidos con mix agregado de tres productos: perfume (60 % de pedidos, 600 unidades), crema corporal (80 %, 800 unidades) y shampoo (50 %, 500 unidades). Cada pedido que contiene el producto demanda una unidad. Los stocks iniciales son 380, 470 y 330 unidades.

El cálculo es determinista: forecast → brecha → compra → entrega → recepción → liberación de calidad → stock utilizable → capacidad de picking → capacidad de transporte. La cobertura se limita por el SKU con menor capacidad de abastecer su proporción del mix. Para este nivel se asume un mix fijo y fraccional, sin simular pedidos individuales ni combinaciones exactas de productos.

**Importante:** la métrica «pedidos completables» es una estimación de capacidad y disponibilidad, no OTIF, entregas confirmadas, ventas ni cumplimiento contractual. El resultado por área muestra métricas en unidades diferentes (unidades, líneas o pedidos) y no debe interpretarse como un embudo de cantidades homogéneas.

P2P comprende abastecimiento hasta recepción/stock; picking y transporte pertenecen a fulfillment. Se omiten lead times detallados, costos, variabilidad, prioridades por cliente, pedidos individuales, inventario reservado, horas extra y restricciones de múltiples jornadas.

## Arquitectura escalable

- `index.html`: entrada accesible y semántica.
- `src/engine.js`: definiciones de áreas, decisiones, motor puro de simulación, causas y recomendaciones.
- `src/app.js`: navegación por nodos, render, eventos, guardado local y exportación CSV.
- `src/styles.css`: diseño responsive, roadmap, tarjetas e indicadores.
- `archive/v2.0-index.html`: copia de la versión anterior.

Para extender un área, agregar decisiones o parámetros en `NODES` y actualizar la función pura `evaluate` para propagar el impacto; la interfaz renderiza las alternativas declaradas automáticamente. Futuras mejoras pueden separar cada nodo en su propio módulo e incorporar tests de integración y E2E de navegador.

## Verificación

Pruebas de sintaxis de los módulos, nueve comprobaciones del motor y ejecución simulada de arranque, navegación, decisiones, diagnóstico y reinicio. Estas comprobaciones **no equivalen a pruebas de navegador real** en Android, ni validan visualmente GitHub Pages.

## Uso y privacidad

Sin dependencias externas, APIs, login ni backend. Funciona como sitio estático GitHub Pages. Las decisiones se guardan en localStorage del navegador actual. El CSV se genera localmente.

## Versiones

- v1.0–v1.2: prototipo inicial de capacidad.
- v2.0: flujo mult-SKU de siete áreas.
- v3.0: laboratorio modular por misiones y roadmap de dependencias.

Licencia MIT.


## v4.0 — Flujo en cadena y recuperación

El motor `src/flow.js` propaga unidades por SKU entre compra, entrega, recepción, calidad y stock disponible; posteriormente transforma la cobertura del mix en pedidos preparables y expedibles. Picking no procesa más pedidos que los que cuentan con disponibilidad y Transporte no despacha más de los recibidos de Picking, aunque tenga capacidad sobrante. Cada nodo presenta entrada, procesamiento, capacidad y unidad de medida. El stock inicial y las reservas elegibles se consideran por separado del flujo de recepción.

**Fase 1: planificación.** El usuario recorre las ocho áreas y configura indicadores y decisiones. **Fase 2: recuperación.** Puede aplicar acciones correctivas específicas por área (forecast, reposición, proveedor alternativo, recepción, inspección, reservas, picking y transporte). El motor vuelve a ejecutar toda la cadena. Las acciones tienen límites y no implican costos calculados ni liberaciones fuera de control de calidad.

El diagnóstico compara cambios individuales respecto a la referencia y oportunidades correctivas. Estos resultados no deben sumarse: hay restricciones simultáneas y un efecto que se recupera en una etapa puede seguir limitado en otra. Los resultados son estimaciones deterministas agregadas, no órdenes reales ni una simulación detallada por pedido. 
