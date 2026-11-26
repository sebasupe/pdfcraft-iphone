# PdfCraft para iPhone

Instala [PdfCraft](https://github.com/storytold/pdfcraft), el lector y editor de PDF de código
abierto, como app en la pantalla de inicio del iPhone o iPad, con una interfaz pensada para el
celular:

- **Sin App Store, sin Apple ID y sin suscripción.** No caduca ni hay que renovarla.
- **Funciona sin conexión** después de la primera instalación.
- **Se actualiza sola:** cada día se revisa si hay un release nuevo de PdfCraft; si lo hay, se
  publica aquí y el iPhone lo baja en segundo plano y lo aplica al volver a Inicio.
- **Tus PDF no salen del teléfono:** todo se procesa en el propio dispositivo.

## Instalar en el iPhone

1. Abre la página de este proyecto en **Safari** (la dirección está en *About* del repositorio).
2. Toca **Compartir** (o **•••** → Compartir) → **Agregar a pantalla de inicio** → **Agregar**.
3. Abre **PdfCraft** desde el ícono y espera la primera instalación (unos 25 MB, una sola vez).

## Cómo se usa

**Inicio**
- **Abrir un PDF** desde Archivos, iCloud Drive u otra app.
- **Herramientas:** Comentar, Rellenar y firmar, Editar PDF, Organizar páginas, Proteger, Exportar
  a Word o imagen. Cada una pide el PDF y lo abre directo en esa herramienta.
- **Recientes:** los PDF abiertos quedan guardados en la app con tus cambios (••• para
  compartirlos o quitarlos).

**Documento**
- Desliza con un dedo para recorrerlo (con inercia) y pellizca para acercar o alejar.
- Toca un campo de un formulario para rellenarlo: el teclado sale al primer toque.
- Mantén el dedo sobre el texto y arrástralo para seleccionarlo: aparece **Copiar** y la barra de
  PdfCraft para resaltar, subrayar, tachar o comentar.
- Arriba: volver a Inicio, **buscar** (con anterior/siguiente abajo), **compartir o guardar en
  Archivos** y ••• (ir a una página, ajustar al ancho, página por página, propiedades).
- El botón ✏️ abre las herramientas. Cada una muestra su barra abajo; arriba están deshacer,
  rehacer y **Listo**.
- Los cambios se guardan en la app medio minuto después de editar, al salir de la app y al volver
  a Inicio.
- **Todas las herramientas** muestra la interfaz completa de PdfCraft para lo demás.

**Ajustes** (engranaje de Inicio): tamaño de los textos de PdfCraft, tema claro/oscuro y tu nombre
para comentarios y firmas.

## Cómo funciona
| Archivo | Qué hace |
|---|---|
| `.github/workflows/publicar.yml` | Cada día y en cada cambio: baja el último release web oficial, arma el sitio y lo publica en GitHub Pages |
| `scripts/descargar_web.py` | Baja `pdfcraft-web-<versión>.zip` del release oficial y verifica su tamaño y su SHA-256 |
| `scripts/preparar.py` | Agrega al build oficial (sin modificarlo) la interfaz para iPhone, el manifiesto, los íconos y el service worker |
| `plantilla/index.html`, `movil.css`, `movil.js` | La interfaz de celular. Maneja PdfCraft con su API de página (`?control`) y su modo anfitrión (`data-host="page"`), y oculta sus barras de escritorio |
| `plantilla/gestos.js` | Traduce los dedos a lo que PdfCraft entiende: desplazar con inercia, pellizcar, tocar (y abrir el teclado al primer toque) y seleccionar |
| `plantilla/iphone.js` | Pantalla de carga, instalación sin conexión, actualizaciones y la hoja de compartir de iOS |
| `plantilla/sw.js` | Service worker: guarda la app en el teléfono |

El build de PdfCraft que se publica es el oficial, sin cambios. Este repositorio no está afiliado
a PdfCraft ni a ArtCraft. PdfCraft y su ícono se distribuyen bajo MIT o Apache-2.0
(`assets/LICENSE.txt`); las licencias de sus componentes van dentro del sitio publicado.
