# CD Simulator — Operations Decision Lab

Aplicación web responsive para experimentar con capacidad, dotación, restricciones de picking y despacho, nivel de cumplimiento y costos laborales en un centro de distribución.

**Demo:** https://harrysxavio.github.io/cd-simulator/

## Versión 1.1 — funcionalidades

1. **Simulador original:** demanda, dotación, productividad, jornada, eficiencia, costo horario, capacidad de despacho, diagnóstico, exportación CSV y copia de resumen.
2. **Comparador de escenarios:** la referencia inicial queda fija hasta pulsar **Fijar situación actual**. Los controles superiores representan la propuesta. **Recuperar referencia** restablece esos parámetros.
3. **Recomendador de dotación:** meta de cumplimiento entre 1 y 100%; calcula pedidos necesarios y dotación mínima para picking. Avisa cuando despacho no tiene capacidad suficiente o se supera el máximo de 35 operarios.
4. **Gráficos interactivos:** selector de capacidad, costos o cumplimiento, con barras de referencia y propuesta.
5. **Impacto económico:** comparación de costo laboral diario, costo laboral unitario y pedidos procesados. No calcula ROI ni ahorro neto.
6. **Escenarios guardados:** hasta 12 escenarios en localStorage, con carga y eliminación. Se almacenan solo en el navegador actual y pueden desaparecer al limpiar los datos del sitio.

## Modelo y fórmulas

- `capacidad_picking = floor(operarios × pedidos_por_hora × horas × eficiencia/100)`
- `pedidos_procesados = min(demanda, capacidad_picking, capacidad_despacho)`
- `cumplimiento = 100 × pedidos_procesados / demanda`
- `costo_laboral_diario = operarios × horas × costo_hora`
- `costo_laboral_unitario = costo_laboral_diario / pedidos_procesados`
- `pedidos_meta = ceil(demanda × meta_porcentaje / 100)`
- `operarios_meta = ceil(pedidos_meta / (productividad × horas × eficiencia/100))`

La factibilidad de la meta exige simultáneamente capacidad de picking y despacho suficiente. La recomendación de operarios **no aumenta automáticamente** la capacidad de despacho.

## Caso de prueba manual: valores iniciales

- Demanda: 1.200; operarios: 10; productividad: 18 pedidos/h; jornada: 8 h; eficiencia: 85%; despacho: 1.100; costo horario: 5.500 CLP.
- Picking: **1.224**; procesados: **1.100**; pendientes: **100**; cumplimiento: **91,67%**.
- Costo laboral diario: **440.000 CLP**; costo por pedido: **400 CLP**.
- Para meta 95%, pedidos meta = **1.140**; operarios de picking = **10**; meta **no factible** hasta ampliar despacho al menos a 1.140.

## Uso y publicación

Abrir `index.html` localmente o habilitar GitHub Pages: Settings → Pages → Deploy from a branch → main / (root). Sin dependencias, servidor, APIs ni cuentas de usuario.

## Alcance y limitaciones

Modelo **determinista** con datos ficticios, pedidos homogéneos y una jornada. No representa un WMS ni simulación de eventos discretos. No incluye inventario, mix de SKU, desplazamientos, ausentismo, congestión, overtime, costos indirectos, ingresos, márgenes ni valor económico del incumplimiento. El costo unitario usa **solo mano de obra de picking**. No se debe interpretar el costo incremental como inversión total o retorno financiero.

## Tecnologías

HTML, CSS y JavaScript nativo; almacenamiento local del navegador. Compatible con despliegue estático en GitHub Pages.

## Historial

- **1.0:** simulador y diagnóstico de restricciones.
- **1.1:** comparación, recomendación de dotación, gráficos, impacto económico y escenarios guardados.

## Licencia

MIT.
