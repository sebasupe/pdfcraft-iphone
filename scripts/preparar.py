"""Arma el sitio de PdfCraft para iPhone a partir del build web oficial.

Uso:
    python scripts/preparar.py <carpeta del release web> <icono 1024 png> <carpeta de salida>

Copia el release sin modificarlo y le agrega: la interfaz para iPhone (index.html, movil.css,
movil.js, gestos.js), manifest.webmanifest, íconos, iphone.js y sw.js (instalación sin conexión y
actualización automática).
"""
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
PLANTILLA = RAIZ / "plantilla"

# No hacen falta en el teléfono para abrir la app (los modelos de OCR se bajan al usarse).
NO_PRECARGAR = {"README.md", "ATTRIBUTION.md", "NOTICE", "LICENSE-APACHE", "LICENSE-MIT", "VERSION", ".nojekyll"}
# Configuración de otros servidores; GitHub Pages no la usa.
SOBRAN = ("_headers", ".htaccess", "HOSTING.md")


def uno(carpeta: Path, patron: str) -> Path:
    hallados = [p for p in carpeta.iterdir() if re.fullmatch(patron, p.name)]
    if len(hallados) != 1:
        sys.exit(f"error: esperaba un archivo {patron} en {carpeta}, hallé {len(hallados)}")
    return hallados[0]


def iconos(png: Path, destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    im = Image.open(png).convert("RGBA")
    # El ícono trae margen y esquinas transparentes; iOS los pinta de negro, así que se recorta
    # al azulejo, se rellenan las esquinas con su propio rojo y iOS aplica su máscara redondeada.
    im = im.crop(im.getchannel("A").point(lambda a: 255 if a > 200 else 0).getbbox())
    w, h = im.size
    rojo = im.getpixel((w // 2, int(h * 0.02)))
    fondo = Image.new("RGBA", im.size, (rojo[0], rojo[1], rojo[2], 255))
    lleno = Image.alpha_composite(fondo, im).convert("RGB")
    for nombre, lado in (("apple-touch-icon.png", 180), ("icon-192.png", 192), ("icon-512.png", 512)):
        lleno.resize((lado, lado), Image.LANCZOS).save(destino / nombre, optimize=True)
    lado = 512
    m = Image.new("RGB", (lado, lado), rojo[:3])
    interior = lleno.resize((int(lado * 0.82), int(lado * 0.82)), Image.LANCZOS)
    m.paste(interior, ((lado - interior.width) // 2, (lado - interior.height) // 2))
    m.save(destino / "icon-maskable-512.png", optimize=True)


def main() -> None:
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    release = Path(sys.argv[1]).resolve()
    icono = Path(sys.argv[2]).resolve()
    salida = Path(sys.argv[3]).resolve()
    if not (release / "index.html").is_file():
        sys.exit(f"error: {release} no tiene index.html")

    original = (release / "index.html").read_text(encoding="utf-8")
    glue = uno(release, r"pdfcraft-web-[0-9a-f]+\.js")
    wasm = uno(release, r"pdfcraft-web-[0-9a-f]+_bg\.wasm")
    build = re.search(r"pdfcraft-web-([0-9a-f]+)_bg\.wasm", wasm.name).group(1)
    version_txt = release / "VERSION"
    pdfcraft = version_txt.read_text(encoding="utf-8").strip() if version_txt.is_file() else build

    # Se conservan los <link> de precarga y el <meta> del worker de OCR, menos la precarga del
    # .wasm: iphone.js lo baja con barra de progreso (si no, se bajaría dos veces).
    cabecera = [t for t in re.findall(r"<link\b[^>]*>|<meta\s+name=\"pdfcraft-ocr-worker\"[^>]*>", original)
                if not ('rel="preload"' in t and ".wasm" in t)]

    if salida.exists():
        shutil.rmtree(salida)
    shutil.copytree(release, salida)
    for sobra in SOBRAN:
        (salida / sobra).unlink(missing_ok=True)
    (salida / ".nojekyll").write_text("", encoding="utf-8")
    iconos(icono, salida / "icons")

    html = (PLANTILLA / "index.html").read_text(encoding="utf-8")
    html = (html.replace("__HEAD_LINKS__", "\n    ".join(cabecera))
                .replace("__GLUE__", glue.name)
                .replace("__WASM__", wasm.name)
                .replace("__WASM_BYTES__", str(wasm.stat().st_size)))
    (salida / "index.html").write_text(html, encoding="utf-8")
    # El resto de la plantilla (iphone.js, movil.js, movil.css…) va tal cual.
    for f in sorted(PLANTILLA.iterdir()):
        if f.is_file() and f.name not in ("index.html", "sw.js"):
            shutil.copy2(f, salida / f.name)

    manifest = {
        "name": "PdfCraft",
        "short_name": "PdfCraft",
        "description": "Lector y editor de PDF de código abierto.",
        "id": "./",
        "start_url": "./",
        "scope": "./",
        "display": "standalone",
        "orientation": "any",
        "lang": "es",
        "background_color": "#f1f1f3",
        "theme_color": "#f1f1f3",
        "icons": [
            {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    (salida / "manifest.webmanifest").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    precache = ["./", "./index.html"]
    for f in sorted(salida.rglob("*")):
        rel = f.relative_to(salida).as_posix()
        if f.is_dir() or f.name in NO_PRECARGAR or rel.startswith(("licenses/", "models/")) or rel in ("index.html", "sw.js"):
            continue
        precache.append("./" + rel)

    # La versión cambia solo si cambia algún archivo: así el iPhone se actualiza cuando hay algo
    # nuevo y no baja nada si se vuelve a publicar lo mismo.
    huella = hashlib.sha256()
    for rel in precache[2:]:
        huella.update(rel.encode("utf-8"))
        huella.update((salida / rel[2:]).read_bytes())
    huella.update(html.encode("utf-8"))
    sw = (PLANTILLA / "sw.js").read_text(encoding="utf-8")
    huella.update(sw.encode("utf-8"))
    sw = (sw.replace("__VERSION__", build + "-" + huella.hexdigest()[:10])
            .replace("__PDFCRAFT__", pdfcraft)
            .replace("__WASM__", wasm.name)
            .replace("__WASM_BYTES__", str(wasm.stat().st_size))
            .replace("__PRECACHE__", json.dumps(precache, indent=2)))
    (salida / "sw.js").write_text(sw, encoding="utf-8")

    tam = sum(f.stat().st_size for f in salida.rglob("*") if f.is_file())
    print(f"listo: {salida}")
    print(f"  PdfCraft {pdfcraft} (build {build}), {len(precache)} archivos para uso sin conexión, {tam / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
