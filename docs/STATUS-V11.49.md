# Estado v11.49 · M5-20 · Un baseline inmutable compartido

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md). **Al redactar:** desarrollo propuesto; cierre exige PR verde, fusión a `main`, GitHub Pages y HTTP verificados.

## Qué se corrige y por qué importa

Antes cada opción de recuperación llamaba por separado a `integratedDemand()`, recreando un **baseline equivalente**. Había pruebas de igualdad de stock, compras y algunos resultados, pero no había garantía de que las cinco alternativas reutilizaran **el mismo estado de origen efectivamente congelado**; tampoco se distinguía por identidad cuando cambiaba un supuesto físico de apertura.

M5-20 crea un baseline explícito **antes de elegir la recuperación**, con los siguientes hechos compartidos:

- Demanda planificada y demanda real de la cohorte.
- Política, pronóstico comercial, cobertura de planificación, compras originales y calendario comprometido del proveedor.
- Stock inicial físico de cada SKU y partición inicial entre PICK-FACE y RESERVA-CD.
- Capacidades base, calidad, verificación de inventario, días de campaña, atrasos y cumplimiento del proveedor.
- Dos replays originales del mismo plan: pronóstico/planificación y demanda real sin intervención.

Estos datos son `Object.freeze` recursivo en `createRecoveryBaseline()`. Toda alternativa recibe exactamente la misma referencia a `baseline.integrated` y a `baseline.integrated.actual` cuando los supuestos de partida son idénticos; no basta con que las cifras sean iguales.

## Implementación

- Nuevo `src/recovery-baseline.js`: `recoveryBaselineSeed`, `recoveryBaselineKey`, `createRecoveryBaseline` y `assertRecoveryBaseline`. La llave determinista normaliza el orden de las propiedades de atrasos y tasas del proveedor.
- `src/recovery.js`: recibe opcionalmente un `baselineSnapshot` previamente creado. Comprueba la firma completa de los **supuestos preintervención** y el manifiesto original; no puede sustituir por una base generada bajo otra demanda, compra, proveedor, stock o reserva. Una llamada independiente sin snapshot también crea una base inmutable propia.
- `src/sku-session.js`: reutiliza la misma base para las cinco opciones (`wait`, `reserve`, `overtime`, `emergency`, `combined`), incluso si el usuario cambia el día de la reposición urgente o su magnitud. La memoria de bases y la de escenarios tienen límites LRU separados; `clear()` limpia ambas y una recarga reconstruye eventos deterministas desde la sesión guardada.
- Se preservan los efectos físicos de intervención: compras urgentes reciben eventos propios, los traslados de reserva son movimientos interiores y la capacidad adicional solo actúa donde hay tareas. Los efectos pueden diferir: **lo que se comparte es el estado previo**, no el resultado.
- En el comparador de la interfaz hay un nuevo panel plegable **«Misma base para las 5 alternativas»**. Muestra demanda real, stock SKU inicial y porción reservada, cumplimiento sin intervenir y compras originales comprometidas. Mantiene las cifras compactas y no sobrecarga la vista móvil.
- El propio renderizador rechaza intentar mostrar un conjunto de alternativas cuyos baselines no sean el mismo objeto.
- Pruebas de cambios de política, stock físico, reserva, demanda, proveedores, atrasos, capacidades y planificación. Todas deben **crear otra base o rechazar un snapshot incompatible**. Cambiar solo opción, magnitud de compra urgente, fecha, recargo, ingreso por pedido o supuesto de penalidad **no** altera la base.
- Suite Node y E2E Chromium (360 y 412 px, control plegado al inicio, área táctil de al menos 44 px y ausencia de scroll horizontal).

## Advertencia pedagógica importante

El porcentaje **inicial** de RESERVA-CD es un supuesto físico de apertura. Si cambia, se obtiene una **nueva configuración de baseline**, incluso si el inventario físico total en el CD es el mismo. No equivale a trasladar stock **durante** la campaña; ese traslado es una intervención operativa y tiene otro evento y otro día. Esta frontera se mantiene explícita hasta M5-23.

Las unidades del motor de ocho áreas representan una jornada agregada y siguen fuera de la suma de pedidos y stock de la cohorte SKU. No se imputan entregas al cliente ni ventas reales a partir de expediciones.

## Próximas microfases

**M5-21:** no intervenir/esperar; revisar backlog, tiempos de expedición y costo incremental cero para el mismo baseline compartido.

Después M5-22 compra urgente, M5-23 reserva interna, M5-24 capacidad adicional, M5-25 combinación, M5-26 comparador y M5-27 persistencia de decisiones.

## Puerta de cierre

1. PR de v11.49 r158 con Node y Chromium aprobados.
2. Fusión a `main` y dos pruebas repetidas en verde.
3. Pages y verificación HTTP pública de v11.49 r158 verdes.
4. Android físico/TalkBack pendiente de validación M7.

**Evidencia de cierre:** pendiente antes de completar las verificaciones.
