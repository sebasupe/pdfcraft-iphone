"""Baja el último build web oficial de PdfCraft (github.com/storytold/pdfcraft/releases).

Verifica el tamaño y la huella SHA-256 que publica GitHub.
Uso: python3 scripts/descargar_web.py [carpeta destino, por defecto web/]
"""
import hashlib
import json
import os
import shutil
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
API = "https://api.github.com/repos/storytold/pdfcraft/releases/latest"


def pedir(url, accept="application/vnd.github+json"):
    req = urllib.request.Request(url, headers={"Accept": accept, "User-Agent": "pdfcraft-ios-build"})
    token = os.environ.get("GH_TOKEN")
    if token and url.startswith("https://api.github.com/"):
        req.add_header("Authorization", f"Bearer {token}")
    return urllib.request.urlopen(req, timeout=120)


def main():
    release = json.load(pedir(API))
    tag = release["tag_name"]
    version = tag.lstrip("vV")
    asset = next(a for a in release["assets"] if a["name"].startswith("pdfcraft-web-") and a["name"].endswith(".zip"))
    print(f"PdfCraft {version}: {asset['name']} ({asset['size'] / 1e6:.1f} MB)")

    with tempfile.TemporaryDirectory() as tmp:
        zip_path = Path(tmp) / asset["name"]
        with pedir(asset["browser_download_url"], accept="application/octet-stream") as r, open(zip_path, "wb") as f:
            shutil.copyfileobj(r, f, 1 << 20)
        if zip_path.stat().st_size != asset["size"]:
            sys.exit("error: la descarga no tiene el tamaño esperado")
        digest = (asset.get("digest") or "").lower()
        if digest.startswith("sha256:"):
            h = hashlib.sha256(zip_path.read_bytes()).hexdigest()
            if h != digest.split(":", 1)[1]:
                sys.exit("error: la huella SHA-256 no coincide")
            print("  huella SHA-256 verificada")

        destino = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else RAIZ / "web"
        if destino.exists():
            shutil.rmtree(destino)
        extraido = Path(tmp) / "x"
        with zipfile.ZipFile(zip_path) as z:
            for nombre in z.namelist():
                if nombre.startswith("/") or ".." in Path(nombre).parts:
                    sys.exit(f"error: ruta no permitida en el zip: {nombre}")
            z.extractall(extraido)
        carpeta = next(p.parent for p in extraido.rglob("index.html"))
        shutil.move(str(carpeta), str(destino))
    for sobra in ("_headers", ".htaccess", "HOSTING.md"):
        (destino / sobra).unlink(missing_ok=True)
    (destino / "VERSION").write_text(version, encoding="utf-8")

    env = os.environ.get("GITHUB_ENV")
    if env:
        with open(env, "a", encoding="utf-8") as f:
            f.write(f"PDFCRAFT_VERSION={version}\n")
    print(f"listo: {destino}")


if __name__ == "__main__":
    main()
