# Nico — recursos visuales para el simulador gamificado

**Estado de respaldo (2026-10-25): PENDIENTE DE CARGA DE BINARIOS.**

Este directorio está reservado para los diseños aprobados de Nico. El inventario verificado
contiene **21 archivos PNG**, excluyendo expresamente la primera versión de Nico.

## Inventario esperado

| Directorio | Archivos |
| --- | --- |
| `personaje/` | `nico_chibi_cuerpo_completo.png` |
| `iconos/` | `areas_y_flujo.png`, `operacion_y_equipos.png`, `logros_y_avances.png`, `alertas_y_riesgos.png`, `kpis_y_semaforos.png` |
| `expresiones/` | `nico_12_expresiones.png`, `nico_01_06.png`, `nico_07_12.png` |
| `expresiones/individual/` | `01_saludo.png`, `02_explicacion.png`, `03_pista.png`, `04_duda.png`, `05_alerta.png`, `06_demanda_creciente.png`, `07_analisis_kpi.png`, `08_decision_correcta.png`, `09_mejora.png`, `10_desviacion.png`, `11_recuperacion.png`, `12_meta_cumplida.png` |

## Uso previsto

- Nico chibi: personaje de referencia de la interfaz.
- Iconos: áreas, operaciones, hitos, alertas y semáforos de KPI.
- Nico de medio cuerpo: pistas, explicaciones, dudas, alerta, demanda real, evaluación de KPI, recuperación y cumplimiento de objetivos.

## Condiciones de integración

Los PNG originales NO reemplazan automáticamente a `juego/nico.svg`.
Las láminas son conjuntos de ilustraciones, no iconos ya segmentados.
Los 12 recortes individuales conservan su fondo original; no son sprites transparentes.
El contenido binario debe cargarse y verificarse antes de enlazarlo desde `app.js` o `styles.css`.

## Instalación validada desde el respaldo ZIP

El respaldo aportado por el usuario contiene 21 PNG originales (y el catálogo); **ningún archivo binario se ha subido al repositorio en esta entrega**. No marcar el inventario como completo solo por disponer de un ZIP o su manifest.

El instalador incluido en el proyecto automatiza la recuperación sin copiar y pegar imágenes:

```bash
python3 tools/install-nico-assets.py cd_simulator_nico_assets_backup_2026-10-25.zip
git add juego/assets/nico/ src/i2-nico-art.js
git commit -m "assets: respaldar 21 PNG originales de Nico"
git push
```

El script verifica los **21 hashes SHA-256** del `manifest.json` antes de extraer, rechaza rutas inseguras, conserva los bytes originales y activa `I2_NICO_ASSETS_READY=true` solo después de instalarlos todos. El juego usa `juego/nico.svg` mientras tanto. Una vez publicados, ya están conectadas las poses de bienvenida, explicación, alerta, demanda, análisis y recuperación. Las cinco láminas de iconos quedan indexadas, **no se recortan ni fingen iconos individuales**.

**Advertencia de calidad:** las expresiones individuales mantienen el fondo original; revisar cómo lucen sobre tarjetas de distintos colores antes de liberar las 21 imágenes como sprites definitivos.

## Carga manual desde el respaldo

1. Descarga el ZIP `cd_simulator_nico_assets_backup_2026-10-25.zip` proporcionado en el chat.
2. Descomprímelo en la raíz del repositorio; los PNG deben quedar bajo `juego/assets/nico/`.
3. Sube y confirma los 21 PNG en GitHub. El ZIP también incluye un `manifest.json`
   con dimensiones y hashes SHA-256 para verificar integridad.
4. Solo después de validar los archivos, cambia este estado a RESPALDADO.

**Exclusión:** `nico_trabajador_logístico_pixel_art.png` (primera versión, no deseada).
