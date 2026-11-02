# I2-36.8a · Arte compacto y explicación de las ocho áreas

**Lab13 · 01-11-2026. Estado: candidato en rama, pendiente CI + Pages.**

## Problema del jugador
Después de integrar diez PNG originales, cada decisión de área presentaba una tarjeta con una imagen de 104 px de alto, título, descripción textual completa y botón para ampliar. En pantallas pequeñas, ese segundo bloque de texto duplicaba explicaciones existentes en `area.question` y Nico antes de presentar las tres alternativas gerenciales.

## Solución aplicada
- Tarjeta de cada área con imagen pixel art **70 px** de alto (64 px en móviles de hasta 355 px), título y botón **Ampliar escena** de al menos 44 px táctiles.
- La descripción íntegra, explicación del proceso y pregunta de Nico continúan en el modal accesible ampliable y se leen bajo demanda. Sin texto oculto inaccesible por recorte CSS.
- La representación grande del tutorial, el mapa del CD, el monitoreo y los incidentes permanecen como estaban. No se altera ninguna imagen original ni se genera imagen sustituta.
- Las tres opciones de la decisión, pestañas, cálculo SKU, guardado y orden de áreas son iguales.

## Aceptación
`tests/browser-i2-compact-area-art.e2e.mjs` prueba a **320 × 568 px**:
1. Ocho áreas en orden y PNG contextual correcto.
2. Tarjeta compacta no supera 110 px de alto.
3. El botón ampliador mide al menos 44 px.
4. El modal conserva el texto íntegro de cada imagen y vuelve a su botón con foco.
5. Abrir o cerrar una imagen no altera localStorage ni confirma una decisión.
6. Cada área mantiene las tres alternativas, sin scroll externo ni errores JS.

**Estado del programa:** forma parte de I2-36.8. No cierra la fase padre I2-36. Permanecen **35/41** fases padre completadas; I2-35–I2-40 están abiertas. La optimización de peso de los diez PNG originales (~19,9 MB) seguirá en I2-36.12 y debe medirse mediante derivados comprimidos sin perder originales.

[Simulador publicado](https://harrysxavio.github.io/cd-simulator/juego/) — los cambios del microcorte requieren CI, PR, merge y Pages/HTTP antes de darlo por actualizado.
