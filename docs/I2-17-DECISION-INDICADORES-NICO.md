# I2-17 · Tres vistas de decisión e indicadores anteriores al evento

**Fase:** F4, microfase I2-17 · **Corte:** 25-10-2026 · **Estatus:** gate CI/PR pendiente.

## Componente de decisión móvil

En cada una de las ocho áreas el usuario puede cambiar entre tres vistas accesibles, usando **botones** con `role=tab`, `aria-selected`, `aria-controls`, navegación `ArrowLeft/Right` y `Home/End`; gesto lateral es solo un atajo y no sustituye botones/teclado. El botón principal del footer sigue fijo y confirma la opción actual con independencia de la pestaña.

- **Decisión:** pregunta del área, tres alternativas canónicas V1 (con `aria-pressed`), posibilidad de revisar una decisión ya confirmada sin editar, y dos ayudas de `dialog` con cierre X, Escape, backdrop y foco restaurado.
- **Indicadores:** máximo **dos cifras** sobre supuestos configurados, sin ejecutar `i2MvpPhysicalResult`, `flow`, `campaignSkuContract` ni ninguna simulación. Se muestran `valor declarado de la alternativa` y `diferencia contra la opción base del mismo NODES/PARAMETERS/DEFAULTS V1`. Las cifras son inputs de planificación, **no desempeño real**, y no se mezclan con indicadores de resultados de SKU. Para percentiles se usa `pp` en la diferencia; para capacidad se muestran **unidades agregadas de la jornada V1**, que NO son pedidos, SKU físicos ni un throughput medido de 12 días. Cada comparación lleva base, fuente y umbral. La señal **Bajo/En/Sobre referencia** es de comparación de supuesto, nunca luz verde de servicio/rentabilidad.
- **Nico:** pequeño consejo opt-in del nivel seleccionado en I2-16. Ninguna simulación o dato oculto se transmite al tutor. La vista no obliga a encender el consejo.

El menú solo cambia la presentación: no altera preferencias, decisiones, eventos, compras, estado guardado I2/V1 ni la demanda inesperada. Seleccionar una alternativa sí guarda la decisión habitual de juego; volver al mismo área la deja bloqueada si ya fue confirmada. El cambio de área restaura la vista Decisión, sin persistir la pestaña. El swipe ignora toques sobre controles, el desplazamiento vertical y los bordes reservados por el sistema.

## Significado del semáforo previo al evento

| Comparación | Señal | Lectura válida |
|---|---|---|
| Valor elegido inferior a la opción base | Bajo referencia | Puede elevar riesgo de restricción o menor pronóstico: verificar consecuencias |
| Valor igual | En referencia | Misma entrada que la opción por defecto; **NO significa éxito** |
| Valor superior | Sobre referencia | Puede añadir holgura o costos/stock: verificar compensaciones |

Las preferencias gerenciales I2-14 se evalúan únicamente **después** de revelar resultados, mediante el semáforo independiente de servicio y gasto. I2-31 completará el tablero final de cuatro ejes; I2-17 no puede afirmar productividad por hora-persona, costos totales, lead time real medido ni entregas a clientes.

## Evidencia de cierre requerida

- `tests/i2-area-planning-indicators.test.mjs`: 8 áreas × 3 opciones, dos métricas, fuente y unidad, rechazo a resultados no revelados, campos sin identidad.
- `tests/browser-i2-area-tabs.e2e.mjs`: 8 áreas, cambio sin escritura a storage, tecla / touch swipe optativo, selección `aria-pressed`, modal ayuda, CTA fijo, demanda sellada y no scroll exterior en 320–740 px.
- Migración de `tests/browser-i2-guide.e2e.mjs`: Nico se abre en su pestaña sin autohabilitarse.
- Node general, focused I2 y Chromium completo verdes antes de fusionar; luego Pages/HTTP y Chromium main por separado. Android físico/TalkBack y usuarios no se certifican por emulación.

**Siguiente paso después del merge:** I2-18 (Comercial/forecast y su microaprendizaje/efecto causal). Hasta entonces F5–F8 permanecen abiertas.
