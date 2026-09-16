# Procesador de Vídeo Submarino — prototipo YOTO

Prototipo web independiente para extraer y revisar fotogramas de vídeos submarinos cortos antes de incorporarlos al flujo de identificación de YOTO.

## Funciones incluidas

- Selección o arrastre de vídeos MP4, MOV y WebM.
- Límite configurable de 300 MB y 15 minutos.
- Extracción de fotogramas en el propio navegador.
- Filtro de luminosidad, nitidez y duplicados visuales.
- Vista completa de todas las capturas obtenidas con el intervalo elegido.
- Selección inteligente de capturas destacadas mediante calidad y cambio visual.
- Priorización de peces y otros organismos cuando se configura un detector marino.
- Tres modos: selección visual privada, IA local del usuario mediante Ollama e IA marina mediante un endpoint seguro.
- Intervalos predefinidos o personalizados entre 0,1 y 60 segundos.
- Revisión manual: aceptar o descartar.
- Exportación ZIP con imágenes, CSV y, opcionalmente, el frame anterior y posterior a cada selección.
- Adaptación para móvil y escritorio.
- Punto de conexión configurable para un detector marino y para enviar las capturas aceptadas a YOTO.

El prototipo no sube el vídeo a ningún servidor. Esto permite probar la experiencia sin costes de almacenamiento. Para usar FathomNet en producción se debe conectar el endpoint descrito en `INTEGRACION_YOTO.md`.

## Probar localmente

Puedes abrir `index.html` directamente en Chrome, Edge o Firefox. Si el navegador limita alguna función local, sirve esta carpeta con `python -m http.server 8000` y abre `http://localhost:8000`.

También puede publicarse tal cual en GitHub Pages: no requiere compilación ni dependencias. El vídeo se procesa en el portátil; solo se envían fotogramas si se configura expresamente `detectorEndpoint`.

## Usar la IA instalada en el ordenador

Selecciona **Mi IA local · Ollama**. La interfaz usa la API local de Ollama en `http://localhost:11434`, comprueba los modelos instalados y envía únicamente las capturas válidas al modelo visual elegido. No requiere clave ni servicio de pago.

1. Instala Ollama en macOS o Windows.
2. Ejecuta `ollama pull gemma3:4b`.
3. Añade `https://procesadordelta.github.io` a `OLLAMA_ORIGINS` y reinicia Ollama para permitir la conexión desde GitHub Pages.
4. Pulsa **Comprobar conexión** antes de procesar.

La identificación de un modelo generalista es orientativa y siempre debe validarse por una persona. El modo manual **Usar otra IA sin conectar cuentas** sigue disponible para usuarios que prefieran adjuntar el ZIP en su aplicación habitual.

## Conectar una IA marina

En la interfaz, selecciona **IA marina · mediante servicio seguro** e introduce la URL HTTPS del servicio. La aplicación envía cada fotograma válido como `multipart/form-data` y espera la respuesta descrita en `INTEGRACION_YOTO.md`.

No introduzcas claves de OpenAI, Hugging Face u otros proveedores en el navegador ni en `config.js`. La clave debe permanecer como secreto en un servicio backend. Esta web no puede conectarse directamente a la sesión de Codex o ChatGPT.

## Enviar capturas a YOTO

Configura `yotoUploadEndpoint` en `config.js`. Entonces aparecerá **Enviar capturas a YOTO** y se enviarán, tras la aprobación del usuario, las imágenes aceptadas con el vídeo de origen, tiempo, calidad y detecciones. El endpoint definitivo debe aplicar la sesión y los permisos de YOTO.

## Archivos que se integran

- `index.html`: estructura de la sección.
- `styles.css`: diseño adaptable.
- `app.js`: procesamiento y revisión.
- `config.js`: límites, FPS asumidos y URL del detector.
