# I2-04 · Adaptador de campaña SKU compartido y matriz 8×5

**Corte técnico:** 24-10-2026 · **Estado:** cambios en PR y sujetos a Node/Chromium/merge. No dar por terminada esta microfase antes de la verificación posterior en `main`.

## Motivación

Misión CD ya tenía un MVP vertical, pero el archivo `src/i2-mvp-adapter.js` coordinaba directamente su propio contrato y la vista SKU. Esta microfase extrae esa coordinación a **`src/i2-game-campaign-adapter.js`**, reutilizable y con frontera validada, para que el juego y el laboratorio compartan **el mismo** `campaignSkuContract`, `createSkuSessionCache`, `recoveryComparison` y `campaignAreaReadModel`.

No se implementa un nuevo motor, no se convierte inventario agregado en SKU y no se cambian los cálculos monetarios de V1.

## Contrato de entrada y salida

- `createI2GameCampaignAdapter()` devuelve `evaluate()`, `stats()` y `clear()`.
- `evaluate({revealed:false,...})`: valida campaña, política, ocho opciones, horizonte y configuración. Solo devuelve **metadatos de planificación**; no calcula la cohorte física y no retorna demanda real, compras, pedidos, inventario ni datos operativos.
- `evaluate({revealed:true,...})`: usa los módulos canónicos, concilia y devuelve objetos congelados de `contract`, `comparison`, `campaign`, `areaModel` y las selecciones.
- El ID de campaña debe cumplir el formato de I2; solo se acepta `scope=sku-cohort`, cierre **día 12**, opciones reales del catálogo de ocho áreas y una de las **cinco recuperaciones**. No se aceptan propiedades arbitrarias del escenario, fechas negativas ni demanda fuera del rango didáctico de esta fase.
- Los `scenario` externos pueden elegir demanda entre 50 % y 200 % de la base, pero no editar por su cuenta el compromiso físico original después de la planificación; `lockUpstream` se fija internamente.
- La salida solo es una proyección del modelo didáctico. **Pedidos completos**, **unidades SKU** y **unidades equivalentes de jornada** son alcances distintos. CLP modelados no equivalen a costo total, ni salir del CD demuestra entrega al destinatario.
- La fachada `i2MvpPhysicalResult` conserva su interfaz y ahora consume el adaptador genérico, para que el MVP publicado siga funcionando sin cambiar sus ocho pantallas.

## Matriz de 40 combinaciones

`tests/i2-game-campaign-adapter.test.mjs` genera **8 casos**, cada uno cambia una opción canónica de un área diferente, con distintas políticas, tamaños de cohorte, demanda y condiciones de proveedor. Para cada caso compara las **5 recuperaciones** (`wait`, `overtime`, `reserve`, `emergency`, `combined`) con una ejecución independiente del laboratorio V1.

Cada una de las 40 celdas compara:

- Inputs y opening SKU, baseline y orden de compra original **sin modificaciones** entre recuperaciones.
- Ledger diario físico y total de pedidos, recepciones, despachos, inventario final y reconstrucción por ocho áreas.
- Gasto incremental y proxy económico de V1, sin recombinar ni inventar montos.
- Restricción temporal: un pedido urgente con llegada en día 13 no rescata despachos del corte de día 12.
- Congelamiento de inputs/resultados y rechazo de opciones no previstas.

Además: una prueba instrumentada inyecta un caché que **fallaría si se intentase simular antes del reveal**. Otra mantiene igualdad del caso alfa previamente publicado.

## Límites y siguiente entrega

- I2-04 no convierte el MVP en múltiples campañas elegibles desde la interfaz. La interfaz sigue en **caso alfa fijo**; esta fase fortalece el adaptador subyacente.
- I2-05 implementará migraciones de `localStorage` y guardado/retorno fiable; I2-06 cerrará límites de coste/datos.
- Fases posteriores decidirán cuándo se habilitan otras combinaciones como escenarios jugables de forma explicada, sin confundir «40 casos de prueba» con «40 niveles».
- Android físico, TalkBack y comprensión de novatos siguen fuera del alcance técnico automatizado y permanecen pendientes.

## Criterio de cierre

Node completo y Chromium completo del PR aprobados, merge a `main`, publicación Pages + comprobación HTTP si hubo assets afectados y registro del SHA exacto y de las puertas en `docs/I2-STATUS.md`.
