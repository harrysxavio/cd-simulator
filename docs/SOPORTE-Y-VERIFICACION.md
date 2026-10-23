# Operación, soporte y verificación del simulador

**Versión base:** v11.68 r177 · **Alcance:** soporte de un prototipo educativo estático; no producción operativa.

Este procedimiento permite comprobar que una versión publicada corresponde al código de GitHub, diagnosticar fallos frecuentes, reproducir casos y mantener su documentación sin declarar verificaciones que no se hayan realizado.

## 1. Referencias y fuentes de verdad

- **Aplicación:** https://harrysxavio.github.io/cd-simulator/?release=11.68-r177
- **Repositorio:** https://github.com/harrysxavio/cd-simulator
- **Plan vigente:** [43 microfases](EXECUTION-PLAN-43.md); no usar porcentajes históricos del README como estado vigente.
- **Versión pública:** release.json, cabecera HTML, imports versionados de app.js y CSS.
- **Historial técnico:** [acta M8-39](STATUS-M8-39.md), [auditoría M8-40](STATUS-M8-40.md).
- **Accesibilidad manual pendiente:** [protocolo Android/TalkBack](M7-38-ANDROID-A11Y-CHECKLIST.md), [issue #67](https://github.com/harrysxavio/cd-simulator/issues/67).
- **Manual para participantes:** [guía](GUIA-USUARIO.md), [ejercicios](ESCENARIOS-DE-APRENDIZAJE.md), [glosario](GLOSARIO-Y-LIMITES.md).

## 2. Diagnóstico operativo por síntoma

| Síntoma | Comprobación inicial | Medida segura |
|---|---|---|
| Se ve una versión anterior | Leer versión en cabecera y usar **Verificar actualización** | Abrir en pestaña nueva con enlace del manifiesto; no atribuirlo a caché sin comprobar HTTP |
| La página no carga | Confirmar conectividad y disponibilidad de GitHub Pages | Revisar workflow Pages y verificación HTTP, informar URL y hora; no editar datos de campaña |
| Desapareció la campaña | Verificar navegador, perfil, modo incógnito y borrado de datos locales | No prometer restauración desde un servidor; la aplicación no guarda sesiones en backend |
| Resultado inesperado | Capturar decisiones, política SKU, shock, cobertura, día de compra, reserva y staging | Repetir con el mismo baseline; distinguir motor agregado de cohorte SKU |
| Compra aumenta costo sin despachos | Verificar arribo antes del corte, cola de recepción, Calidad, stock y capacidad | No tratar compra comprometida como inventario recibido |
| Preparados pero no expedidos | Confirmar modo staging y capacidad de transporte | Revisar eventos de salida y cola, no reportar entregas |
| Botón/lector no entendible | Registrar pantalla, tamaño, teclado o lector, flujo exacto | Abrir incidencia; ejecutar aceptación física con TalkBack cuando se disponga |
| Error persistente al reiniciar | Registrar mensajes y si se usa modo privado/almacenamiento bloqueado | Confirmar el reinicio y probar en otra sesión ficticia; no manipular claves de datos reales |

## 3. Reporte mínimo de defecto

Para todo hallazgo registrar:

1. **Versión visible** y, cuando sea posible, revisión de release.json.
2. **Entorno:** navegador, sistema, ancho/tamaño de pantalla; anotar si es emulador o dispositivo real.
3. **Datos sintéticos de entrada:** demanda, signo/% sorpresa, decisiones de ocho áreas, política SKU, recuperación y fechas.
4. **Pasos exactos:** pantalla → botón → decisión → resultado observado.
5. **Esperado vs real:** indicadores con unidad, horizonte y fuente explícitos.
6. **Evidencia:** captura sin información personal, error de consola cuando exista, número de workflow/PR.
7. **Clasificación:** bloqueante físico/económico, bloqueo de navegación/accesibilidad o defecto menor de contenido.
8. **Retest:** mismo escenario, prueba automatizada añadida y comprobación en rama + main; móvil físico cuando aplique.

No incluir datos de clientes, credenciales, tokens ni costos confidenciales en incidencias públicas.

## 4. Procedimiento de validación para desarrolladores

**Requisitos de desarrollo:** Git, Node 22 para pruebas del proyecto y navegador compatible con Chromium/Playwright. No se necesita backend. En CI se utiliza el Chromium de Ubuntu 24.04 y Playwright fijado para las pruebas E2E.

~~~text
# 1. Consultar rama y cambios
git status
git branch --show-current

# 2. Regresión determinista de modelos
node --experimental-default-type=module --test tests/*.test.mjs

# 3. Servir archivos estáticos localmente (otra terminal)
python3 -m http.server 8000 --bind 127.0.0.1

# 4. Con Playwright instalado y Chromium disponible:
# E2E_CHROMIUM_PATH apunta al binario del navegador en Linux CI.
# Ajustar ruta de binario según el equipo local o permitir Playwright instalado.
node --experimental-default-type=module --test --test-concurrency=1 tests/*.e2e.mjs
~~~

La instalación de Playwright en CI se realiza mediante **npm install --no-save --no-package-lock --no-audit --no-fund playwright@1.64.0**. No instalar dependencias globales ni correr scripts de repositorios desconocidos sin revisión.

### Puertas obligatorias antes de cerrar un cambio

~~~mermaid
flowchart TD
    A[PR con caso de aceptación] --> B{Pruebas Node verdes}
    B -->|No| F[Corregir sin fusionar]
    B -->|Sí| C{Chromium escritorio/móvil verde}
    C -->|No| F
    C -->|Sí| D[Merge a main]
    D --> E{CI main verde}
    E -->|No| F
    E -->|Sí| G{Si publica activos: Pages y HTTP correctos}
    G -->|No| F
    G -->|Sí| H[Registrar PR, SHA, versión y limitaciones]
~~~

Para una modificación solo documental, confirmar que no se alteraron los archivos funcionales y que los enlaces Markdown resuelven a rutas existentes. Los workflows pueden ejecutarse de todos modos después de modificar README o docs.

## 5. Criterios de release y rollback

- No declarar que una versión llegó a producción solo porque el workflow de build terminó. Confirmar el manifiesto y los activos **servidos por la URL pública**.
- Mantener coherentes cabecera, estilos, imports de app.js, release-status.js y release.json cuando cambia una versión funcional.
- Una reversión (rollback) debe tener commit o PR de referencia, preservación del número/versionado consistente y pruebas de la versión servida. No reemplazar archivos a ciegas.
- Etiquetar una versión como **estable** únicamente tras la microfase M8-42 y los bloqueos de aceptación resueltos. La actual versión publicada es un prototipo funcional.
- Los números de tests pueden cambiar cuando se añaden casos; registrar cifras solo si se han leído del run correspondiente.
- Si se detecta una divergencia entre versión visible y HTTP, detener conclusiones, registrar respuesta y verificar el nuevo despliegue.

## 6. Checklist de una sesión con usuario principiante

| Verificación | Observación |
|---|---|
| Encuentra Inicio/Operación, Diagnóstico, Recuperación y Resultados | Pendiente de registrar en prueba física |
| Comprende por qué menos stock limita pedidos aunque exista capacidad | Pendiente de registrar en prueba física |
| Distingue “salió del CD” frente a “entregado” | Pendiente de registrar en prueba física |
| Entiende “costo no tarifado” como desconocido, no gratuito | Pendiente de registrar en prueba física |
| Navega controles sin superposición, en Android real | Pendiente de registrar en prueba física |
| TalkBack anuncia áreas, selección, desplegables y mantiene foco | Pendiente de registrar en prueba física |

**No marcar estos controles como aprobados desde pruebas de Chromium emulado.** La evidencia de Android físico de M7-38 debe anotar modelo, Android/Chrome, fecha, resultados, defectos y repetición del test después de correcciones.

## 7. Preparación para M8-42

Antes de entrega estable, verificar:

- [ ] M7-38: Android físico, TalkBack y comprensión con resultados documentados o impedimento explícito.
- [ ] M8-41: documentos completos, enlaces válidos, escenarios, arquitectura y glosario.
- [ ] Integridad física y económica en Node y E2E navegador aprobadas en el commit candidato.
- [ ] Configuración, navegación, persistencia, reanudación y reinicio probados.
- [ ] GitHub Pages despliega y la respuesta HTTP coincide con código, manifiesto y activos.
- [ ] Etiqueta de versión final solo tras cumplir todas las puertas; anotar SHA, release y fecha.
- [ ] README accesible y honesto sobre modelos, límites, origen ficticio y diferencias entre expedición/entrega.
- [ ] Regularizar, si se dispone de evidencia, el estado administrativo histórico de microfase 00 sin inventar controles.

El equipo del proyecto puede completar este checklist por etapa, pero una casilla pendiente no se convierte en aprobada por el mero hecho de tener documentado un procedimiento.
