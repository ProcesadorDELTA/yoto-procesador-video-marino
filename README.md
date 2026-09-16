# Procesar vídeo submarino — prototipo YOTO

Prototipo web independiente para extraer y revisar fotogramas de vídeos submarinos cortos antes de incorporarlos al flujo de identificación de YOTO.

## Funciones incluidas

- Selección o arrastre de vídeos MP4, MOV y WebM.
- Límite configurable de 300 MB y 15 minutos.
- Extracción de fotogramas en el propio navegador.
- Filtro de luminosidad, nitidez y duplicados visuales.
- Vista completa de todas las capturas obtenidas con el intervalo elegido.
- Selección inteligente de capturas destacadas mediante calidad y cambio visual.
- Priorización de peces y otros organismos cuando se configura un detector marino.
- Selector entre procesamiento local privado e IA marina mediante un endpoint seguro.
- Intervalos predefinidos o personalizados entre 0,1 y 60 segundos.
- Revisión manual: aceptar o descartar.
- Exportación ZIP con imágenes, CSV y, opcionalmente, el frame anterior y posterior a cada selección.
- Adaptación para móvil y escritorio.
- Punto de conexión configurable para un detector marino en servidor.

El prototipo no sube el vídeo a ningún servidor. Esto permite probar la experiencia sin costes de almacenamiento. Para usar FathomNet en producción se debe conectar el endpoint descrito en `INTEGRACION_YOTO.md`.

## Probar localmente

Puedes abrir `index.html` directamente en Chrome, Edge o Firefox. Si el navegador limita alguna función local, sirve esta carpeta con `python -m http.server 8000` y abre `http://localhost:8000`.

También puede publicarse tal cual en GitHub Pages: no requiere compilación ni dependencias. El vídeo se procesa en el portátil; solo se envían fotogramas si se configura expresamente `detectorEndpoint`.

## Conectar una IA marina

En la interfaz, selecciona **IA marina · mediante servicio seguro** e introduce la URL HTTPS del servicio. La aplicación envía cada fotograma válido como `multipart/form-data` y espera la respuesta descrita en `INTEGRACION_YOTO.md`.

No introduzcas claves de OpenAI, Hugging Face u otros proveedores en el navegador ni en `config.js`. La clave debe permanecer como secreto en un servicio backend. Esta web no puede conectarse directamente a la sesión de Codex o ChatGPT.

## Archivos que se integran

- `index.html`: estructura de la sección.
- `styles.css`: diseño adaptable.
- `app.js`: procesamiento y revisión.
- `config.js`: límites, FPS asumidos y URL del detector.
