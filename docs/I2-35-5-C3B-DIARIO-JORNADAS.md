# I2-35.5c3b · Diario de jornadas para Misión CD

**Corte:** 1 de noviembre de 2026 · Trabajo candidato a CI/PR/merge.

## Qué cambia
Tras elegir una respuesta al primer incidente, Nico muestra el estado real
del CD **día por día**: pedidos expedidos hoy/acumulados, pendientes,
SKU en cola de muelle, SKU retenidos en Calidad y SKU recibidos.
El usuario avanza con un botón principal por jornada.

En el reto combinado, se observa el día 3 tras decidir en Recepción
(día 2). Al pulsar siguiente, el segundo incidente de Calidad aparece
en el día 4; el jugador toma su segunda decisión, y observa el avance
de los días 5 al 12 antes de conocer el cierre. Los casos de un solo
incidente observan desde el día siguiente al evento hasta el día 12.

## Reglas técnicas
- Las jornadas son **snapshots del replay SKU canónico**, no valores inventados.
- La segunda observación se deriva de la primera orden ya confirmada.
- El nuevo comando solo afecta jornadas posteriores al segundo evento.
- La lectura de cada día excluye datos, compras, incidentes y resultados
  de jornadas futuras; los cálculos internos pueden contener el replay
  completo, pero solo se expone el snapshot diario.
- Se persiste únicamente `incidentViewDay`, nunca el libro físico.
- `advance-incident-day` avanza máximo un día; si encuentra un segundo
  incidente pendiente, bloquea el avance y solicita otra decisión.
- `finish` no está habilitado antes del día 12; las partidas antiguas
  siguen compatibles sin este campo nuevo.
- Los indicadores son expediciones desde el CD, NO entrega final al cliente.

## Qué NO se declara implementado
El diario es **visualización causal diaria**, no una palanca nueva de muelle
o Calidad. Esos recursos siguen sin un contrato con inicio, duración,
capacidad efectiva y costo; no deben simularse con botones cosméticos.
Faltan también cinco retos discriminantes, una historia/hipótesis entre
intentos, QA física Android/TalkBack y aceptación gerencial.

## Puertas de aceptación
Node completo, pruebas de journal/normalización/navegación,
Chromium Pixel 7 de ambos incidentes, focused I2, regresión V1,
Pages con módulo JS/CSS y HTML reales, QA humano #67 pendiente.

**Estado padre I2-35 abierto: 35/41 completadas; faltan seis IDs
I2-35..I2-40, F7 4/5 y F8 0/5.** No convertir conteo 85,4 %
en estimación de horas.
