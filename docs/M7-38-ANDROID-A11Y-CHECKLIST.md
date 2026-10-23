# M7-38 · Prueba pendiente en Android físico y TalkBack

**Estado:** **SIN EJECUTAR EN DISPOSITIVO REAL**. Este documento es un protocolo de aceptación, **no evidencia de resultados**. Aunque Node, Chromium y Pages aprueben, **M7-38/M7 NO se cerrará** hasta registrar una sesión física y una prueba de comprensión.

**Versión a probar:** [CD Simulator v11.68 r177](https://harrysxavio.github.io/cd-simulator/?release=11.68-r177). **Actualización M8-42:** la pauta original se creó para v11.67; utilizar la versión actualmente publicada y documentar en el resultado la revisión exacta que se probó. La evidencia de Chromium sobre v11.67 y v11.68 no reemplaza la evaluación física. Utilizar Chrome actualizado en un **teléfono Android real**. Registrar fecha, modelo/versión de Android, versión de Chrome, estado de TalkBack y evidencias visibles (capturas o notas sin información personal).

| Nº | Acceso/prueba | Criterio observable | Resultado |
|---|---|---|---|
| 1 | Abrir aplicación a 100% de zoom y navegar Operación → Diagnóstico → Recuperación → Resultado. | No hay cortes de textos críticos, botones superpuestos o desplazamiento horizontal de toda la página; objetivo principal visible por etapa. | **Pendiente** |
| 2 | Pulsar los controles permanentes, pestañas y el menú de ocho áreas, también en orientación vertical. | Botones alcanzables con un dedo; no requieren pellizcar pantalla para pulsarlos. | **Pendiente** |
| 3 | En Ajustes de Android → Accesibilidad → TalkBack, activar el lector. Recorre las cuatro pestañas, el mapa de áreas y sus opciones. | TalkBack anuncia el nombre de cada etapa/área y cuál está seleccionada; se puede activar por doble toque sin perder el contexto. | **Pendiente** |
| 4 | Dentro de Resultados, recorrer Resumen, Áreas, Inventario, Costos y Mejoras usando TalkBack; abrir «Qué no podemos concluir todavía». | Se anuncian cada pestaña y el panel correspondiente, los desplegables y sus estados; textos y advertencias quedan disponibles en un orden entendible. | **Pendiente** |
| 5 | Activar una decisión en Operación y cambiar de área con TalkBack. | El foco no salta al inicio ni queda perdido: puede continuar dentro del mismo control o sección. Ninguna operación se confirma accidentalmente. | **Pendiente** |
| 6 | Preguntar a una persona sin experiencia logística qué representa «expedidos» y qué significa «costo no tarifado» tras completar la campaña. | Responde que «expedidos» salieron del CD, **no** que llegaron al cliente, y que costo no tarifado es **desconocido**, no gratuito. Si no es así, registrar textos que resultaron confusos. | **Pendiente** |

## Notas de evaluación

- **Falla crítica:** no se puede operar una etapa esencial, el lector no identifica la opción activa, el foco desaparece, se pierde información esencial o la interfaz comunica falsamente entrega/ahorro.
- **Falla no crítica:** contraste percibido dudoso, texto largo, orden de lectura mejorable o objetivo táctil incómodo. Registrar pantalla exacta y opción donde ocurre.
- **Corrección:** documentar hallazgo, crear PR específico con prueba reproducible si aplica, repetir automatización y verificar nuevamente en el mismo teléfono.
- **Evidencia requerida para cierre:** fecha/dispositivo, tabla completada por una persona que haya usado Android físico, incidencias y si las correcciones se revalidaron. Una simulación de Chromium no sustituye TalkBack ni el test de comprensión.

No registrar nombres completos, credenciales o datos privados. El escenario es ficticio y no necesita acceso a sistemas reales.
