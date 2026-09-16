# Procesador de Vídeo Submarino — prototipo YOTO

Prototipo web independiente para extraer y revisar fotogramas de vídeos submarinos cortos antes de incorporarlos al flujo de identificación de YOTO.

## Funciones incluidas

- Selección o arrastre de vídeos MP4, MOV y WebM.
- Límite configurable de 300 MB y 15 minutos.
- Extracción de fotogramas en el propio navegador.
- Filtro de luminosidad, nitidez y duplicados visuales.
- Filtro experimental sin IA que prioriza movimiento localizado y formas nítidas como indicio de posible fauna.
- Vista completa de todas las capturas obtenidas con el intervalo elegido.
- Selección inteligente de capturas destacadas mediante calidad y cambio visual.
- Priorización de peces y otros organismos mediante filtro local, Gemini, OpenAI o Claude con clave propia, o un detector institucional configurado por YOTO.
- Selección visual privada y revisión sencilla con ChatGPT, Gemini o Claude.
- Intervalos predefinidos o personalizados entre 0,1 y 60 segundos.
- Revisión manual: aceptar o descartar.
- Exportación ZIP con imágenes, CSV y, opcionalmente, el frame anterior y posterior a cada selección.
- Adaptación para móvil y escritorio.
- Selector sencillo para pegar una clave API propia de Gemini, OpenAI o Claude, que solo permanece en la memoria de la pestaña.
- Mensajes explicativos al pasar el cursor o enfocar los indicadores de calidad y cambio visual.
- Elección independiente de 0 a 10 frames anteriores y posteriores por cada captura aceptada.
- Punto de conexión configurable para un futuro detector institucional y para enviar las capturas aceptadas a YOTO.

El prototipo no sube el vídeo a ningún servidor. Esto permite probar la experiencia sin costes de almacenamiento. Para usar FathomNet en producción se debe conectar el endpoint descrito en `INTEGRACION_YOTO.md`.

## Probar localmente

Puedes abrir `index.html` directamente en Chrome, Edge o Firefox. Si el navegador limita alguna función local, sirve esta carpeta con `python -m http.server 8000` y abre `http://localhost:8000`.

También puede publicarse tal cual en GitHub Pages: no requiere compilación ni dependencias. El vídeo se procesa en el portátil; solo se envían fotogramas si se configura expresamente `detectorEndpoint`.

## Revisar capturas con la IA habitual

La opción más sencilla no requiere instalación ni clave API: el usuario acepta las mejores capturas, descarga y descomprime el ZIP, copia la instrucción preparada y abre directamente ChatGPT, Gemini o Claude desde la propia página. Después adjunta los JPG y pega la instrucción.

La web no accede a la cuenta del usuario ni comparte credenciales. Cada aplicación aplica sus propios límites y condiciones de privacidad. La identificación de un modelo generalista es orientativa y siempre debe validarse por una persona.

Cuando el navegador lo permite, **Compartir capturas con una aplicación** abre el menú nativo de macOS, Windows o móvil con las imágenes aceptadas y la instrucción. Los destinos disponibles dependen del dispositivo; si la IA utilizada no aparece, se mantiene la descarga ZIP y los accesos directos.

El filtro sin IA no identifica especies: compara zonas del fotograma para favorecer cambios localizados frente a movimientos que afectan a toda la imagen. Puede confundir peces con algas, partículas, reflejos o movimiento de cámara, y puede omitir organismos inmóviles.

## Análisis automático con Gemini, OpenAI o Claude

En la interfaz, selecciona el proveedor, pega una clave API propia y procesa el vídeo. Primero se aplica el filtro local; solo las capturas candidatas se envían al proveedor elegido. La clave no se guarda en `localStorage`, cookies, descargas ni archivos del proyecto y desaparece al cerrar o recargar la pestaña.

Esta conexión directa está pensada para una prueba voluntaria con una clave del propio usuario. Una suscripción a ChatGPT, Gemini o Claude no implica necesariamente disponer de acceso API. El uso puede estar sujeto a límites o costes del proveedor. En producción, YOTO debería guardar cualquier credencial institucional como secreto en su backend. La versión estática también abre las aplicaciones oficiales sin acceder a la sesión del usuario.

El campo técnico **URL del servicio de IA** se ha eliminado de la interfaz. Si el equipo de desarrollo configura `detectorEndpoint` en `config.js`, aparecerá automáticamente la opción **Detector marino de YOTO** sin pedir al usuario direcciones ni credenciales técnicas.

## Enviar capturas a YOTO

Configura `yotoUploadEndpoint` en `config.js`. Entonces aparecerá **Enviar capturas a YOTO** y se enviarán, tras la aprobación del usuario, las imágenes aceptadas con el vídeo de origen, tiempo, calidad y detecciones. El endpoint definitivo debe aplicar la sesión y los permisos de YOTO.

## Archivos que se integran

- `index.html`: estructura de la sección.
- `styles.css`: diseño adaptable.
- `app.js`: procesamiento y revisión.
- `config.js`: límites, FPS asumidos y URL del detector.
