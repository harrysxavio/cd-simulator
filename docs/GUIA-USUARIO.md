# Guía de usuario · Supply Chain Operations Lab

**Versión de referencia:** v11.68 r177 · **Estado:** prototipo educativo con datos ficticios.  
**Enlace:** https://harrysxavio.github.io/cd-simulator/?release=11.68-r177

Esta guía acompaña la aplicación actual. No es documentación de un WMS/ERP ni reemplaza la formación operativa o la configuración de una bodega real.

## 1. Qué aprenderás

Gestionar un centro de distribución exige tomar decisiones conectadas. Por ejemplo, aumentar trabajadores de Picking no aumenta los despachos cuando no existe inventario disponible. El simulador enseña a distinguir una **restricción física**, una **hipótesis de causa** y una **decisión con costo**.

Puedes observar las ocho áreas: Comercial, Planificación, Compras, Recepción, Calidad, Inventario, Picking y Transporte. Las decisiones se reflejan en una campaña de pedidos SKU, al mismo tiempo que algunas vistas conservan un modelo didáctico agregado de una jornada. **Nunca sumes cifras entre esos dos modelos.**

## 2. Antes de empezar

- Utiliza un navegador actualizado en computador o teléfono. La aplicación se sirve desde GitHub Pages, no requiere cuenta ni instalación.
- El navegador conserva localmente la configuración, el ID de campaña y decisiones confirmadas. No equivale a respaldo en la nube: si cambias de navegador o borras sus datos puedes perder la sesión.
- Usa información ficticia. No ingreses datos de clientes, precios internos ni credenciales.
- Si aparece una versión antigua, pulsa **Verificar actualización**. Comprueba también el número visible junto al encabezado.
- La experiencia táctil fue probada automáticamente a 360 y 412 px, pero **Android físico, TalkBack y comprensión de un usuario principiante siguen pendientes de aceptación formal**. Consulta [validación M7-38](M7-38-ANDROID-A11Y-CHECKLIST.md).

## 3. Primera campaña, paso a paso

| Etapa | Tu trabajo | Qué observar |
|---|---|---|
| 1. Operación | Recorre ocho áreas; elige la política de cada una y continúa | Cada decisión modifica compromisos o restricciones posteriores |
| 2. Diagnóstico | Revisa qué ocurriría con el plan; revela la demanda sorpresa | Demanda, posibilidad de expedir, pedidos pendientes y restricciones |
| 3. Recuperación | Compara esperar, habilitar reserva, reforzar capacidad, compra urgente o combinar | Cuántos pedidos completos adicionales salen del CD, en qué días y con qué costo o compromiso supuesto |
| 4. Resultado final | Examina Resumen, Áreas, Inventario, Costos y Mejoras | Evidencia física SKU, modelos ilustrativos separados y aprendizajes |

### Paso 1. Operación

Abre **1 · Operación**. La misión comienza en Comercial. Lee el objetivo, selecciona una decisión y pulsa **Siguiente área**. Repite hasta Transporte. El mapa de ocho áreas permite volver a revisar un área durante la planificación.

No es necesario desplegar todos los indicadores. Para aprender, usa primero la explicación breve **qué llega → qué sigue**; abre el detalle técnico solo cuando quieras investigar fórmulas o capacidades.

En **Configurar campaña** puedes modificar demanda, stock, dotación, capacidades, precios y costos ilustrativos del modelo agregado. La configuración por defecto es suficiente para una primera sesión. Algunas variables de configuración pertenecen al modelo de jornada agregada, mientras la campaña SKU deriva sus propias cantidades y capacidades mediante un contrato explícito.

### Paso 2. Diagnóstico y demanda sorpresa

Al terminar Transporte, entra en **2 · Diagnóstico**. El simulador revela una desviación de demanda que puede ser positiva o negativa. En el panel desplegable **Probar otro escenario de demanda** puedes elegir un signo y porcentaje para realizar un caso reproducible.

Separa tres preguntas:

1. **¿Qué cambió?** La demanda real frente al plan.
2. **¿Qué lo limita?** Stock, recepción, calidad, inventario verificable, picking o transporte.
3. **¿Qué sí puedo decidir ahora?** Una recuperación posterior a la sorpresa, nunca reescribir una compra original histórica.

El plan inicial y las compras comprometidas antes de revelar la demanda quedan congelados para el ejercicio SKU. La pantalla puede mostrar una alerta basada en el motor de jornada agregada: esa alerta es una **hipótesis**, no prueba definitiva de causa raíz SKU.

### Paso 3. Recuperación

En **3 · Recuperación**, analiza la misión que presenta el stock, la decisión y el cambio esperado. Las cinco alternativas del laboratorio SKU son:

| Alternativa | Qué modifica | Precaución |
|---|---|---|
| Esperar | No interviene; conserva el calendario original | Los pendientes pueden mantenerse |
| Habilitar reserva | Traslada una parte del stock inicial desde RESERVA-CD | No crea mercancía ni es una compra; costo de traslado no tarifado |
| Refuerzo operativo | Agrega capacidad modelada en la operación | No soluciona faltantes de inventario ni bloqueos en otros procesos |
| Compra urgente SKU | Añade una PO con cantidad y día de arribo supuestos | Puede llegar tarde o quedar detenida en Recepción y Calidad |
| Compra urgente + refuerzo | Simula ambas decisiones conjuntamente | Su efecto no equivale a sumar beneficios individuales |

Para compra urgente, existen días de llegada hipotéticos **1, 2, 5, 10 y 13**; el horizonte normal del ejercicio es de 12 días. El día 13 es deliberadamente tardío. Puedes ajustar la cobertura del faltante a **0, 25, 50, 75 o 100 %**.

Primero **compara y revisa**, después utiliza **Confirmar decisión en simulación** solo cuando quieras conservar una decisión SKU. La confirmación solicita aceptación; no compra a un proveedor real, no factura y no envía pedidos. Una decisión confirmada queda vinculada al escenario y puede bloquear su edición para proteger la trazabilidad. Si cambias de escenario, una decisión histórica incompatible no debe aplicarse como si fuera actual.

El área **Recuperación independiente** también permite experimentar con capacidades en el modelo agregado. Es un ejercicio diferente del libro de pedidos completos SKU. Comprueba siempre la etiqueta del alcance.

### Paso 4. Resultado final

Las cinco pestañas son:

- **Resumen:** pedidos reales, expedidos desde el CD y pendientes de la misma cohorte física SKU; debajo, una lectura histórica agregada separada.
- **Áreas:** recorrido de Comercial a Transporte construido a partir de la campaña SKU y sus eventos.
- **Inventario:** catálogo de tres SKU, manifiesto de compra, cronología física, alternativas de recuperación, conciliación y supuestos.
- **Costos:** tablero monetario del **modelo agregado de una jornada**, no estado de resultados consolidado de la campaña SKU.
- **Mejoras:** alertas, productividad y ejercicios de causalidad; las secciones marcadas como agregadas no son causas SKU confirmadas.

Usa los paneles plegables para profundizar solo donde encuentres una anomalía. En el laboratorio SKU, busca explícitamente la distinción entre **compromisos de compra**, **existencias recibidas**, **pedidos preparados**, **pedidos expedidos** y **pendientes**.

## 4. Ejemplo corto: por qué una compra puede ayudar más que más personal

Supón 200 pedidos planificados en una cohorte ficticia. Aparece una demanda de 280 pedidos y el pronóstico de Comercial había sido conservador. Aunque Picking tenga capacidad, puede faltar el SKU A para completar los pedidos.

- **Refuerzo de Picking:** los pedidos adicionales podrían seguir en cero si falta mercancía.
- **Compra urgente con arribo oportuno:** puede habilitar pedidos, pero primero debe llegar, recepcionarse y pasar Calidad.
- **Compra con arribo después del corte:** aumenta el compromiso de compra sin rescatar pedidos dentro de la campaña.

Las cantidades dependen de parámetros de cada escenario. La [guía de ejercicios](ESCENARIOS-DE-APRENDIZAJE.md) contiene casos reproducibles y sus condiciones, no promesas operativas.

## 5. Guardado, reinicio y exportación

- **Guardar:** las decisiones y parámetros permitidos se registran en el almacenamiento local del navegador cuando está disponible. La simulación física detallada se reconstruye; no se guarda como un ledger masivo.
- **Continuar:** recarga la página en el mismo navegador y verifica la campaña restaurada. No uses incógnito si necesitas conservarla.
- **Nueva campaña:** el botón solicita confirmación y elimina las decisiones de la campaña anterior en ese navegador; usa esta opción para empezar de cero.
- **CSV:** el botón **CSV · jornada agregada**, ubicado en Resultado final → Mejoras, exporta el ejercicio agregado y **no** una exportación completa de pedidos SKU, lotes, facturas o transportes reales.

## 6. Errores frecuentes y cómo evitarlos

| Interpretación incorrecta | Lectura adecuada |
|---|---|
| “Salieron del CD” significa que llegaron al cliente | Solo significa expedición desde el CD |
| Una compra emitida suma stock disponible de inmediato | Debe llegar al muelle, ingresar por Recepción y liberarse en Calidad |
| Una reserva interna es nueva mercadería | Es stock inicial reubicado |
| “Costo no tarifado” significa gratis | Significa desconocido/no modelado |
| Más capacidad necesariamente recupera pedidos | Depende de la restricción activa y del stock |
| Dos mejoras individuales equivalen a la mejora combinada | Hay interacciones y restricciones no aditivas |
| La pestaña Costos corresponde a los 12 días SKU | Muestra un cálculo agregado de una jornada |
| La demanda o el signo sorpresa son siempre iguales | La sorpresa inicial puede ser aleatoria; fija signo y % para comparar |

## 7. Siguiente aprendizaje

Completa tres ejercicios: **sobredemanda con faltante**, **compra tardía** y **transporte bloqueado**. Para cada uno, escribe la situación, la decisión, los pedidos recuperados, el costo/compromiso y el principal límite del modelo.

Continúa en [escenarios guiados](ESCENARIOS-DE-APRENDIZAJE.md), [glosario y límites](GLOSARIO-Y-LIMITES.md) y [soporte](SOPORTE-Y-VERIFICACION.md).
