# Sistema de Múltiples Versiones de Imágenes en la Galería

## Descripción General

El sistema de galería ahora genera automáticamente **2 versiones** de cada imagen subida para optimizar el rendimiento y la experiencia del usuario:

1. **Thumbnail** (máximo 200px) - Para vistas previas y listados
2. **Original Comprimida** - Alta calidad manteniendo dimensiones originales

## Versiones Generadas

### 1. Thumbnail (`_thumb.webp`)
- **Dimensiones**: Máximo 200px en el lado más largo, manteniendo proporción original
- **Calidad**: 30% (compresión máxima)
- **Uso**: Vistas previas, listados de galería, carga rápida
- **Tamaño típico**: 5-15 KB

### 2. Original Comprimida (`_orig.webp`)
- **Dimensiones**: Mismas que la imagen original
- **Calidad**: 85% (alta calidad)
- **Uso**: Visualización individual, descarga, impresión, galería principal
- **Tamaño típico**: 500KB - 2MB

## API Endpoints

### Subir Imágenes
```http
POST /gallery/upload
Content-Type: multipart/form-data

{
  "images": [archivos],
  "event_id": "event_id_aqui"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Procesadas 1 imágenes exitosamente, 0 duplicadas, 0 errores",
  "results": [
    {
      "success": true,
      "image": {
        "id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "filename": "1699123456789_abc123_comp.webp",
        "versions": {
          "thumbnail": {
            "filename": "1699123456789_abc123_thumb.webp",
            "path": "files/galery/1699123456789_abc123_thumb.webp",
            "size": 12543,
            "dimensions": { "width": 200, "height": 200 }
          },
          "original_compressed": {
            "filename": "1699123456789_abc123_orig.webp",
            "path": "files/galery/1699123456789_abc123_orig.webp",
            "size": 1234567,
            "dimensions": { "width": 1920, "height": 1440 },
            "quality": 85
          }
        }
      }
    }
  ]
}
```

### Obtener Imagen Específica

#### Thumbnail
```http
GET /gallery/image/{image_id}/thumbnail
```

#### Versión Original Comprimida (por defecto)
```http
GET /gallery/image/{image_id}/original
GET /gallery/image/{image_id}  // Por defecto usa 'original'
```

### Obtener Lista de Imágenes
```http
GET /gallery/images?event_id=event_id_aqui&limit=20&skip=0
```

### Eliminar Todas las Imágenes
```http
DELETE /gallery/all
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Eliminadas 25 imágenes exitosamente, 0 errores",
  "result": {
    "success": true,
    "deleted": 25,
    "errors": 0,
    "files": [
      {
        "id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "filename": "1699123456789_abc123_orig.webp",
        "path": "files/galery/1699123456789_abc123_orig.webp",
        "filesDeleted": [
          "1699123456789_abc123_thumb.webp",
          "1699123456789_abc123_orig.webp"
        ],
        "totalFiles": 2
      }
    ]
  }
}
```

**Respuesta:**
```json
{
  "success": true,
  "images": [
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "filename": "1699123456789_abc123_comp.webp",
        "versions": {
          "thumbnail": { /* ... */ },
          "original_compressed": { /* ... */ }
        }
    }
  ]
}
```

## Estructura de Archivos

Cada imagen subida genera 2 archivos:

```
/var/www/exodustribe.com/public_html/files/galery/
├── 1699123456789_abc123_thumb.webp    # Thumbnail (máximo 200px)
└── 1699123456789_abc123_orig.webp     # Original comprimida
```

## Casos de Uso

### Frontend - Lista de Galería
```javascript
// Usar thumbnails para carga rápida
const thumbnailUrl = `/gallery/image/${imageId}/thumbnail`;
```

### Frontend - Vista de Galería y Individual
```javascript
// Usar versión original comprimida para navegación y visualización
const originalUrl = `/gallery/image/${imageId}/original`;
```

### Frontend - Descarga
```javascript
// Permitir descarga de versión original comprimida
const downloadUrl = `/gallery/image/${imageId}/original`;
```

## Optimizaciones Implementadas

1. **Generación en Paralelo**: Las 2 versiones se generan simultáneamente usando `Promise.all()`
2. **Compresión Inteligente**: Ajusta la calidad automáticamente para alcanzar el tamaño objetivo
3. **Cache Headers**: Las imágenes se sirven con headers de cache apropiados
4. **Limpieza Automática**: Elimina ambas versiones cuando se borra una imagen
5. **Verificación de Duplicados**: Evita procesar imágenes duplicadas antes de la compresión

## Configuración

```javascript
const GALLERY_CONFIG = {
  MAX_IMAGES: 1000,
  MAX_IMAGE_SIZE: 1024 * 1024, // 1MB para versión comprimida
  WEBP_QUALITY: 60, // Calidad base
  THUMBNAIL_SIZE: 200, // Dimensiones del thumbnail
  ORIGINAL_QUALITY: 85 // Calidad de la versión original
};
```

## Beneficios

1. **Carga Rápida**: Thumbnails pequeños para listados
2. **Calidad Adaptativa**: Diferentes versiones según el contexto
3. **Ancho de Banda Optimizado**: Usuarios móviles obtienen versiones más pequeñas
4. **Experiencia Mejorada**: Carga progresiva de imágenes
5. **Almacenamiento Eficiente**: Compresión optimizada para cada uso
