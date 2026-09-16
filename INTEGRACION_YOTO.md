# Guía de integración en YOTO

## 1. Alcance del prototipo

La versión entregada funciona enteramente en el navegador. Lee el vídeo seleccionado, toma fotogramas, mide su calidad, elimina imágenes demasiado parecidas y genera un ZIP. El archivo original no sale del dispositivo.

La marca **Captura destacada** procede de una comparación de calidad y cambios entre fotogramas. No equivale a una identificación biológica y siempre requiere revisión humana.

La opción **Buscar movimiento localizado y formas destacadas** divide la imagen de análisis en una cuadrícula y favorece cambios concentrados en pocas zonas, combinados con nitidez suficiente. Es un filtro clásico de imagen, no un reconocimiento de especies. El movimiento de cámara, las algas y las partículas pueden producir falsos positivos, mientras que los organismos inmóviles pueden pasar inadvertidos.

## 2. Modalidades de análisis disponibles

La interfaz presenta dos opciones comprensibles para el público:

1. **Selección local privada:** no utiliza IA ni envía imágenes. Prioriza nitidez, diferencias visuales y movimiento localizado.
2. **Analizar con Gemini, OpenAI o Claude:** el usuario elige un proveedor y pega su propia clave API. La clave permanece únicamente en la memoria de la pestaña; no se guarda en cookies, almacenamiento local, archivos ni descargas. El filtro local reduce previamente las capturas que se envían.

Además, el usuario puede aceptar capturas, descargarlas o compartirlas y abrir ChatGPT, Gemini o Claude para realizar una revisión manual con su cuenta habitual.

## 3. Conectar en el futuro un detector institucional de YOTO

En `dist/config.js`, asignar la URL del servicio:

```js
window.YOTO_VIDEO_CONFIG = {
  detectorEndpoint: "/api/video/detect-frame",
  yotoUploadEndpoint: "/api/video/import-frame",
  geminiModel: "gemini-2.5-flash",
  openaiModel: "gpt-5.6-terra",
  claudeModel: "claude-sonnet-5",
  maxFileSizeMB: 300,
  maxDurationSeconds: 900,
  maxFrames: 240,
  assumedFramesPerSecond: 30
};
```

Cuando `detectorEndpoint` tiene valor, la interfaz añade automáticamente **Detector marino de YOTO**. El usuario no tiene que introducir una URL. El navegador enviará una petición `POST multipart/form-data` por cada fotograma candidato que supere los filtros locales:

| Campo | Tipo | Contenido |
| --- | --- | --- |
| `frame` | archivo JPEG | Fotograma con anchura máxima de 1280 px |
| `timestamp_seconds` | número como texto | Segundo de origen dentro del vídeo |

Respuesta esperada:

```json
{
  "detections": [
    {
      "label": "organism",
      "confidence": 0.81,
      "bbox": [0.18, 0.24, 0.46, 0.63]
    }
  ]
}
```

`bbox` usa coordenadas normalizadas `[x1, y1, x2, y2]`. La interfaz prioriza etiquetas de organismos marinos (peces, tiburones, rayas, crustáceos, moluscos, tortugas, cetáceos, coral, etc.) y muestra la etiqueta con su confianza. Las demás detecciones se ignoran para evitar proponer objetos no biológicos.

`assumedFramesPerSecond` se usa para calcular los frames de contexto inmediatamente anterior y posterior (`±1/fps`). Debe ajustarse a 25, 30, 50 o 60 según los vídeos de la campaña para máxima precisión.

## 4. Servicio institucional recomendado

El endpoint puede implementarse como un servicio Python separado del núcleo de YOTO:

1. FastAPI recibe el JPEG.
2. ONNX Runtime ejecuta el modelo FathomNet exportado a ONNX.
3. Se filtran detecciones por confianza mínima.
4. Se devuelve únicamente JSON; el servicio no necesita conservar la imagen.

Separarlo permite actualizar el modelo sin modificar la aplicación principal. Para vídeos cortos puede funcionar con CPU y una cola sencilla. Si aumenta el volumen, conviene agrupar varios fotogramas en una petición.

### Alternativa sencilla con la IA del usuario

Tras seleccionar y descargar los fotogramas, la interfaz permite copiar una instrucción especializada y abrir directamente ChatGPT, Gemini o Claude. El usuario descomprime el ZIP, adjunta los JPG y pega la instrucción. Este flujo evita instalaciones, problemas de conexión local y exposición de claves API.

En navegadores compatibles, la Web Share API permite compartir directamente hasta 20 capturas aceptadas con una aplicación instalada o servicio ofrecido por el sistema. Como los destinos dependen del dispositivo y del navegador, esta función es complementaria y no sustituye a la descarga ZIP.

La demostración permite una clave propia de Gemini, OpenAI o Claude exclusivamente en memoria para facilitar la prueba. No debe incorporarse una clave institucional en `config.js` ni en el repositorio. Si YOTO requiere automatización estable, las llamadas deben realizarse desde un backend propio que almacene las credenciales como secretos, controle costes y aplique las condiciones de protección de datos. Las propuestas de identificación siempre requieren validación humana.

## 5. Integración con el etiquetado existente

En producción, al configurar `yotoUploadEndpoint`, aparece **Enviar capturas a YOTO**. El frontend envía solo los fotogramas aceptados como `multipart/form-data`, con los campos `image`, `source_video_name`, `timestamp_seconds`, `quality_score` y `detections`.

```json
{
  "source_video_name": "campana_delta_01.mp4",
  "timestamp_seconds": 43.5,
  "quality_score": 78,
  "detector_model": "fathomnet-megalodon",
  "detections": []
}
```

Cada imagen debería crearse como un registro pendiente de identificación y vincularse al usuario autenticado. La versión de demostración deja el endpoint vacío hasta que el equipo de YOTO indique la ruta y su contrato. Se recomienda mantener la validación humana incluso cuando el detector devuelva una categoría.

## 6. Privacidad y límites

- El prototipo no almacena vídeos ni imágenes.
- La clave API introducida por el usuario no se persiste y se elimina al cerrar o recargar la pestaña.
- En modo automático, únicamente se envían al proveedor elegido las capturas candidatas; deben revisarse sus condiciones de privacidad y uso.
- En la integración, puede conservarse únicamente cada fotograma aceptado.
- Si YOTO recibe vídeos completos, se recomienda borrarlos automáticamente tras el procesamiento.
- Los límites se encuentran en `config.js` y también deben validarse en el servidor.

## 7. Decisiones pendientes para producción

- Tecnología actual del backend de YOTO.
- Sistema de usuarios y permisos.
- Endpoint existente para crear imágenes de etiquetado.
- Ubicación del servicio de detección.
- Modelo FathomNet definitivo y umbral de confianza tras probar vídeos de La Palma.
