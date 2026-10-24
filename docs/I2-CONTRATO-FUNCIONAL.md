# I2-01 · Contrato funcional entre laboratorio V1 y Misión CD

**Estado:** implementación en PR, sujeta a CI + merge; no significa que la ruta `/juego/` exista.  
**Versión del contrato:** 1 · **Fuente verificable:** `src/i2-product-contract.js` y `tests/i2-product-contract.test.mjs`.  
**Propósito:** decidir la equivalencia exacta de elecciones y cifras antes de construir el cliente móvil. No se crea un segundo motor ni se altera `src/app.js`.

## 1. Decisiones de alcance que no deben quedar implícitas

1. La **cohorte SKU** es el alcance principal del modo juego (`sku-cohort`). El cierre es **día 12**, partiendo de día 0; no equivale al motor agregado de una sola jornada.
2. Se utilizan **exactamente 3 SKU** A/B/C del catálogo y sus mezclas de pedidos reales del módulo `src/sku.js`.
3. Las opciones de cada departamento provienen de `NODES` en `src/engine.js`. Se conserva el orden **Comercial → Planning → Compras → Recepción → Calidad → Inventario → Picking → Transporte** y los IDs de opción. No se reescribe `flow()` ni `eventSimulation()`.
4. Las 5 alternativas son `wait`, `emergency`, `reserve`, `overtime`, `combined`, desde `DECISION_OPTIONS` y `RECOVERY_OPTIONS`. Una alternativa combinada **no** se evalúa sumando dos deltas.
5. Por área, el juego presenta **como máximo dos indicadores visibles**. **Antes de la sorpresa**, solo puede mostrar entradas de planificación conocidas, no ninguna cifra derivada de la simulación con demanda real. **Después de revelar**, puede mostrar el `headline` del registro físico SKU de `campaignAreaReadModel.rows`. Fórmulas e historial se abren bajo demanda, nunca inventando métricas a partir del texto.
6. **Proyección / ayuda no es confirmación**: `preview-only` nunca es ejecución. `confirmed-in-simulator` significa decisión pedagógica y no autoriza comprar, desembolsar ni contactar proveedores de verdad.
7. **Pedidas ≠ proveedor entregó ≠ bodega recibió ≠ calidad liberó ≠ picking preparó ≠ despacho salió del CD ≠ cliente recibió.** Si el modelo no diferencia preparación/transporte por staging, no presentarlo como evento independiente.
8. Moneda CLP: contribución parcial y supuestos siempre etiquetados; costo desconocido **no es 0** ni el resultado financiero total.

## 2. API de contrato (sin efecto secundario)

```js
// Catálogo inmutable: obtiene los IDs de los módulos V1 originales.
import {
 I2_AREAS, I2_RECOVERIES, I2_PRODUCT_SCOPE,
 createI2Decision, i2CanonicalChoice, i2MeasuredKpi
} from '../src/i2-product-contract.js';

// El jugador consulta una alternativa sin realizar una compra.
const preview = createI2Decision({
 campaignId:'CD-JUEGO-001',
 area:'commercial',
 optionId:'under',
 logicalStep:0
});

// El mismo ID se traduce al selector compatible con V1, no a números simulados.
const canonical = i2CanonicalChoice(preview); // {commercial:'under'}

// La cifra de resultados conserva unidad y horizonte: 80 pedidos, día 12.
const measured = i2MeasuredKpi(80,{unit:'orders'});
```

El campo `logicalStep` es un índice determinista del flujo educativo, **no hora real ni día de proveedor**. El `campaignId` usa patrón `CD-...`. Esquema 1 solo acepta `scope='sku-cohort'` y `horizonDays=12`.

### Decisiones por departamento y lectura principal

| ID V1 | Nombre juego | IDs válidos | Fuente de KPI inicial |
| --- | --- | --- | --- |
| commercial | Comercial | under, accurate, over | `campaignAreaReadModel.rows[commercial].headline` |
| planning | Planificación | partial, full, buffer | `campaignAreaReadModel.rows[planning].headline` |
| purchasing | Compras | cheap, reliable, express | `campaignAreaReadModel.rows[purchasing].headline` |
| receiving | Recepción | low, normal, extra | `campaignAreaReadModel.rows[receiving].headline` |
| quality | Calidad | slow, normal, priority | `campaignAreaReadModel.rows[quality].headline` |
| inventory | Inventario | weak, normal, count | `campaignAreaReadModel.rows[inventory].headline` |
| picking | Picking | low, normal, reinforce | `campaignAreaReadModel.rows[picking].headline` |
| transport | Transporte | low, normal, extra | `campaignAreaReadModel.rows[transport].headline` |

Estas rutas son **notación de contrato para seleccionar una fila por ID**; no son rutas JavaScript literales de arrays. La interfaz I2 no existe todavía. El valor de `headline` debe obtenerse de la proyección conciliada **únicamente después del evento de revelación** y no copiarse de la jornada agregada. I2-04 debe construir una lectura segura exclusivamente de planificación para el recorrido previo, sin consultar un replay de demanda real visible al jugador.

### Equivalencia física futura, fase I2-04

```text
Jugador selecciona alternativa
    │
    ▼
createI2Decision (solo valida metadata)
    │
    ▼
i2CanonicalChoice (elige ID canonico de V1)
    │
    ▼
[Pendiente I2-04] gameCampaignAdapter
    │
    ├── campaignSkuContract  → compras originales y apertura SKU
    ├── createSkuSessionCache → una ejecución / baseline compartido
    ├── recoveryComparison    → cinco alternativas desde la misma base
    ├── campaignAreaReadModel → ocho áreas sobre eventos conciliados
    └── skuEconomicAuditReadModel → costos parciales, no inventar rentabilidad
```

**Qué queda específicamente para microfases futuras:** creación de página e ida/vuelta (I2-02/03); traductor de estado juego al simulador con igualdad física 8×5 (I2-04); `localStorage` y migraciones (I2-05); guardas de economía/PII (I2-06); escenas y personaje (I2-07+). No considerar estas funcionalidades implementadas por la presencia del contrato.

## 3. Evidencia que bloquea el cierre I2-01

- Prueba estática: 8 áreas, 3 SKU, opciones iguales a las canónicas y máximo 2 KPI iniciales.
- Pruebas de 5 recuperaciones que generan el mismo selector, sin recombinación de efectos.
- Decisiones inmutables, preview/confirmación diferenciados y rechazo de IDs falsificados.
- Misma selección proyectada por I2 y por IDs V1 produce los mismos `skuInputs` (sin recomputar la simulación desde el juego).
- `measuredCount` rechaza cantidades fuera del alcance, unidad y horizonte.
- Node y Chromium completos verdes en PR y main, y Pages/HTTP real sin alteración.

**Estado humano:** validación Android físico/TalkBack y comprensión por principiante siguen sin evidencia, rastreadas en #67. La fase I2-01 no las suplanta.
