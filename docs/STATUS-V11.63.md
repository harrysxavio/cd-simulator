# Estado v11.63 · M7-34 · Primera campaña guiada

**Estado:** EN CURSO. Rama `feat/m7-34-first-campaign-guide`. La microfase no está cerrada hasta PR, Node, Chromium, merge, Pages y HTTP real aprobados. [Plan maestro de 43 microfases](EXECUTION-PLAN-43.md).

## Alcance pedagógico
- `src/first-campaign-guide.js`: modelo puro, inmutable y sin conocimiento del motor físico. Traduce la navegación real en cuatro indicaciones: **1 Planificar (ocho áreas), 2 Diagnosticar demanda sorpresa, 3 Recuperar de forma opcional, 4 Leer resultado**.
- Planificar: guía por área 1–8, explica el flujo «Llegan → siguen», permite mantener el valor sugerido y hace explícito que, una vez conocida la demanda, **no se puede reescribir el plan original ni la compra**.
- Diagnosticar: explica qué revisar tras la demanda sorpresa, sin atribuir una causa raíz empresarial exclusiva. Recuperar: destaca decisiones voluntarias y advierte que comprar stock no garantiza despachar. Resultado: distingue expedición CD de entregas al cliente y motor SKU de jornada agregada.
- `index.html` / `src/app.js`: ayuda visible bajo la navegación de cuatro etapas, compacta, con «¿Por qué importa esta etapa?» plegado. «Ocultar ayuda / Mostrar ayuda» controla únicamente la presentación: **no toca el almacenamiento de campañas, operaciones, compra ni modelos**. Configuración mantiene su propio espacio sin duplicar guía.
- `src/styles.css`: sin modal, overlay ni bloqueo de botones; controles táctiles de 44 px, estilos responsivos 360/412 px.

## Evidencia programada
- `tests/first-campaign-guide.test.mjs`: cuatro pasos, ayuda por área, plan congelado, estado inválido, datos inmutables, ninguna modificación del motor.
- `tests/browser-first-campaign-m7-34.e2e.mjs`: campaña real hasta resultados, navegación por ocho áreas, sorpresa, recuperación opcional, recarga de sesión, ocultar/mostrar sin cambios persistidos, escritorio y Android emulado de 360/412 px, control de overflow/errores.
- Suites Node y Chromium completas: pendientes de GitHub Actions.

## Cierre obligatorio
- [ ] Node + Chromium en PR aprobados.
- [ ] Merge a `main` + Node y Chromium de `main` aprobados.
- [ ] GitHub Pages v11.63 r172 desplegado y HTTP público (HTML, CSS, JS y release.json) aprobado.
- [ ] README y plan maestro con evidencias y siguiente **M7-35**.

**Límites:** Guía para usuario principiante de un CD ficticio, no asesoría operacional automática. La aparición de la sorpresa depende del flujo real del simulador; el módulo de guía no dispara ni fuerza la demanda. Android físico y TalkBack quedan pendientes de M7-38.
