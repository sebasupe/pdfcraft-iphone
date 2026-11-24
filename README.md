# PdfCraft para iPhone

Instala [PdfCraft](https://github.com/storytold/pdfcraft), el lector y editor de PDF de código
abierto, como app en la pantalla de inicio del iPhone o iPad:

- **Sin App Store, sin Apple ID y sin suscripción.** No caduca ni hay que renovarla.
- **Funciona sin conexión** después de la primera instalación.
- **Se actualiza sola:** cada día se revisa si hay un release nuevo de PdfCraft; si lo hay, se
  publica aquí y el iPhone lo baja en segundo plano al abrir la app con internet.
- **Tus PDF no salen del teléfono:** todo se procesa en el propio dispositivo.

## Instalar en el iPhone

1. Abre la página de este proyecto en **Safari** (la dirección está en *About* del repositorio).
2. Toca **Compartir** → **Agregar a pantalla de inicio** → **Agregar**.
3. Abre **PdfCraft** desde el ícono y espera la primera instalación (baja unos 70 MB una sola vez).

## Usar
- **Abrir:** botón *Abrir* → Archivos, iCloud Drive, etc.
- **Guardar / Exportar:** se abre la hoja de compartir → *Guardar en Archivos*, AirDrop, Mail…
- **Tamaño de la interfaz:** ⚙ → Preferencias → *Tamaño de la interfaz* (300 % = tamaño
  normal de iPhone; la primera vez arranca en 250 % y con los paneles laterales cerrados).

## Cómo funciona
| Archivo | Qué hace |
|---|---|
| `.github/workflows/publicar.yml` | Cada día y en cada cambio: baja el último release web oficial, arma el sitio y lo publica en GitHub Pages |
| `scripts/descargar_web.py` | Baja `pdfcraft-web-<versión>.zip` del release oficial y verifica su tamaño y su SHA-256 |
| `scripts/preparar.py` | Agrega al build oficial (sin modificarlo) la página para iPhone, el manifiesto, los íconos y el service worker |
| `plantilla/` | `index.html` (pantalla de carga), `iphone.js` (instalación, actualización, guardar con la hoja de compartir) y `sw.js` (modo sin conexión) |

El build de PdfCraft que se publica es el oficial, sin cambios. Este repositorio no está afiliado
a PdfCraft ni a ArtCraft. PdfCraft y su ícono se distribuyen bajo MIT o Apache-2.0
(`assets/LICENSE.txt`); las licencias de sus componentes van dentro del sitio publicado.
