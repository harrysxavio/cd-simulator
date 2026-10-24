# I2-09 · Footer de navegación y revisión segura del plan

**Alcance:** una sola acción principal por pantalla, retorno predecible, scroll interno y posibilidad de revisar el plan **sin modificarlo después de descubrir la demanda**. No se cambia V1, sus modelos de inventario, compras, costos ni su estado.

## Problema que resuelve

El MVP ya tenía un footer visual fijo, pero cada pantalla ejecutaba sus propias mutaciones de `phase`, `index` y `confirmedAreas`. Una decisión previamente confirmada seguía mostrando el texto «Confirmar y siguiente», y la recuperación no ofrecía una forma segura de revisar las ocho decisiones después de revelar la demanda.

## Contrato

Se centralizan las transiciones en `src/i2-game-navigation.js` (`navigateI2GameState`) y las etiquetas por estado en `i2FooterLabels`:

| Estado | Acción principal | Acción secundaria | Comportamiento |
| --- | --- | --- | --- |
| Portada | Comenzar misión | No | Entra en Comercial |
| Área aún no confirmada | Confirmar y siguiente | Atrás | Cierra la elección, avanza una sola área |
| Área ya confirmada | Siguiente área | Atrás | Consulta en modo lectura; no reescribe elecciones |
| Última área | Cerrar planificación | Atrás | Cierra Transporte y pasa al aviso de demanda |
| Aviso previo | Revelar demanda | Revisar Transporte | La sorpresa sigue oculta hasta confirmar |
| Recuperación | Confirmar intervención | Revisar plan | Evalúa el efecto físico antes de pasar a resultados |
| Revisión del plan | Volver a recuperación | No | Lista ocho decisiones en modo lectura; demanda sigue revelada |
| Resultados | Jugar de nuevo | No | Reinicio limpio y aislado de V1 |

El subestado nuevo `review` utiliza la **misma schema 2** de guardado y se considera válido **solo** con ocho áreas confirmadas y demanda revelada. Guardar, recargar y regresar mantiene la selección de recuperación; no modifica el baseline, compras originales ni revela información antes de la decisión explícita del jugador.

Toda transición inválida arroja error y no muta el estado entregado. El footer sigue en la zona fija y cada cambio de escena reinicia el scroll interior, no el desplazamiento de la página completa. El botón principal mantiene objetivo táctil ≥44 px.

## Pruebas

- `tests/i2-game-navigation.test.mjs`: contratos y etiquetas de seis escenas, ocho decisiones en orden, inspección de área confirmada, revelación de una sola vía, revisión de solo lectura, migración/recarga, y transiciones fuera de orden rechazadas.
- `tests/browser-i2-navigation.e2e.mjs`: teléfono Chromium, desplazamiento interior, acción y vuelta, teclado, revisión después de revelar, recarga persistida, geometría footer y aislamiento de V1.
- `.github/workflows/i2-mvp-smoke.yml`: incluye pruebas nuevas en el gate móvil junto con Node, Chromium y regresión V1.

## Límites

I2-09 **no** implementa todavía diálogos de ayuda con gestión de foco, mapa de cuatro capítulos, personaje opcional ni modo avanzado. Corresponden a I2-10–I2-12. La validación de Android físico, TalkBack y principiantes permanece pendiente.
