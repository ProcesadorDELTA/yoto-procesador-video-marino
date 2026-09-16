# Guía de integración en YOTO

## 1. Alcance del prototipo

La versión entregada funciona enteramente en el navegador. Lee el vídeo seleccionado, toma fotogramas, mide su calidad, elimina imágenes demasiado parecidas y genera un ZIP. El archivo original no sale del dispositivo.

La marca **Captura destacada** procede de una comparación de calidad y cambios entre fotogramas. No equivale a una identificación biológica y siempre requiere revisión humana.

## 2. Conectar el detector marino

En `dist/config.js`, asignar la URL del servicio:

```js
window.YOTO_VIDEO_CONFIG = {
  detectorEndpoint: "/api/video/detect-frame",
  yotoUploadEndpoint: "/api/video/import-frame",
  maxFileSizeMB: 300,
  maxDurationSeconds: 900,
  maxFrames: 240,
  assumedFramesPerSecond: 30
};
```

El navegador enviará una petición `POST multipart/form-data` por cada fotograma que supere los filtros locales:

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

## 3. Servicio recomendado

El endpoint puede implementarse como un servicio Python separado del núcleo de YOTO:

1. FastAPI recibe el JPEG.
2. ONNX Runtime ejecuta el modelo FathomNet exportado a ONNX.
3. Se filtran detecciones por confianza mínima.
4. Se devuelve únicamente JSON; el servicio no necesita conservar la imagen.

Separarlo permite actualizar el modelo sin modificar la aplicación principal. Para vídeos cortos puede funcionar con CPU y una cola sencilla. Si aumenta el volumen, conviene agrupar varios fotogramas en una petición.

### Alternativa gratuita en el ordenador del usuario

El modo **Mi IA local · Ollama** llama directamente a `POST http://localhost:11434/api/generate`, enviando cada JPEG como imagen base64 y solicitando JSON estructurado. El botón de comprobación consulta `GET /api/tags`. El usuario puede escoger cualquier modelo visual instalado; el valor inicial es `gemma3:4b`.

Como la página se publica en otro origen, Ollama debe autorizar `https://procesadordelta.github.io` mediante `OLLAMA_ORIGINS`. Este modo no reutiliza una sesión de ChatGPT ni accede a cuentas: ejecuta un modelo local, sin claves y sin coste por llamada. Las propuestas siguen requiriendo validación humana.

## 4. Integración con el etiquetado existente

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

## 5. Privacidad y límites

- El prototipo no almacena vídeos ni imágenes.
- En la integración, puede conservarse únicamente cada fotograma aceptado.
- Si YOTO recibe vídeos completos, se recomienda borrarlos automáticamente tras el procesamiento.
- Los límites se encuentran en `config.js` y también deben validarse en el servidor.

## 6. Decisiones pendientes para producción

- Tecnología actual del backend de YOTO.
- Sistema de usuarios y permisos.
- Endpoint existente para crear imágenes de etiquetado.
- Ubicación del servicio de detección.
- Modelo FathomNet definitivo y umbral de confianza tras probar vídeos de La Palma.
