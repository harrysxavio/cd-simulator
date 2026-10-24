# I2-12 · Nico, acompañante opcional de Misión CD

**Objetivo:** agregar calidez y aprendizaje, sin ventanas emergentes ni consejos largos que dificulten tomar decisiones en teléfono.

## Interacción
- Una opción pequeña «Ver consejo de Nico» aparece bajo el título de cada escena, cerrada por defecto.
- Al abrirla, presenta **una sola frase contextual** de tono cercano y profesional, relacionada con el área activa o la etapa de recuperación. El control cambia a «Ocultar consejo de Nico».
- Abrir, cerrar o navegar con el consejo visible **nunca llama al motor físico ni altera decisiones, las compras originales, la recuperación o el resultado**.
- La preferencia booleana se guarda únicamente en la clave local `supply-lab-i2-guide-v1` como `shown/hidden`, separada del estado I2 y de V1. Sin cuenta, tracking, datos personales ni telemetría. Si el navegador bloquea el guardado, la misión sigue funcionando.
- Se evita adelantar demanda sorpresa, cifras físicas futuras o resultados CLP. No hay personajes que interrumpan automáticamente al jugador ni animaciones obligatorias.

## Implementación y pruebas

- `src/i2-game-guide.js`: guion breve (≤135 caracteres por intervención) según fase/área, con validación del estado y preferencia.
- `juego/app.js`: botón contextual con `aria-expanded`, consejo desplegable y control de foco; el interruptor no ejecuta `render()` ni el motor.
- `juego/styles.css`: consejo compacto, contraste semántico y foco/tamaño táctil.
- `tests/i2-game-guide.test.mjs`: relevancia por etapa, no exposición de la sorpresa, preferencia en clave aislada.
- `tests/browser-i2-guide.e2e.mjs`: opt-in/out, persistencia tras recarga, no modificación de la sesión, no overflow de 320–430 px.
- `scripts/verify-pages.mjs`: verifica el módulo nuevo en el sitio publicado.

**Límites:** no se generan ilustraciones pesadas, diálogo de voz, memoria de usuario, IA generativa externa ni personajes con identidad gráfica no aprobada. Las pruebas reales de Android/TalkBack y comprensión por usuarios novatos siguen como criterios manuales de I2-38.

**Siguiente microfase:** I2-13, onboarding y presentación de la primera misión.
