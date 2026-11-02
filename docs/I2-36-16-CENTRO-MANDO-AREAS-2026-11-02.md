# I2-36.16 · Centro de mando de recuperación por áreas

**Lab14, 02-11-2026 · Candidato a validación.**

## Problema
El jugador recorre ocho áreas, pero en Recuperación encontraba un panel largo de casillas sin una referencia clara a la cadena operacional. El objetivo es ofrecer una superficie tipo juego con ocho accesos sin inventar intervenciones que el motor no conoce.

## Entrega
- Cuadrícula responsiva de **ocho tarjetas táctiles**, en orden Comercial → Planificación → Compras → Recepción → Calidad → Inventario → Picking → Transporte.
- Cada área deja claro si tiene una nueva intervención modelada o si su política inicial está comprometida.
- **Compras**: abre el panel múltiple y enfoca la compra urgente. **Picking**: enfoca el refuerzo nominal. **Inventario**: enfoca liberar reserva solo cuando el jugador separó reserva inicial antes de planificar. Si no hay stock reservado, se explica que no puede inventarse.
- **Comercial, Planificación, Recepción, Calidad y Transporte**: el botón abre una explicación de la política confirmada, por qué no hay una orden disponible en el modo normal y cuáles son los límites actuales. Los incidentes de Recepción o Calidad tienen su propia respuesta real cuando ocurren.
- Cambiar de área o abrir explicaciones **no modifica el estado guardado**, ni el gasto, ni el plan. El jugador solo registra una acción al confirmar la combinación.
- 320 px y alto contraste, botones con nombre y estado legibles por lector de pantalla.

## Límite honesto
**No es todavía el motor de órdenes diario de las ocho áreas.** Solo enlaza las intervenciones físicas existentes de tres áreas. La extensión I2-35.7/I2-35.8a–c debe crear órdenes por jornada, capacidad e inventario. El centro de mando futuro I2-36.15 debe poder trabajar con ese motor sin controles ficticios.

## Pruebas
`tests/browser-i2-command-deck.e2e.mjs`: sin tablero antes de revelar, ocho áreas en orden, solo dos intervenciones disponibles si no hay reserva, diálogo de Calidad sin reescritura, Compras y Picking enfocan sus casillas, comparar no persiste, scroll 320×568 sin desbordamiento. Gates: Node, I2 focused, Chromium, deploy Pages/HTTP.

## Plan y fase
I2-36.16 microfase de UX, no cierra I2-36. Siguen **35/41** padres completados, I2-35..I2-40 abiertos.

[Simulador](https://harrysxavio.github.io/cd-simulator/juego/) — validar publicación antes de anunciar este tablero.
