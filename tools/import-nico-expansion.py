#!/usr/bin/env python3
"""Importa 24 nuevas tarjetas ilustradas de Nico desde el ZIP de ChatGPT.

Ejemplos:
  python tools/import-nico-expansion.py nico_nuevas_24_poses_cd_2026-10-31.zip
  python tools/import-nico-expansion.py nico_nuevas_24_poses_cd_2026-10-31.zip --publish
"""
import argparse
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / "juego/assets/nico/expansion-2026-10-31"
PREFIX = "juego/assets/nico/expansion-2026-10-31/"
REGISTRY = ROOT / "src/i2-nico-expansion.js"
DISABLED = "export const I2_NICO_EXPANSION_READY=false;"
ENABLED = "export const I2_NICO_EXPANSION_READY=true;"


def run_git(*arguments):
    """Ejecuta Git en el repositorio existente sin usar claves ni tokens embebidos."""
    subprocess.run(["git", *arguments], cwd=ROOT, check=True)


def import_assets(archive_path: Path, publish: bool = False) -> int:
    """Valida todos los PNG antes de escribir cualquier archivo en el proyecto."""
    if not archive_path.is_file():
        raise FileNotFoundError(f"No se encontró el ZIP: {archive_path}")

    # Activar la expansión exige tener previamente la integración de catálogo.
    # El preflight ocurre ANTES de escribir assets, para evitar cargas a medias.
    registry_content = None
    if publish:
        if not REGISTRY.is_file():
            raise RuntimeError("Integra primero el PR de Nico: falta src/i2-nico-expansion.js")
        registry_content = REGISTRY.read_text(encoding="utf-8")
        if DISABLED not in registry_content and ENABLED not in registry_content:
            raise RuntimeError("No se encontró la bandera controlada de expansión")

    staged = []
    with zipfile.ZipFile(archive_path) as archive:
        # El manifiesto viaja dentro del mismo ZIP para evitar datos externos.
        manifest_path = PREFIX + "manifest.json"
        manifest_bytes = archive.read(manifest_path)
        manifest = json.loads(manifest_bytes.decode("utf-8"))
        assets = manifest.get("assets", [])
        if len(assets) != 24:
            raise ValueError(f"Se esperaban 24 imágenes; recibido: {len(assets)}")

        names = set()
        for item in assets:
            relative = Path(item["path"])
            if relative.is_absolute() or ".." in relative.parts or relative.suffix.lower() != ".png":
                raise ValueError(f"Nombre de imagen inválido: {relative}")
            if relative.as_posix() in names:
                raise ValueError(f"Imagen duplicada en manifiesto: {relative}")
            names.add(relative.as_posix())

            # SHA-256 detecta archivos incompletos, cambios o errores de extracción.
            data = archive.read(PREFIX + relative.as_posix())
            digest = hashlib.sha256(data).hexdigest()
            if digest != item["sha256"]:
                raise ValueError(f"No coincide SHA-256: {relative}")

            output = DESTINATION / relative
            if output.exists() and output.read_bytes() != data:
                raise ValueError(f"Archivo diferente existente: {output}")
            staged.append((output, data))

    # Las escrituras solo comienzan si los 24 archivos son consistentes.
    for output, data in staged:
        output.parent.mkdir(parents=True, exist_ok=True)
        if not output.exists():
            output.write_bytes(data)
    DESTINATION.mkdir(parents=True, exist_ok=True)
    manifest_output = DESTINATION / "manifest.json"
    manifest_output.write_bytes(manifest_bytes)
    print(f"Nico: {len(staged)} imágenes verificadas e importadas en {DESTINATION}")

    if publish:
        # La bandera solo se activa después de comprobar todos los SHA-256.
        REGISTRY.write_text(registry_content.replace(DISABLED, ENABLED), encoding="utf-8")
        # Solo incluye expansión y registro, sin cambios ajenos del usuario.
        paths = [str(DESTINATION.relative_to(ROOT)), str(REGISTRY.relative_to(ROOT))]
        run_git("add", "--", *paths)
        run_git("commit", "-m", "assets: verificar y activar 24 reacciones de Nico",
                "--", *paths)
        run_git("push", "origin", "HEAD")
        print("Publicación Git completada; comprobar la rama y la revisión en GitHub.")
    return len(staged)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Importador de 24 tarjetas de Nico")
    parser.add_argument("archive", type=Path, help="Ruta al ZIP descargado desde ChatGPT")
    parser.add_argument("--publish", action="store_true",
                        help="Verificar, activar catálogo, commitear PNG y publicar la rama actual")
    args = parser.parse_args()
    import_assets(args.archive, args.publish)
