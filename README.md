# CD Simulator — Operations Decision Lab

Simulador web responsive de capacidad, productividad, cumplimiento y costo laboral en un centro de distribución. Proyecto demostrativo de ingeniería de operaciones y mejora continua.

## Demo
Una vez habilitado GitHub Pages: https://harrysxavio.github.io/cd-simulator/

## Funcionalidades
- Ajustar demanda diaria, dotación de picking, productividad, jornada, eficiencia, costo laboral y capacidad de despacho.
- Visualizar pedidos procesados, pendientes, cumplimiento y costo de mano de obra por pedido.
- Detectar la restricción entre picking y despacho y estimar dotación requerida para la demanda.
- Escenario de alta demanda, restablecimiento, exportación CSV y copia de resultados.
- Diseño responsive, sin dependencias, servidores, cuentas ni APIs.

## Modelo matemático
- Capacidad picking = piso(operarios × pedidos/hora × horas × eficiencia decimal).
- Pedidos procesados = mínimo(demanda, capacidad picking, capacidad despacho).
- Cumplimiento = pedidos procesados / demanda × 100.
- Costo laboral total = operarios × horas × costo por hora.
- Costo laboral unitario = costo laboral total / pedidos procesados.
- Operarios requeridos para picking = techo(demanda / (productividad × horas × eficiencia decimal)).

## Cómo usar
Abrir `index.html` en un navegador, o publicar la rama `main` desde la carpeta raíz en GitHub Pages (Settings → Pages → Deploy from a branch → main /root).

## Alcance y limitaciones
Todos los valores son **ficticios**. Es un modelo determinista, de un día, con pedidos homogéneos. No incorpora inventario, olas, tiempos de desplazamiento, variabilidad, SLA por pedido, ausentismo, congestión, costo indirecto ni simulación de eventos discretos. La recomendación de dotación solo resuelve picking: si despacho está saturado, aumentar personas no aumenta el throughput.

## Tecnologías
HTML5, CSS3, JavaScript nativo. Sin framework ni build.

## Próximos pasos
Pruebas automatizadas, escenarios guardados, comparación de alternativas y restricciones adicionales.

## Licencia
MIT.
