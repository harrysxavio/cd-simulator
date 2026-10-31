# I2-35.5a · Eventos operacionales físicos reproducibles (corte de motor)

**Fecha:** 31-10-2026 · **Estado:** código en PR por validar; NO integrado en Misión CD /juego/ y NO cierra I2-35.5.

## Problema y decisión
Los cinco retos existentes cambian demanda. Las tarjetas de alerta de I2-36 leen colas reales del
baseline, pero NO crean interrupciones imprevistas. Un nuevo evento no debe ser una frase o un
número de resultado añadido después de simular.

Se implementa un primer mecanismo **opt-in** en el MISMO `eventSimulation` físico de V1:
- `receiving-stop`: durante jornadas explícitas el muelle no procesa unidades; las PO y
  arribos siguen registrados y los lotes pendientes conservan FIFO.
- `quality-stop`: Calidad detiene temporalmente la liberación, sin mermas ni rechazos
  inventados; unidades ya recibidas permanecen retenidas para la siguiente jornada.

**Contrato:** `{id,kind,startDay,durationDays}`, horizonte de 0 a 12, máximo tres eventos
y sin intervalos solapados de la misma etapa. El motor registra cada jornada
`activeOperationalEvents`, `receivingStopped` y `qualityStopped`; la entrada se
valida y canoniza con `normalizeOperationalEvents`.

**Semillas independientes de demanda:** `ops-dock-01`, `ops-quality-01`,
`ops-combined-01`. Son casos didácticos deterministas; la selección de evento **no**
depende de decisiones ni del cumplimiento. `i2OperationalEventSealed` expone solo
texto sin fechas, causas o impacto; la semilla no es un secreto criptográfico.

**No se inventan costos:** el evento no asigna CLP, multas, merma, horas/hombre, ni
promesas al cliente sin contabilidad comprobable. Dos incidentes pueden agravar colas
físicas y también no alterar expediciones si hay stock/holgura: eso es un resultado
legítimo, no un fallo que deba compensarse alterando el motor.

## Archivos
- `src/operational-event-schedule.js` — catálogo/validación estricta.
- `src/events.js` — efecto real acotado a fecha/etapa sobre FIFO y Calidad.
- `tests/i2-operational-event-physics.test.mjs` — constancia del calendario,
  no divulgación previa, entradas inválidas, recepción y retención, conservation.

## Validación y límites
- **No afirmar CI verde** hasta que GitHub Actions complete Node y Chromium en HEAD.
- Con lista vacía, la operación mantiene el comportamiento precedente.
- **No integrado aún al baseline ni a las recuperaciones:** no se habilitan como
  retos jugables ni se suma el corte de motor a las 35/41 fases históricas.
- No se ha verificado que las semillas fijadas (días 2/4) produzcan siempre una
  mejora/deterioro relevante bajo todas las políticas; exige fixtures discriminantes.

## Secuencia de aceptación siguiente
1. **35.5a (este corte):** merge sólo con Node/Chromium/regresión V1 verdes.
2. **35.5b:** propagar calendario sellado por `campaignSkuContract`,
   `createRecoveryBaseline`, `integratedDemand`, `recoveryComparison` y caché
   I2 SIN mutar PO, compras ni evento entre palancas. Comparar resultado con y sin
   incidente, demostrar variaciones físicas y elegir dos incidentes discriminantes.
3. **35.5c:** persistir `eventSeed` independiente de `seed` de demanda antes
   de primera decisión. Revelación causal por jornada, no adelantar resultados;
   Nico explica situación, alternativas y consecuencia en móvil. Ofrecer al
   menos dos estrategias ejecutables realmente distintas y con costo marginal.
4. **35.5d:** pruebas de 5 semillas de demanda × 3 operacionales, regresión
   V1 e I2, accesibilidad 320–430 px, QA Android/TalkBack humana, publicación
   HTTP real de JS/CSS/módulos y documentación con SHA.

No confundir "evento generado" con "evento jugable y bien explicado":
la aceptación de I2-35.5 sigue abierta hasta 35.5d.
