#!/usr/bin/env python3
"""Install the 21 source PNGs from the user-provided Nico archive.

Usage: python3 tools/install-nico-assets.py <cd_simulator_nico_assets_backup_2026-10-25.zip>
Requires only Python 3 standard library. Never downloads or edits originals.
"""
from __future__ import annotations

import hashlib
import json
import pathlib
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "juego" / "assets" / "nico"
MANIFEST = ASSET_ROOT / "manifest.json"
PREFIX = "juego/assets/nico/"
CONFIG = ROOT / "src" / "i2-nico-art.js"


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: python3 tools/install-nico-assets.py <respaldo.zip>", file=sys.stderr)
        return 2
    source = pathlib.Path(sys.argv[1]).resolve()
    if not source.is_file():
        print(f"No existe: {source}", file=sys.stderr)
        return 2
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    files = manifest["files"]
    if len(files) != 21 or len({e["path"] for e in files}) != 21:
        raise ValueError("Manifest debe contener exactamente los 21 PNG aprobados")
    assets = {}
    with zipfile.ZipFile(source) as archive:
        for entry in files:
            relative = pathlib.PurePosixPath(entry["path"])
            if relative.is_absolute() or ".." in relative.parts or relative.suffix != ".png":
                raise ValueError("Ruta insegura: " + str(relative))
            path = PREFIX + str(relative)
            metadata = archive.getinfo(path)
            if metadata.file_size > 6_000_000:
                raise ValueError("Imagen demasiado grande: " + path)
            content = archive.read(path)
            sha = hashlib.sha256(content).hexdigest()
            if sha != entry["sha256"]:
                raise ValueError("SHA-256 incorrecto: " + path)
            if not content.startswith(b"\x89PNG\r\n\x1a\n"):
                raise ValueError("Archivo no es PNG: " + path)
            assets[str(relative)] = content
    # Only write after ALL hashes have passed, to avoid a half-installed set.
    for relative, payload in assets.items():
        target = ASSET_ROOT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)
    js = CONFIG.read_text(encoding="utf-8")
    old = "export const I2_NICO_ASSETS_READY=false;"
    if old not in js and "export const I2_NICO_ASSETS_READY=true;" not in js:
        raise ValueError("No se encuentra el indicador de activación visual")
    CONFIG.write_text(js.replace(old, "export const I2_NICO_ASSETS_READY=true;"), encoding="utf-8")
    manifest["status"] = "VERIFIED_BINARY_ASSETS"
    manifest["installed_count"] = 21
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("OK: 21 PNG verificados por SHA-256 y preparados para Git.")
    print("Siguiente: git add juego/assets/nico src/i2-nico-art.js && git commit -m 'assets: guardar 21 PNG Nico originales'")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
