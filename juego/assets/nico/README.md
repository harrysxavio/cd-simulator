# Nico · arte original para Misión CD

**Estado al 25-10-2026: RESPALDO COMPLETO Y VERIFICADO · 21/21 PNG.**

El usuario incorporó a `main` los 21 archivos originales dentro de `juego/assets/nico/`. Comparamos cada SHA de objeto Git del repositorio contra el objeto calculado directamente con los bytes del ZIP de respaldo, y verificamos los 21 SHA-256 contra el manifiesto. **Coincidieron los 21 archivos**, sin recreación, recomprensión ni sustitución. La primera versión descartada permanece excluida.

## Inventario y utilización

| Carpeta | Cantidad | Uso aprobado |
| --- | ---: | --- |
| `personaje/` | 1 | Nico de cuerpo completo en la presentación |
| `expresiones/individual/` | 12 | Saludo, explicación, pista, duda, alerta, sorpresa, análisis, feedback y recuperación |
| `expresiones/` | 3 | Láminas originales de referencia visual; no se superponen ni sustituyen a las individuales |
| `iconos/` | 5 | Láminas por categorías: áreas/flujo, operación/equipos, logros, alertas y KPI |

**Regla importante:** las láminas de iconos son imágenes completas, no archivos de icono individual. Hasta disponer de cortes exactos y revisión móvil, no se usarán estiradas como pictogramas diminutos. El arte tiene sus fondos originales: no se debe declarar transparencia inexistente.

## Qué muestra el juego

- En la portada: el Nico de cuerpo completo.
- En las ocho áreas: expresión contextual junto al consejo, **solo si el jugador abre «Ver consejo de Nico»**.
- Antes de descubrir la sorpresa: alerta sin información de demanda real.
- Después de revelarla: expresión de novedad/recuperación.
- En resultados: expresión de cierre condicionada por las metas didácticas evaluables; no se afirma rentabilidad total.

El selector de experiencia «Estoy aprendiendo / Conozco lo básico / Quiero el detalle técnico» adapta vocabulario y ejemplos, sin alterar física, semilla, costos, puntuación ni decisiones. Cada ayuda responde: **qué observar, un ejemplo sencillo, una pregunta que invita a pensar**. Se puede ocultar y sigue siendo accesible sin imágenes ni gestos.

La ruta centralizada está en `src/i2-nico-art.js`; si una imagen falla en el navegador, la UI cae al avatar `juego/nico.svg` y los textos siguen disponibles. Los 21 hashes se validan además en `tests/i2-nico-art.test.mjs` durante CI.

## Mantenimiento

El ZIP original aún puede verificarse de nuevo con:

```bash
python3 tools/install-nico-assets.py cd_simulator_nico_assets_backup_2026-10-25.zip
```

Este paso ya **no es necesario** para visualizar Nico en GitHub Pages: los 21 PNG están cargados y activados. Si se modifica cualquier ilustración en el futuro, actualizar manifiesto, hashes y tests de integridad, revisar 320–430 px, TalkBack y fondos antes de aprobar.

**Plan:** [criterios de integración de Nico y voz pedagógica](../../../docs/I2-NICO-ARTE-Y-VOZ.md).
