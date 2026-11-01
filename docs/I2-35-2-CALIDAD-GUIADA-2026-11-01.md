# I2-35.2 · Segundo reto guiado jugable · Calidad y disponibilidad

**Corte 01-11-2026 · candidato de PR, NO publicado hasta CI, integración y Pages verificados.**
No cierra I2-35: siguen faltando ≥5 misiones gerencialmente distintas y las puertas móviles/humanas.

## Qué aprende el jugador

La pregunta es distinta a la del piloto de Picking: **¿liberar más unidades retenidas en Calidad aumenta realmente los pedidos expedidos?** En un CD una etapa puede mejorar su KPI y el servicio final quedar igual si falta stock de otro SKU, capacidad posterior u otra condición. La comparación debe **mostrar resultados reales del motor**, no inferir causalidad desde el nombre de una decisión.

## Experiencia concreta

1. En la portada existe «Activar reto de Calidad»; solo antes de confirmar Comercial, sin incidente sorpresa ni piloto Picking. Se puede volver al caso inicial. No cambia la demanda a raíz de elecciones.
2. El escenario pone inventario inicial A/B/C al **75 %** de su perfil estándar, mantiene el caso `alpha-case-01` y elimina un eventual límite adicional de Picking del preset. Sus ocho decisiones siguen siendo elegibles, incluida la **política de Calidad**.
3. Antes de revelar no se muestran pedidos realmente observados, máximo retenido ni resultados de políticas alternativas. En Calidad, Nico indica qué significa retención sin prometer expediciones.
4. Tras el cierre, **un botón explícito**, no otro desplegable, solicita el análisis. El motor físico SKU reconstruye el **mismo plan original sin recuperaciones** con dos políticas de Calidad: la elegida y «priority» (o «slow» si se había escogido «priority»). Se conservan compras originales, semilla, demanda y los otros siete departamentos.
5. Se muestran dos KPI de cada plan: **unidades SKU máximas retenidas en Calidad** y **pedidos expedidos desde el CD**. La explicación se adapta al delta real (positivo, cero o negativo). No dice que un producto retenido sea merma o rechazo, ni que expedido signifique entregado.
6. Solo se persiste el marcador optativo `guidedScenario:'quality-low-stock'`, validado contra entradas no permitidas; nunca se guarda un resultado físico. Reiniciar conserva el reto para repetir y aprender; al activar misión de incidente se abandona el preset.

## Evidencia esperada y límites

La sonda previa ARC-05 demostró con sus decisiones específicas una mejora de **12 a 0 SKU retenidos** y **103 a 103 pedidos expedidos**. Es un caso físico reproducible del motor **pero no un resultado obligatorio** para cualquier jugador: si cambia planificación, proveedor, Calidad u otras elecciones, las dos observaciones se recalculan y podrían diferir. La comparación es contrafactual de **planificación**, no una intervención que opera retroactivamente tras el evento. No promete un SLA, costo total, rentabilidad ni entrega final.

## Aceptación técnica

- Node: marcador válido/persistente, reversibilidad, bloqueo tras confirmar, rechazo de valores adulterados, conservación de caso en reinicio.
- Node: dos replay con misma demanda y compras; testigo concreto de 12→0 retenidos y 103→103 expedidos; respuesta determinista; no revela antes de terminar.
- Chromium Pixel 7 360 px / prueba de 320 px: navegación completa, recarga, exclusión con Picking, botón de análisis solo al cierre, cuatro tarjetas de métricas, sin desplazamiento horizontal ni errores de JavaScript.
- No usar una captura o la existencia de código como prueba de despliegue. Aceptar solo si PR CI Node/I2 focused/Chromium y GitHub Pages + comprobación HTTP pública están verdes.
- QA manual Android real/TalkBack y aceptación pedagógica por participantes continúan abiertas.

## Siguiente microfase

**I2-35.5d:** al menos cinco misiones verdaderamente distintas en restricción vinculante, momento de observación, información disponible, alternativas realizables y costo/efecto; cada misión necesita test físico discriminante. Mantener I2-35 abierto mientras las misiones no cumplan la definición de hecho. Continuar I2-36/37 con acompañamiento de Nico y una interfaz móvil sin exceso de desplegables.
