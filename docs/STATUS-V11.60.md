# Estado v11.60 · M6-31 · Recomendación gerencial acotada a evidencia SKU

**Estado:** EN CURSO (rama `feat/m6-31-evidence-recommendations`). CI/merge/publicación aún pendientes. Plan vigente: [43 microfases](EXECUTION-PLAN-43.md).

## Objetivo
Convertir las cinco recuperaciones físicas auditadas en orientaciones transparentes sobre **servicio, compromiso/costo modelado y viabilidad**, sin afirmar una causa raíz exclusiva, ganancia contable o ejecución real verificada.

## Implementación
- `src/recovery-recommendations.js`: lectura pura y congelada del comparador M5-26 validado: cinco opciones sobre el **mismo baseline** y la misma cohorte SKU. No simula de nuevo, no modifica órdenes, recursos, inventarios o persistencia.
- Dos prioridades claras:
  1. **Recuperar pedidos:** maximiza expediciones del CD; desempata por menor backlog días-pedido. No utiliza el proxy económico como beneficio empresarial.
  2. **Controlar compromisos modelados:** entre alternativas que efectivamente recuperan pedidos y tienen partidas trazadas, prioriza menor compromiso/costo parcial ilustrativo. **Reserva no participa de la comparación financiera** porque el traslado no está tarifado; un modelo que calcula CLP 0 no prueba gratuidad.
- Si ninguna acción recupera pedidos, la orientación es **no intervenir**. Si solamente la alternativa no tarifada recupera pedidos, no se inventa una opción financieramente óptima: se informa que falta evidencia de costos.
- Por opción: expediciones y pendientes por pedido completo, diferencia frente a la base, días-pedido de espera, compromiso ilustrativo desglosado, cobertura parcial/no tarifada y validación física de simulación. La ejecución operacional/compromiso del proveedor/entrega al cliente quedan explícitamente **no verificados**.
- `src/app.js`: nueva capa móvil desplegable bajo el comparador, selector de objetivo sin cambiar la decisión SKU guardada. Sustituye la frase previa sobre "mayor resultado económico proxy" por la recomendación condicional basada en pedidos efectivamente expedidos.

## Pruebas
- `tests/recovery-recommendations.test.mjs`: lectura inmutable de cinco escenarios, regla de servicio, exclusión financiera de reserva no tarifada, falta de mejora aun con compra costosa, llegada urgente tardía, corrupción económica/física y modos inválidos.
- `tests/browser-recommendations-m6-31.e2e.mjs`: panel desktop/móvil (360/412 px), cambio de prioridad, costos desconocidos visibles, cinco alternativas y ausencia de cambios en decisión persistida.
- Suites completas Node y Chromium: por validar en GitHub Actions.

## Condiciones obligatorias para cierre
- [ ] PR con Node y Chromium aprobados.
- [ ] Merge a `main`, Node y Chromium de `main` aprobados.
- [ ] GitHub Pages v11.60 r169 publicado y HTTP real (HTML, manifest, JS, CSS) aprobado.
- [ ] README y plan maestro cerrados con enlaces a evidencia y siguiente **M6-32**.

**Limitaciones:** operación completamente sintética/determinista. No representa WMS productivo, OTIF del cliente, coste integral, caja efectiva, horas/personas verificadas ni causa exclusiva. Prueba Android físico/TalkBack sigue pendiente de M7.
