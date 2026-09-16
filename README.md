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
- Priorización de peces y otros organismos cuando se configura un detector marino.
- Selección visual privada, revisión sencilla con ChatGPT, Gemini o Claude e IA marina mediante un endpoint seguro.
- Intervalos predefinidos o personalizados entre 0,1 y 60 segundos.
- Revisión manual: aceptar o descartar.
- Exportación ZIP con imágenes, CSV y, opcionalmente, el frame anterior y posterior a cada selección.
- Adaptación para móvil y escritorio.
- Punto de conexión configurable para un detector marino y para enviar las capturas aceptadas a YOTO.

El prototipo no sube el vídeo a ningún servidor. Esto permite probar la experiencia sin costes de almacenamiento. Para usar FathomNet en producción se debe conectar el endpoint descrito en `INTEGRACION_YOTO.md`.

## Probar localmente

Puedes abrir `index.html` directamente en Chrome, Edge o Firefox. Si el navegador limita alguna función local, sirve esta carpeta con `python -m http.server 8000` y abre `http://localhost:8000`.

También puede publicarse tal cual en GitHub Pages: no requiere compilación ni dependencias. El vídeo se procesa en el portátil; solo se envían fotogramas si se configura expresamente `detectorEndpoint`.

## Revisar capturas con la IA habitual

La opción más sencilla no requiere instalación ni clave API: el usuario acepta las mejores capturas, descarga y descomprime el ZIP, copia la instrucción preparada y abre directamente ChatGPT, Gemini o Claude desde la propia página. Después adjunta los JPG y pega la instrucción.

La web no accede a la cuenta del usuario ni comparte credenciales. Cada aplicación aplica sus propios límites y condiciones de privacidad. La identificación de un modelo generalista es orientativa y siempre debe validarse por una persona.

Cuando el navegador lo permite, **Compartir capturas con una aplicación** abre el menú nativo de macOS, Windows o móvil con las imágenes aceptadas y la instrucción. Los destinos disponibles dependen del dispositivo; si la IA utilizada no aparece, se mantiene la descarga ZIP y los accesos directos.

El filtro sin IA no identifica especies: compara zonas del fotograma para favorecer cambios localizados frente a movimientos que afectan a toda la imagen. Puede confundir peces con algas, partículas, reflejos o movimiento de cámara, y puede omitir organismos inmóviles.

## Conectar una IA marina

En la interfaz, selecciona **IA marina · mediante servicio seguro** e introduce la URL HTTPS del servicio. La aplicación envía cada fotograma válido como `multipart/form-data` y espera la respuesta descrita en `INTEGRACION_YOTO.md`.

No introduzcas claves de OpenAI, Google, Anthropic u otros proveedores en el navegador ni en `config.js`. Una integración automática por API debe guardar la clave como secreto en un servicio backend. La versión estática abre las aplicaciones oficiales sin acceder a la sesión del usuario.

## Enviar capturas a YOTO

Configura `yotoUploadEndpoint` en `config.js`. Entonces aparecerá **Enviar capturas a YOTO** y se enviarán, tras la aprobación del usuario, las imágenes aceptadas con el vídeo de origen, tiempo, calidad y detecciones. El endpoint definitivo debe aplicar la sesión y los permisos de YOTO.

## Archivos que se integran

- `index.html`: estructura de la sección.
- `styles.css`: diseño adaptable.
- `app.js`: procesamiento y revisión.
- `config.js`: límites, FPS asumidos y URL del detector.
