# PdfCraft para iPhone

Instala [PdfCraft](https://github.com/storytold/pdfcraft), el lector y editor de PDF de código
abierto, como app en la pantalla de inicio del iPhone o iPad, con una interfaz nativa de celular
inspirada en la experiencia móvil de Adobe Acrobat (con el emblema e identidad propios de PdfCraft):

- **Sin App Store, sin Apple ID y sin suscripción.** No caduca ni hay que renovarla.
- **Funciona sin conexión** después de la primera instalación.
- **Se actualiza sola:** cada día se revisa si hay un release nuevo de PdfCraft; si lo hay, se
  publica aquí y el iPhone descarga solo los archivos nuevos en segundo plano (sin volver a bajar
  el motor WASM si no cambió).
- **Tus PDF no salen del teléfono:** todo se procesa localmente en tu dispositivo.

## Instalar en el iPhone

1. Abre la página de este proyecto en **Safari** (`https://sebasupe.github.io/pdfcraft-iphone/`).
2. Toca **Compartir** (o **•••** → Compartir) → **Agregar a pantalla de inicio** → **Agregar**.
3. Abre **PdfCraft** desde el ícono y espera la primera instalación.

## Qué incluye

**Navegación por pestañas (Inicio · Archivos · Herramientas) y botón `+`**
- **Inicio:** acciones rápidas deslizables, filtro **Recientes / Destacados (★)**, búsqueda y ordenación. Cada PDF recuerda automáticamente la última página que estabas leyendo.
- **Archivos:** explorador con vista de **lista o cuadrícula**, **carpetas personalizadas**, **Destacados**, renombrar, duplicar, mover y compartir.
- **Herramientas:** catálogo completo organizado por categorías — **Comentar**, **Rellenar y firmar**, **Editar PDF**, **Censurar**, **Fotos / Escáner a PDF**, **Combinar PDF**, **Organizar páginas**, **Dividir**, **Recortar**, **Exportar** (Word, PowerPoint, Imagen, Texto, RTF, extraer imágenes), **Comprimir PDF**, **Proteger con contraseña**, **Reconocer texto (OCR)**, **Mejorar escaneo**, **Marca de agua**, **Encabezado y pie**, **Imprimir (AirPrint)**, **Comparar PDF** y **Modo completo**.
- **Botón `+`:** abre un PDF desde Archivos/iCloud, escanea o convierte fotos de la cámara/galería a PDF multipágina (con filtros de documento y blanco y negro), combina varios PDF o crea uno en blanco.

**Visor inmersivo para iPhone**
- **Gestos nativos:** deslizar con inercia, pellizcar para acercar/alejar, **doble toque** para acercar/ajustar al ancho, **toque simple** para ocultar/mostrar las barras en lectura a pantalla completa, **deslizar horizontal** para pasar páginas en modo Página única y **pulsación larga** con anillo visual para seleccionar texto (Copiar, Resaltar, Subrayar, Tachar, Nota).
- **Barra inferior de lectura:** acceso en un toque a **Páginas**, **Marcadores e índice**, **Comentar**, **Firmar** y **Herramientas**, junto con un **deslizador rápido de páginas** para saltar por libros extensos.
- **Ajustes de vista:** Continuo / Página única / Dos páginas, **Modo noche**, **Sepia**, control de brillo de lectura, rotar vista y **Mantener pantalla encendida**.
- **Paneles integrados:** índice/tabla de contenidos del PDF, tus marcadores personales, lista de comentarios, capas, adjuntos y firmas digitales.
- **Guardado automático:** guarda tus cambios 30 segundos después de editar, al salir de la app y al volver a Inicio.

## Cómo funciona

| Archivo | Qué hace |
|---|---|
| `.github/workflows/publicar.yml` | Cada día y en cada cambio: baja el último release web oficial, arma el sitio y lo publica en GitHub Pages |
| `scripts/descargar_web.py` | Baja `pdfcraft-web-<versión>.zip` del release oficial y verifica su tamaño y su SHA-256 |
| `scripts/preparar.py` | Agrega al build oficial (sin modificarlo) la interfaz móvil, el manifiesto, los íconos y el service worker |
| `plantilla/index.html`, `movil.css`, `movil.js` | Interfaz de celular estilo Acrobat móvil usando la API de página (`?control`) y modo anfitrión (`data-host="page"`) |
| `plantilla/gestos.js` | Gestos táctiles de iOS (inercia, pellizco, doble toque, modo inmersivo, paso de página, teclado al primer toque y selección) |
| `plantilla/scanner.js` | Escáner local y creador de PDF multipágina desde fotos o cámara con rotación y filtros |
| `plantilla/iphone.js` | Pantalla de carga, actualizaciones automáticas y hoja de compartir de iOS |
| `plantilla/sw.js` | Service worker: funcionamiento sin conexión y limpieza automática de caché |

El build de PdfCraft que se publica es el oficial, sin cambios. Este repositorio no está afiliado
a PdfCraft ni a ArtCraft ni a Adobe. PdfCraft y su ícono se distribuyen bajo MIT o Apache-2.0
(`assets/LICENSE.txt`).
