# Supply Chain Operations Lab v6.0

**Abrir simulador:** https://harrysxavio.github.io/cd-simulator/

Laboratorio educativo de operaciones de una campaña con datos ficticios. No representa procesos internos ni datos reales de Natura.

## Experiencia en cuatro secciones

1. **Configuración:** valores de ejemplo editables, demanda objetivo, stock, reserva, precios, costos variables, dotación, costo diario de operarios, otros costos fijos y meta de costo por unidad.
2. **Operación:** ocho áreas conectadas, con entradas, salidas, capacidades y parámetros operacionales configurables.
3. **Recuperación:** una sección independiente para seleccionar cuánto esfuerzo correctivo aplicar en cada área, incluido cero para no intervenir.
4. **Dashboard:** unidades expedibles, cobertura, diagnóstico de pérdidas y restricciones, costos totales, costo unitario, ingreso estimado y margen de contribución modelado.

## Modelo

El flujo opera sobre unidades agregadas, sin SKU ni pedidos individuales. La demanda y el stock inicial se configuran antes de la operación. Las unidades compradas se limitan por cumplimiento de proveedor, capacidad de recepción y liberación de calidad. Inventario suma stock inicial y unidades liberadas, además de una reserva elegible limitada. Picking no prepara más de lo disponible; Transporte no expide más de lo preparado.

La dotación influye en la capacidad: Recepción escala respecto de dos operarios de referencia, Picking respecto de cinco, e Inventario tiene una capacidad pedagógica de 400 unidades por operario y jornada. Las acciones de refuerzo de Recepción, Picking e Inventario generan costos laborales incrementales en el modelo. No se incluyen tiempos reales, turnos, horas extraordinarias detalladas ni optimización de dotación.

## Economía de la campaña

Costo total modelado = salarios diarios de operarios + mano de obra incremental de recuperación + costo de compra por unidad recibida + costo de empaque por unidad preparada + costo de transporte por unidad expedida + otros costos fijos.

Costo unitario = costo total / unidades expedidas, si existe expedición. Ingreso estimado = unidades expedidas × precio ingresado. Margen modelado = ingreso estimado − costo total. La meta de costo unitario se compara con el costo calculado. **No es un estado financiero contable**: no se consideran impuestos, devoluciones, costos de inventario inicial, depreciación, amortización, financiamiento, almacenamiento ni costo de oportunidad.

## Archivos

- `src/engine.js`: áreas y parámetros iniciales.
- `src/flow.js`: propagación de flujo, restricciones y recuperación.
- `src/scenario.js`: campos de configuración, validación y costos.
- `src/app.js`: navegación, interacción, persistencia y dashboard.
- `src/styles.css`: diseño responsive.
- `index.html`: entrada de GitHub Pages.
- `archive/v2.0-index.html`: respaldo histórico.

Los datos se guardan localmente en el navegador. No se requiere servidor ni inicio de sesión.

## Verificación

Se validó la sintaxis JavaScript, el flujo entre áreas, el efecto de la dotación, los costos adicionales de recuperación y una prueba simulada de navegación por las cuatro secciones. No se ha validado todavía el aspecto visual en un navegador Android real.
