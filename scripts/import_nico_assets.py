#!/usr/bin/env python3
"""Importa las 21 ilustraciones de Nico desde el ZIP validado de ChatGPT.

Ejemplo: python scripts/import_nico_assets.py nico_assets.zip --push
"""
import argparse
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "juego" / "assets" / "nico"
ZIP_PREFIX = "juego/assets/nico/"


def ejecutar_git(*args):
    """Ejecuta Git desde la raíz del repositorio sin usar credenciales en el script."""
    subprocess.run(["git", *args], cwd=ROOT, check=True)


def importar(archivo_zip, publicar=False):
    # El manifiesto es la lista autorizada de archivos y hashes esperados.
    manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
    contenido_validado = []
    with zipfile.ZipFile(archivo_zip) as z:
        for archivo in manifest["files"]:
            ruta = archivo["path"].lstrip("/")
            destino = (ASSETS / ruta).resolve()
            if not destino.is_relative_to(ASSETS.resolve()):
                raise ValueError(f"Ruta fuera de assets: {ruta}")

            # Confirmar SHA-256 antes de escribir un solo PNG en disco.
            datos = z.read(ZIP_PREFIX + ruta)
            obtenido = hashlib.sha256(datos).hexdigest()
            if obtenido != archivo["sha256"]:
                raise ValueError(f"Archivo inválido (SHA-256): {ruta}")
            contenido_validado.append((destino, datos))

    for destino, datos in contenido_validado:
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(datos)
    print(f"Imágenes importadas y verificadas: {len(contenido_validado)}")

    if publicar:
        # Solo agregar los PNG verificados; no incluir otros cambios del repositorio.
        rutas = [str(destino.relative_to(ROOT)) for destino, _ in contenido_validado]
        ejecutar_git("add", "--", *rutas)
        # Commit solo de los PNG, aunque existan otros cambios en el índice.
        ejecutar_git("commit", "-m", "assets: agregar 21 ilustraciones de Nico", "--", *rutas)
        ejecutar_git("push", "origin", "HEAD:main")
        print("Push completado a origin/main")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Importar los assets de Nico")
    parser.add_argument("zip", type=Path, help="ZIP de respaldo de Nico")
    parser.add_argument("--push", action="store_true", help="Crear commit y publicar en GitHub")
    args = parser.parse_args()
    importar(args.zip, args.push)
