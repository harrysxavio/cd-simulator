# Nico · ampliación visual de 24 poses (31-10-2026)

**Estado:** 24 PNG generados, recortados y empaquetados para revisión. **Binarios de esta ampliación aún no subidos a GitHub ni integrados en /juego/.** No declarar despliegue, QA móvil ni avance de microfase por producir arte.

## Contraste con el repositorio

- La versión canónica anterior tiene **21/21 PNG efectivamente presentes** en `juego/assets/nico/` y se usa a través de `src/i2-nico-art.js`.
- Se conservan 12 expresiones anteriores, sin sustituirlas ni cambiar la lógica de `src/events.js`.
- La nueva colección utiliza 24 PNG adicionales (320×320, ilustración recortada en tarjeta redondeada) bajo `juego/assets/nico/expansion-2026-10-31/`, acompañados de `manifest.json` con SHA-256.
- Los nuevos fondos internos de tarjeta NO son transparentes como silueta; **solo es transparente el exterior de las esquinas redondeadas**. No tratarlos como sprites de personajes sin fondo.

## Poses y uso sugerido (la imagen NO altera el motor)

| Poses | Reacción representada | Pantalla recomendada |
| --- | --- | --- |
| 13–18 | Pista, presentar datos, revelar demanda, incidente, explicar impacto, siguiente desafío | Ayuda, tutorial, revelación, informe causal, avance |
| 19–24 | Planificación, recursos, optimización, costos, productividad, equilibrio | Áreas, multiacción y análisis gerencial |
| 25–28 | Éxito, resultado parcial, atención, oportunidad de mejora | Evaluación auditada; no premiar por elegir botones |
| 29–36 | Idea, riesgo, revisión de datos, preocupación, crisis, sorpresa, motivación y cierre | Diálogos y señales contextuales de Nico |

## Reglas de uso

1. `15_revelacion_demanda` y `34_sorpresa` no deben acompañar valores de demanda futura antes de la transición de `reveal`. El dibujo aislado no anticipa información.
2. `16_evento_inesperado` y `33_crisis` requieren evento real *observado*. No señalar incidentes aleatorios inexistentes ni transformar un simple escenario de demanda en una parada operacional física.
3. `25_exito` está sujeto a evaluación de objetivos de servicio/gasto/colas. `23_productividad` no implica persona-hora calculada, porque esa métrica no está disponible.
4. El texto debe seguir accesible sin imágenes; no depender solo del color, de una expresión ni de animaciones.
5. Se sugiere mostrar Nico a 88–144 CSS px en diálogo/pista; auditar contraste, zonas táctiles, 320–430 px y Android/TalkBack manual.
6. Mantener el fallback a `juego/nico.svg` y centralizar las futuras rutas en `src/i2-nico-art.js` **solo después de que los PNG estén publicados**.

## Instalación propuesta

Descargar `nico_nuevas_24_poses_cd_2026-10-31.zip` desde el chat en el que se generó. Desde el repositorio local:

```powershell
# Verifica SHA-256 de las 24 imágenes y las extrae al directorio de assets.
python tools/import-nico-expansion.py "C:\\ruta\\nico_nuevas_24_poses_cd_2026-10-31.zip" --publish
```

El modo `--publish` crea commit y hace push a la rama activa, **sin modificar juego/app.js, CSS ni el estado de fases**. Revisar que se publicaron 24 PNG más el manifiesto y verificar URLs HTTP antes de habilitar las rutas.

**Próximo corte técnico independiente:** mapear poses a estados canónicos en `src/i2-nico-art.js`, agregar pruebas de existencia de archivos y carga en móvil. Validación humana antes de dar aprobado.
