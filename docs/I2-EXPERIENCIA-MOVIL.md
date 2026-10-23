# Implementación 2 · Experiencia de juego y UX móvil

**Nombre de trabajo:** **Misión CD · Director/a por un día**.  
**Modo de acceso propuesto:** botón **«🎮 Jugar: Dirige tu CD»** en el simulador actual, con la navegación de regreso **«Ir al laboratorio»**.  
**Alcance:** simulación formativa *gamificada*, no videojuego animado; conserva los ocho departamentos, tres SKU, cuatro tipos de pedido, eventos físicos, compras y costos trazables de V1.

## 1. Visión del producto

Convertir la información rica del simulador en **decisiones entendibles y agradables de una en una**, sin exigir leer un dashboard y desplazarse por varias pantallas para encontrar dónde responder. El usuario asume el rol de gerente de un CD ficticio, recibe un objetivo, puede aprender conceptos breves, decide y observa las consecuencias sin romper la cronología física.

**Usuarios:** persona principiante (por defecto), intermedia (puede saltar explicaciones), analista o docente (abre trazabilidad profunda). En ningún caso un KPI se simplifica cambiando su significado.

### Contrato visual

- **Conservar:** fondo azul petróleo/gris oscuro y legibilidad, tipografía de interfaz actual cuando sea adecuada, tarjetas compactas, rótulos claros, datos ficticios e identidad de CD.
- **Transformar:** naranja cálido como acento primario (ej. \`#F97316\`), ámbar claro para foco contextual (\`#FDBA74\`), superficies con tintes cálidos y gradientes muy sutiles; dejar **verde exclusivamente para éxito** y rojo para alertas operativas. No hacer todo naranja (contraste, estados).
- **Usar tokens semánticos:** \`--i2-bg\`, \`--i2-surface\`, \`--i2-text\`, \`--i2-muted\`, \`--i2-primary\`, \`--i2-primary-ink\`, \`--i2-focus\`, \`--i2-positive\`, \`--i2-warning\`, \`--i2-negative\`.
- **Contraste WCAG:** texto normal ≥4.5:1 y texto grande ≥3:1; foco ≥3:1 respecto de superficies adyacentes, sin distinguir resultados solo por color. Verificar combinaciones reales en Chromium.
- **Movimiento:** transiciones discretas (150–250 ms), no narraciones que se muevan solas; respetar \`prefers-reduced-motion\`.
- **Personaje guía opcional:** **Nico, el coordinador del CD**, ilustración 2D sobria basada en casco/chaleco naranja y una credencial ficticia; frases cortas («Tu pedido necesita todos sus productos», «El camión no puede despachar antes de Picking»). Puede silenciarse/ocultarse. **No repetir frases ni usar como fuente de datos**.

## 2. Estructura física del teléfono

**Regla fundamental:** el usuario no tiene que encontrar «Continuar» desplazándose por la página. El scroll de contenido está permitido si la explicación supera la pantalla, pero la acción principal, la ruta de regreso y el progreso siguen visibles sin tapar opciones.

~~~text
┌──────────────────────────────────────┐
│ Misión CD     03/08       ☰  [Salir]  │  ← cabecera compacta
│ ●●●◉○○○○   Progreso en el CD          │
├──────────────────────────────────────┤
│                                      │
│  [Nico]  RECEPCIÓN · TU DECISIÓN      │
│                                      │
│  «Llegaron cajas y hay cola.»         │
│  ¿Qué capacidad activas hoy?         │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ○ Normal · 650 unid./jornada   │  │
│  ├────────────────────────────────┤  │
│  │ ◉ Refuerzo · 1.000 unid.        │  │
│  │          Recargo: CLP 30.000    │  │
│  ├────────────────────────────────┤  │
│  │ ○ Turno reducido · 350 unid.    │  │
│  └────────────────────────────────┘  │
│                                      │
│  [ ¿Qué podría pasar? ]             │  ← abre hoja/modal contextual
│                                      │
├──────────────────────────────────────┤
│ [← Atrás]         [Confirmar →]       │  ← zona fija segura
└──────────────────────────────────────┘
~~~

Este ejemplo usa cantidades del **modelo de jornada agregada** solo para ilustrar diseño; la V2 principal debe mostrar cifras de **campaña SKU** con unidades/tiempo reales del contrato. No copiar 650 o CLP 30.000 a la cohorte SKU sin transformación de alcance auditable.

**Compatibilidad:** Android Chrome, iPhone Safari/WebKit como objetivo de pruebas, teclado hardware, orientación vertical por defecto y landscape sin pérdida de controles; anchos de referencia 320, 360, 390, 412, 430 y 768 px; alturas útiles 568, 640, 760 y 844 px; teclado visible/safe area. Usar \`min-height:100dvh\` con respaldo \`100vh\`, áreas \`env(safe-area-inset-*)\`, y \`scroll-padding-bottom\` para la zona inferior. **No forzar una altura fija que oculte contenido con tamaño de letra aumentado.**

### Comportamiento obligatorio de navegación

- **Cabecera:** identificador de misión, fase y progreso; botón Salir con confirmación si hay cambios.
- **Contenido único activo:** 1 tarjeta de situación + hasta 3 alternativas; solo 1 concepto principal por vista.
- **Pie de acción:** una acción principal siempre alcanzable sin scroll externo, altura táctil ≥48 px, Back siempre disponible cuando corresponda.
- **Hoja inferior/modal «¿Por qué?»** con máximo 70–85 % de viewport, scroll interno, foco atrapado y restaurado al botón origen, cierre por botón/Escape, fondo inert; nunca abrir sin permiso ni bloquear «Confirmar» por leerla.
- **Cambio de escena:** mantén scroll interno en cero, anuncia nuevo título mediante accesibilidad, conserva elección si vuelves; no repetir cálculos físicos al expandir ayuda.
- **Progreso:** 8 áreas y 4 capítulos mayores, no 30 pasos visibles; micro-pasos internos aparecen como «1/3», «2/3», «3/3».
- **No hay doble scroll:** la estructura externa no debe superar visualmente \`100dvh\` cuando los contenidos caben; cuando no caben, solo desplaza la región central, dejando accesibles cabecera y pie. Con teclado abierto adaptar el layout, no bloquear inputs.

## 3. Viaje completo del jugador

~~~mermaid
flowchart TD
 A[Simulador V1] -->|Jugar: Dirige tu CD| B[Inicio del juego]
 B --> C[Elegir dificultad y modo de guía]
 C --> D[Configurar CD: simple o avanzado]
 D --> E[Briefing del gerente]
 E --> F[Ocho áreas una a una]
 F --> F1[Concepto breve opcional]
 F1 --> F2[Decidir entre opciones]
 F2 --> F3[Impacto potencial: hoja opcional]
 F3 --> F4[Confirmar y avanzar]
 F4 -->|Área siguiente| F
 F4 -->|Área 8 completada| G[Sorpresa controlada]
 G --> H[Diagnóstico: comparar plan con realidad]
 H --> I[Investigar principal restricción]
 I --> J[Recuperación: comparar alternativas SKU]
 J --> K[Confirmar decisión o esperar]
 K --> L[Resultado: servicio, stock, espera y costos modelados]
 L --> M[Aprendizaje, insignias y decisiones por mejorar]
 M --> N{¿Qué hacer ahora?}
 N -->|Reintentar con mismo seed| C
 N -->|Otro escenario| B
 N -->|Ver datos profundos| O[Laboratorio V1, sin importar/alterar su sesión]
~~~

**Aclaración de orden:** en V1, la primera área es **Comercial**, después **Planificación/Planning**, no al revés. I2 respetará la dependencia pronóstico → cobertura de compra → proveedor → recepción → calidad → inventario → picking → transporte.

### Escenas iniciales (sin obligar a leer)

1. **Portada:** «Hoy diriges un CD: decide antes de que cambie la demanda». CTA «Comenzar», enlace secundario «¿Cómo funciona?» y «Abrir laboratorio completo».
2. **Configuración amigable:** elegir objetivo (servicio/equilibrio/costo), dificultad, escenario sorpresa opcional con semilla, ayudas activas; muestra en dos renglones qué supone el CD (3 SKU, 200 pedidos de referencia, 12 días). Por defecto «Usar configuración recomendada».
3. **Briefing:** «Tienes 8 departamentos. Lo que decidas en Comercial afectará las compras y el resto del CD». CTA «Ir a Comercial».

### Por cada departamento, dividir en hasta tres microvistas

| Pantalla | Información visible | Acción |
|---|---|---|
| A: **Entender** | Nombre del área, 1 frase contextual, 1 indicador relevante, guía pregunta «¿Quieres saber qué mide?» | «Decidir» / «Aprender antes»; para expertos «Saltar explicación» |
| B: **Decidir** | Máx. 3 opciones en tarjetas tactiles; costo/plazo/impacto potencial en etiquetas, no párrafos; selección reversible hasta confirmar | «Confirmar y continuar» o «¿Qué podría pasar?» |
| C: **Impacto** (opcional, hoja) | «Si eliges esto, ...», advertencia de dependencia, efecto previsto bajo supuestos y datos fuente | «Entendido» → vuelve a B, sin cambiar opción |

El modelo no necesita ejecutar la simulación de 12 días para cada lectura de explicación. Puede leer pronósticos de capacidad/supuestos, y solo emitir simulación al cambiar variables que afecten resultados. **Antes de revelar la sorpresa, ninguna explicación puede mostrar demanda futura concreta.**

### Ocho áreas y su contenido de enseñanza

| Área y pregunta del gerente | KPI mostrado primero | Peligro didáctico | Ayuda opcional |
|---|---|---|---|
| **1. Comercial**: «¿Qué pronóstico informamos?» | Pedidos pronosticados (cohorte) | Subestimar inventario/compra inicial | Forecast vs demanda real (solo después del shock) |
| **2. Planificación**: «¿Qué cobertura compramos?» | Unidades SKU comprometidas / cobertura | Sobrecomprar o quiebre | Lead time y stock de seguridad |
| **3. Compras**: «¿Con qué proveedor contamos?» | Unidades comprometidas vs entregadas | PO ≠ recepción | Confiabilidad y plazo supuesto |
| **4. Recepción**: «¿Cuánto puede ingresar hoy?» | Cola de recepción por SKU/día | Llegada ≠ stock recibido | Operarios, horas, capacidad |
| **5. Calidad**: «¿Cuándo queda utilizable?» | Stock retenido/liberado | Recibido ≠ disponible | Lotes y liberación |
| **6. Inventario**: «¿Qué podemos prometer?» | Stock verificable por SKU | Inventario físico ≠ identificable | Reserva interna, conteos y BOM |
| **7. Picking**: «¿Qué podemos preparar?» | Pedidos completos preparados | Preparados ≠ expedidos | Kits y capacidad |
| **8. Transporte**: «¿Qué puede salir del CD?» | Pedidos completos expedidos | Salida CD ≠ entrega final | STAGING-CD y cupos |

Al confirmar B, mostrar **consecuencia contextual de una sola frase**, sin presentar resultados totales futuros como certeza. En modo principiante, los KPI técnicos restantes quedan accesibles desde «Ver indicadores del área».

## 4. La sorpresa como evento narrativo

Una pantalla breve de transición **después de las ocho decisiones**: «Sorpresa. Llegaron más pedidos de los previstos». Muestra signo y magnitud real con **botón «Revelar demanda» explícito**; no se revela solo por entrar a Diagnóstico ni por tocar la pestaña superior. Permitir cambiar el signo/porcentaje en modo práctica antes de iniciar una comparación reproducible. Al revelar, congelar historial de pronóstico, compromiso original y proveedor elegido.

La pantalla de Diagnóstico tendrá **tres cifras**, de la misma cohorte y horizonte: pedidos reales, expedidos, pendientes. La siguiente escena pregunta «¿Por qué no alcanzó?» y muestra hipótesis respaldadas por eventos: stock faltante, espera de recepción/Calidad, capacidad Picking/Transporte. **No atribuir una causa única sin contrafactual.**

## 5. Recuperación: una decisión de gerente

- **Primero baseline:** «Sin intervención: X expedidos, Y pendientes».
- **Una tarjeta por alternativa:** Esperar · Habilitar reserva · Refuerzo · Compra urgente · Combinar. Cards cortas: Δ pedidos completos, día de efecto, costo conocido o **«Costo sin tarifa»**.
- **Comparador:** opción actual frente a baseline, no sumar efectos individuales; si mejora cero y cuesta, señal de advertencia.
- **Detalles de compra:** porcentaje 0/25/50/75/100, fecha real/hypotética 1/2/5/10/13, orden original inmóvil, costos proxy claramente separados.
- **Confirmación:** mensaje accesible e irreversible hasta un «Reintentar escenario», no botón que dispara compra real. La decisión queda fechada y recuperable tras recarga.
- **No decidir también sobre motor agregado** salvo en un «Laboratorio complementario», claramente separado del puntaje del juego.

## 6. Resultados: aprender de la consecuencia

Pantalla 1: **«Tu turno terminó»** con resultado en pedidos completos, objetivo y pendiente; mostrar 1 principal razón modelada.  
Pantalla 2: **«Qué cambió por tu decisión»**: baseline vs intervención, plazos y etapas que limitaron.  
Pantalla 3: **«Qué aprendiste»**: tres reflexiones concretas; opcional expandir a libro físico completo (manifest, lotes, ledger y 8 áreas).  
Pantalla 4: **«Inténtalo de nuevo»**: mismo seed y decisiones reajustadas con predicción reversible, o nuevo caso.

### Gamificación cuidadosa

**Progreso de misión:** etapas alcanzadas, no rendimiento económico.  
**Insignias de aprendizaje**, basadas en comprobaciones de hechos: «Protegiste la compra original», «Detectaste el cuello de botella», «Identificaste una compra tardía», «No confundiste preparado con expedido», «Elegiste no reforzar cuando no había stock».  
**Estrellas pedagógicas 0–3:** por lectura e interpretación correcta de las restricciones (si el usuario realiza microdesafíos voluntarios), no por comprar más, gastar menos ficticiamente ni hacer clics.  
**Puntuación de gestión opcional:** 3 ejes visibles y **separados** — nivel de servicio SKU, compromiso/costo parcial conocido, días-pedido de espera — con definiciones y supuestos. Ningún «score único» ambiguo convierte proxy CLP en margen neto.  
**Feedback:** útil, amable y concreto, sin castigo frustrante. Permitir «Saltar animación» y «Sin personaje».
**Retos:** 3–5 casos reproducibles con semilla fija (quiebre de stock, recepción bloqueada, llegada tardía, transporte insuficiente, sobreforecast) y explicación de por qué una elección no funcionó.

## 7. Reglas de aceptación UX

1. En **360×760** y **390×844**, seleccionar y pulsar el CTA siguiente en la misma pantalla sin desplazar **la página externa**.
2. En **320×568**, **200 % de tamaño de texto** y teclado abierto, ningún control esencial queda bloqueado; se acepta scroll **solo del contenido interior**.
3. Los controles centrales tienen objetivos ≥44×44 px (preferencia 48 px); no existen superposiciones de cabecera, hoja modal y barra inferior.
4. El progreso nunca muestra resultados o demanda real antes de revelar la sorpresa.
5. Cualquier explicación es opcional; volver atrás no elimina decisiones confirmadas ni ejecuta un replay innecesario.
6. Un principiante puede explicar en sus palabras **PO ≠ recibido, expedido ≠ entregado, costo desconocido ≠ cero** después del recorrido; registrar resultados humanos, sin suponer éxito por CI.
7. Sin errores de consola, sin overflow horizontal y con teclado/TalkBack/VoiceOver verificables; registrar pruebas físicas separadas.
8. Cada interacción conserva el **mismo baseline y el mismo contrato SKU** que V1 para idénticos parámetros. No inventar valores para el modo gamificado.

Véase [plan de implementación](I2-PLAN-MAESTRO.md) y [arquitectura/reutilización](I2-ARQUITECTURA-Y-PRUEBAS.md).
