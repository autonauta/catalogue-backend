# 🖼️ API de Galería de Imágenes - Exodus

Sistema de galería automática con compresión WebP, auto-rotación y límite de 1000 imágenes.

## 📋 **Configuración del Sistema**

- **Ruta de almacenamiento**: `/var/www/exodustribe.com/public_html/files/galery`
- **Formato de salida**: WebP (compresión automática)
- **Límite de imágenes**: 1000
- **Tamaño máximo por archivo**: 10MB
- **Formatos soportados**: JPEG, PNG, GIF, BMP, WebP
- **Calidad WebP**: 60% (ajustable automáticamente hasta 20%)
- **Tamaño máximo por imagen**: 1MB

## 🚀 **Rutas Disponibles**

### **1. Subir Imágenes**
**POST** `/api/v1/exodus/gallery/upload`

**Content-Type**: `multipart/form-data`

**Body**:
```
images: File[] (máximo 10 archivos)
event_id: string (ID del evento, requerido)
```

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "message": "Procesadas 2 imágenes exitosamente, 1 duplicadas, 0 errores",
  "results": [
    {
      "success": true,
      "image": {
        "id": "string",
        "filename": "string",
        "path": "files/galery/imagen.webp",
        "url": "/files/galery/imagen.webp",
        "upload_date": "2024-01-01T00:00:00.000Z",
        "file_size": 123456,
        "original_size": 234567,
        "compression_percentage": 47,
        "dimensions": {
          "width": 1920,
          "height": 1080
        },
        "format": "webp",
        "quality": 85,
        "is_compressed": true,
        "order": 1,
        "event_id": "64f1a2b3c4d5e6f7g8h9i0j1"
      },
      "compression": {
        "originalSize": 234567,
        "compressedSize": 123456,
        "compressionRatio": 47,
        "dimensions": {
          "width": 1920,
          "height": 1080
        }
      }
    },
    {
      "success": false,
      "duplicate": true,
      "filename": "imagen_duplicada.jpg",
      "existingImage": {
        "id": "string",
        "filename": "string",
        "upload_date": "2024-01-01T00:00:00.000Z"
      },
      "message": "La imagen \"imagen_duplicada.jpg\" ya existe en este evento"
    }
  ],
  "errors": [],
  "cleanup": {
    "deleted": 5,
    "files": [
      {
        "id": "string",
        "filename": "string",
        "path": "string"
      }
    ]
  },
  "stats": {
    "totalProcessed": 3,
    "successful": 2,
    "duplicates": 1,
    "errors": 0,
    "imagesDeleted": 5
  }
}
```

**Respuesta de error (400)**:
```json
{
  "error": true,
  "message": "No se recibieron archivos de imagen"
}
```

**Respuesta de error (400) - event_id faltante**:
```json
{
  "error": true,
  "message": "El event_id es requerido"
}
```

### **2. Obtener Imágenes**
**GET** `/api/v1/exodus/gallery/images`

**Parámetros de consulta**:
- `limit`: number (1-100, opcional)
- `skip`: number (0+, opcional)
- `event_id`: string (ID del evento para filtrar, opcional)

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "images": [
    {
      "id": "string",
      "filename": "string",
      "path": "files/galery/imagen.webp",
      "url": "/files/galery/imagen.webp",
      "upload_date": "2024-01-01T00:00:00.000Z",
      "file_size": 123456,
      "original_size": 234567,
      "compression_percentage": 47,
      "dimensions": {
        "width": 1920,
        "height": 1080
      },
      "format": "webp",
      "quality": 85,
        "is_compressed": true,
        "order": 1,
        "event_id": "64f1a2b3c4d5e6f7g8h9i0j1"
      }
    ],
  "pagination": {
    "limit": 50,
    "skip": 0,
    "total": 25
  }
}
```

### **3. Estadísticas de la Galería**
**GET** `/api/v1/exodus/gallery/stats`

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "stats": {
    "totalImages": 150,
    "maxImages": 1000,
    "remainingSlots": 850,
    "totalSize": 12345678,
    "formatDistribution": [
      {
        "_id": "webp",
        "count": 150
      }
    ],
    "averageCompression": 45.2
  }
}
```

### **4. Limpieza Manual**
**DELETE** `/api/v1/exodus/gallery/cleanup`

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "message": "Limpieza completada: 5 imágenes eliminadas",
  "cleanup": {
    "deleted": 5,
    "files": [
      {
        "id": "string",
        "filename": "string",
        "path": "string"
      }
    ]
  }
}
```

### **5. Eliminar Imagen Específica**
**DELETE** `/api/v1/exodus/gallery/images/:id`

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "message": "Imagen eliminada exitosamente",
  "deletedImage": {
    "id": "string",
    "filename": "string",
    "path": "files/galery/imagen.webp",
    "url": "/files/galery/imagen.webp",
    "upload_date": "2024-01-01T00:00:00.000Z",
    "file_size": 123456,
    "original_size": 234567,
    "compression_percentage": 47,
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "format": "webp",
    "quality": 85,
    "is_compressed": true,
    "order": 1
  }
}
```

### **6. Configuración de la Galería**
**GET** `/api/v1/exodus/gallery/config`

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "config": {
    "maxImages": 1000,
    "maxFileSize": 10485760,
    "supportedFormats": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"],
    "webpQuality": 85,
    "serverPath": "/var/www/exodustribe.com/public_html/files/galery",
    "frontendPath": "files/galery"
  }
}
```

## 🔧 **Características del Sistema**

### **Compresión Automática**
- Todas las imágenes se convierten a WebP
- Calidad configurable (por defecto 85%)
- Compresión promedio: 40-60% de reducción de tamaño
- Preserva dimensiones originales

### **Auto-rotación**
- Límite automático de 1000 imágenes
- Elimina las más antiguas cuando se alcanza el límite
- Orden por fecha de subida (más recientes primero)

### **Metadatos Completos**
- Tamaño original vs comprimido
- Porcentaje de compresión
- Dimensiones (ancho x alto)
- Fecha de subida
- Formato y calidad

### **Gestión de Errores**
- Validación de formatos soportados
- Límite de tamaño por archivo (10MB)
- Límite de archivos por request (10)
- Limpieza automática de archivos temporales

## 📱 **Uso en Frontend**

### **Subir Imágenes**
```javascript
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);
formData.append('event_id', '64f1a2b3c4d5e6f7g8h9i0j1'); // ID del evento

fetch('/api/v1/exodus/gallery/upload', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Imágenes subidas:', data.results);
  console.log('Imágenes eliminadas:', data.cleanup);
});
```

### **Obtener Imágenes**
```javascript
// Obtener todas las imágenes
fetch('/api/v1/exodus/gallery/images?limit=50&skip=0')
.then(response => response.json())
.then(data => {
  data.images.forEach(image => {
    const img = document.createElement('img');
    img.src = image.url;
    img.alt = image.filename;
    document.body.appendChild(img);
  });
});

// Obtener imágenes de un evento específico
fetch('/api/v1/exodus/gallery/images?event_id=64f1a2b3c4d5e6f7g8h9i0j1')
.then(response => response.json())
.then(data => {
  console.log('Imágenes del evento:', data.images);
});
```

### **Mostrar Estadísticas**
```javascript
fetch('/api/v1/exodus/gallery/stats')
.then(response => response.json())
.then(data => {
  console.log(`Imágenes: ${data.stats.totalImages}/${data.stats.maxImages}`);
  console.log(`Espacio restante: ${data.stats.remainingSlots}`);
  console.log(`Compresión promedio: ${data.stats.averageCompression}%`);
});
```

## ⚠️ **Notas Importantes**

1. **Rutas de archivos**: Los paths en la base de datos son relativos (`files/galery/imagen.webp`)
2. **URLs del frontend**: Usar `image.url` para mostrar las imágenes
3. **Auto-limpieza**: Se ejecuta automáticamente al subir imágenes
4. **Formato WebP**: Todas las imágenes se convierten a WebP para mejor rendimiento
5. **Orden**: Las imágenes se ordenan por fecha de subida (más recientes primero)
6. **Event ID**: Todas las imágenes deben estar asociadas a un evento específico
7. **Filtrado**: Se puede filtrar por evento usando el parámetro `event_id` en GET

## 🚨 **Códigos de Error**

- **400**: Datos inválidos, archivos no soportados, límites excedidos
- **404**: Imagen no encontrada
- **500**: Error interno del servidor, problemas de compresión

---

**Sistema desarrollado por HighData** 🚀
