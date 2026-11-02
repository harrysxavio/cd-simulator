# I2-36.10 · Recuperación con un solo mecanismo de confirmación a la vez

**Corte Lab13 (01-11-2026, Chile). Estado: candidato en PR hasta CI + merge + Pages/HTTP.**

## Hallazgo observado en Lab12

En `recoveryScene()`, el usuario ve un panel recomendado «Tu estrategia · combina hasta tres acciones» abierto por defecto, que tiene su propio botón **«Confirmar combinación y ver resultado»** después de comparar y revisar. Simultáneamente, el pie fijo mostraba **«Confirmar opción simple»** aun cuando el apartado clásico estaba plegado.

Esto inducía una confirmación de estrategia distinta de la que el gerente estaba preparando y era un problema de jerarquía P0, no del motor físico.

## Solución mínima implementada

- **Multiacción es el modo inicial:** el panel se abre y el botón fijo de confirmación simple **no se muestra**. Continúa visible «Revisar plan» para volver.
- **Abrir modo clásico:** el panel multiacción se pliega; el pie muestra «Confirmar opción simple →». Aquí siguen las cinco alternativas de recuperación V1.
- **Regresar al panel múltiple:** se cierra el clásico y el botón inferior de confirmación simple desaparece otra vez.
- **Comparar no compromete:** la confirmación múltiple sigue dentro de «Revisar antes de confirmar esta combinación»; cancelar no altera partida ni las ocho decisiones. Cero, una o varias acciones se admiten.
- **Reintentar:** vuelve a recomendar multiacción, aunque el jugador haya usado el modo simple anteriormente.
- **Preservación:** no cambia el motor canónico SKU, costos, semillas, horizonte, operaciones de día ni el esquema de guardado; los modos solo alteran presentación.

### Prueba E2E nueva

`tests/browser-i2-recovery-mode-clarity.e2e.mjs` recorre:
1. Ocho áreas → revelar demanda; no existe botón visible de confirmación simple.
2. Comparar sin acciones y cancelar revisión: localStorage idéntico.
3. Abrir modo clásico: multiacción se pliega, CTA simple aparece, sin guardar transacción.
4. Volver a multiacción: pie de confirmación simple desaparece; comparar y confirmar cero acciones, verificar resultado.
5. En otro teléfono 320 px, abrir clásico, seleccionar Compra urgente SKU, confirmar solo allí, comprobar que no aparece un evento multi confirmado y que el documento no desborda.

**Evidencia de aceptación pendiente:** Node, I2 focused, Chromium integral en PR; tras merge, Pages y HTTP real. Prueba humana Android/TalkBack aún no certificada.

## Estado del programa

I2-36.10 **parcial / candidata**, no cerrada hasta aprobación. Otras hijas de I2-36 aún pendientes: portada I2-36.6, ficha gerencial ocho áreas I2-36.8, diagnóstico priorizado I2-36.9, mapa I2-36.11, optimización de imágenes I2-36.12 y glosario I2-36.13. **35/41 padres históricos** siguen formalmente completos; I2-35–40 siguen abiertos.

[Ver simulador publicado](https://harrysxavio.github.io/cd-simulator/juego/): solo contiene este corte después de merge + verificación HTTP, no por existir una rama.
