# Supply Chain Operations Lab v5.0

Demo: https://harrysxavio.github.io/cd-simulator/

Laboratorio educativo de Supply Chain con datos ficticios, inspirado en operaciones de campañas. No contiene datos internos de Natura.

## Modelo vigente

Una campaña con **1.000 unidades de demanda agregada**, sin SKU ni pedidos individuales. La operación recorre Comercial, Planning, Compras, Recepción, Calidad, Inventario, Picking y Transporte. El stock inicial es de 250 unidades. Cada nodo presenta entrada, salida, capacidad y explicación de dependencia. Inventario integra stock inicial y liberaciones de Calidad. Picking prepara como máximo lo disponible, y Transporte expide como máximo lo preparado.

## Dos fases

1. **Planificación:** configurar indicadores de cada área, con valores predeterminados o numéricos personalizados.
2. **Recuperación:** elegir una cantidad de mejora de 0 al máximo permitido en cada área. El cero significa no intervenir. Se recalcula toda la cadena después de cada cambio.

El diagnóstico indica pérdidas locales, capacidad ociosa por restricciones heredadas y recuperación potencial por área. Los impactos aislados no son aditivos.

## Archivos

- `index.html`: aplicación estática y accesible.
- `src/engine.js`: catálogo de áreas, opciones e indicadores.
- `src/flow.js`: motor de flujo agregado, restricciones y recuperación cuantificable.
- `src/app.js`: interfaz, navegación, indicadores, guardado y exportación CSV.
- `src/styles.css`: diseño adaptable a móvil.
- `archive/v2.0-index.html`: respaldo histórico.

## Límites

Es una simulación determinista de una jornada. Las capacidades y tasas son simplificaciones pedagógicas; no se calculan costos, lead times, dotación real, pedidos individuales, reserva comprometida ni eventos estocásticos. Las acciones correctivas no tienen un costo cuantificado. La reserva habilitable es un supuesto del caso, no inventario libre ilimitado.

Las decisiones se guardan localmente en el navegador. No requiere backend.

## Verificación

Se verificó la sintaxis, la propagación de unidades y la interacción simulada de las fases de planificación, recuperación y reinicio. No equivale a una prueba visual real en Android.
