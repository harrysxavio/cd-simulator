# I2-05 · Guardado versionado, migración y decisiones confirmadas

**Estado:** PR en revisión; no considerar terminada hasta CI + merge y controles posteriores en main.

## Alcance del cambio

Se extrae el guardado de `juego/app.js` a un módulo puro: `src/i2-game-state.js`.

**Contrato de guardado:** `supply-lab-i2-v1` se conserva como nombre de clave para no perder partidas existentes. El **esquema interno sube a `schema:2`**, con campos `campaignId`, `seed` determinista no reveladora, `phase`, `substep`, `index`, `choices`, `recovery`, `arrivalDay`, `coverage`, `confirmedAreas` y `reveal`.

- **Carga:** `loadI2GameState(storage)` lee y valida, migra los guardados anteriores (`schema:1`) y recupera elecciones y subpaso de forma segura. Si no hay archivo, si el JSON está corrupto o el guardado está adulterado, vuelve a una partida limpia sin tocar V1.
- **Guardado:** `saveI2GameState(storage,state)` valida y solo escribe información permitida, sin persistir `orders`, `ledger`, `shipment`, costos de otros motores, datos de clientes ni simulaciones físicas.
- **Identidad:** `campaignId` de caso alfa y `seed` fija; para un futuro modo configurable deberán evolucionar junto con escenarios versionados. El valor de seed es opaco y **no revela el porcentaje de la sorpresa**.
- **Transiciones válidas:** `recover` y `result` requieren revelación explícita y ocho áreas confirmadas; `reveal` es un evento separado; ningún guardado puede saltar la planificación ni inventar una intervención.
- **Confirmación:** se puede navegar atrás y **consultar** una etapa cerrada, pero cambiar una elección confirmada requiere reiniciar la campaña. Se evita recalcular compras originales silenciosamente mientras se vuelve a leer el plan.
- **Aislamiento:** nunca se lee ni escribe la clave V1 `supply-lab-v90`. El almacenamiento puede estar bloqueado; el juego sigue ejecutándose en memoria y advierte que no logrará guardar.

## Evidencia

- `tests/i2-game-state.test.mjs`: migración 1 → 2, datos inesperados expurgados, avance y subpaso recuperados, rechazos por adulteración, almacenamiento bloqueado y V1 intacto.
- `tests/browser-i2-game-state.e2e.mjs`: en Chromium móvil real, confirma una decisión, vuelve a verla bloqueada, recarga, retoma, migra un guardado antiguo y valida que un JSON corrupto no altere V1.
- `.github/workflows/i2-mvp-smoke.yml` incorpora ambas pruebas al gate rápido de I2; la batería total Node y Chromium sigue siendo obligatoria.

## Límites

No se introduce almacenamiento en nube, identificación personal ni sincronización entre dispositivos. Las decisiones anteriores a la revelación no permiten consultar resultados físicos posteriores. **I2-06** comprobará específicamente economía y privacidad; esta microfase **no** sustituye Android físico, TalkBack o validación pedagógica de usuarios.
