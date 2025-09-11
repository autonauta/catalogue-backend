# Sistema de Manejo de Archivos para Eventos

## 📁 Estructura de Archivos

### Ruta de Almacenamiento
```
/var/www/exodustribe.com/public_html/files/events/
├── nombre-evento-1/
│   ├── imagen-principal-1234567890.jpg
│   ├── imagen-secundaria-1234567891.jpg
│   └── imagen-terciaria-1234567892.jpg
├── nombre-evento-2/
│   ├── imagen-principal-1234567893.jpg
│   └── imagen-secundaria-1234567894.jpg
└── ...
```

### URLs de Acceso
Las imágenes son accesibles desde el sitio web usando URLs como:
- `https://exodustribe.com/files/events/nombre-evento-1/imagen-principal-1234567890.jpg`
- `https://exodustribe.com/files/events/nombre-evento-1/imagen-secundaria-1234567891.jpg`
- `https://exodustribe.com/files/events/nombre-evento-1/imagen-terciaria-1234567892.jpg`

### Rutas en Base de Datos
Las rutas se guardan en la base de datos como rutas relativas desde `public_html`:
- `files/events/nombre-evento-1/imagen-principal-1234567890.jpg`
- `files/events/nombre-evento-1/imagen-secundaria-1234567891.jpg`
- `files/events/nombre-evento-1/imagen-terciaria-1234567892.jpg`

### Uso en Frontend
En el frontend, puedes usar las rutas directamente desde la base de datos:

```javascript
// Ejemplo de uso en React/Vue/Angular
const event = {
  name: "Mi Evento",
  img: "files/events/mi-evento/imagen-principal-1234567890.jpg",
  img_secondary: "files/events/mi-evento/imagen-secundaria-1234567891.jpg",
  img_terciary: "files/events/mi-evento/imagen-terciaria-1234567892.jpg"
};

// En el HTML/JSX
<img src={`/${event.img}`} alt="Imagen principal" />
<img src={`/${event.img_secondary}`} alt="Imagen secundaria" />
<img src={`/${event.img_terciary}`} alt="Imagen terciaria" />

// O usando URL completa
<img src={`https://exodustribe.com/${event.img}`} alt="Imagen principal" />
```

## 🔧 Funcionalidades Implementadas

### 1. **Creación de Eventos (POST /create)**
- ✅ Crea automáticamente la carpeta del evento
- ✅ Procesa hasta 3 imágenes (img, img_secondary, img_terciary)
- ✅ Genera nombres únicos para evitar conflictos
- ✅ Valida tipos de archivo (solo imágenes)
- ✅ Límite de 5MB por archivo

### 2. **Actualización de Eventos (PUT /update/:id)**
- ✅ **Cambio de nombre**: Renombra automáticamente la carpeta y actualiza todas las rutas
- ✅ **Archivos nuevos**: Elimina archivos antiguos y guarda los nuevos
- ✅ **Sin archivos nuevos**: Mantiene archivos existentes pero actualiza rutas si cambió el nombre
- ✅ **Mezcla**: Permite actualizar solo algunas imágenes manteniendo las otras

### 3. **Eliminación de Eventos (DELETE /delete/:id)**
- ✅ Elimina completamente la carpeta del evento y todos sus archivos
- ✅ Elimina el registro de la base de datos
- ✅ Manejo de errores si falla la eliminación de archivos

## 🛠️ Utilidades del Sistema

### `utils/fileManager.js`

#### Funciones Principales:
- `cleanEventName(name)` - Limpia nombres para usar como carpetas
- `getEventFolderPath(eventName)` - Obtiene ruta completa de la carpeta
- `getEventImageUrl(eventName, filename)` - Genera URL relativa para imágenes
- `createEventFolder(eventName)` - Crea carpeta del evento
- `deleteEventFolder(folderPath)` - Elimina carpeta y contenido
- `renameEventFolder(oldName, newName)` - Renombra carpeta del evento
- `processUploadedFiles(files, eventName)` - Procesa archivos subidos
- `handleEventFileUpdate(existingEvent, updateData, newFiles)` - Maneja actualizaciones completas

## 📋 Casos de Uso

### Caso 1: Crear Evento Nuevo
```javascript
// POST /api/v1/exodus/events/create
// FormData con: name, location, img, img_secondary, img_terciary
// Resultado: Carpeta creada en frontend/public/images/events/nombre-evento/
```

### Caso 2: Actualizar Solo Datos (Sin Archivos)
```javascript
// PUT /api/v1/exodus/events/update/:id
// Body: { name: "Nuevo Nombre", location: "Nueva Ubicación" }
// Resultado: Carpeta renombrada, rutas actualizadas en BD
```

### Caso 3: Actualizar Solo Imágenes
```javascript
// PUT /api/v1/exodus/events/update/:id
// FormData con: img, img_secondary (sin img_terciary)
// Resultado: Archivos antiguos eliminados, nuevos guardados, img_terciary se mantiene
```

### Caso 4: Actualizar Todo (Nombre + Imágenes)
```javascript
// PUT /api/v1/exodus/events/update/:id
// FormData con: name: "Nuevo Nombre", img, img_secondary, img_terciary
// Resultado: Carpeta renombrada, archivos antiguos eliminados, nuevos guardados
```

## 🔒 Validaciones y Seguridad

### Validaciones de Archivo:
- ✅ Solo archivos de imagen (jpg, jpeg, png, gif, webp)
- ✅ Tamaño máximo: 5MB por archivo
- ✅ Máximo 3 archivos por request
- ✅ Nombres de archivo únicos con timestamp

### Validaciones de Modelo:
- ✅ Nombres de evento únicos y limpios
- ✅ Rutas de imagen válidas
- ✅ Validación de tipos de archivo en el modelo

## 🚀 Configuración para Producción

### Estructura del Servidor:
```
/var/www/exodustribe.com/
├── catalogue-backend/    # API Node.js
└── public_html/          # Sitio web público
    └── files/
        └── events/       # Imágenes de eventos
```

### Variables de Entorno:
```bash
NODE_ENV=production
WEB_ROOT=/var/www/exodustribe.com/public_html
```

## 📝 Logs y Debugging

El sistema incluye logs detallados para:
- ✅ Creación de carpetas
- ✅ Procesamiento de archivos
- ✅ Renombrado de carpetas
- ✅ Eliminación de archivos
- ✅ Errores y excepciones

### Ejemplo de Logs:
```
=== INICIO ACTUALIZACIÓN DE EVENTO ===
Evento anterior: Mi Evento Original
Evento nuevo: Mi Evento Actualizado
Archivos nuevos: 2
🔄 Renombrando carpeta del evento...
✅ Carpeta renombrada de /path/old-name a /path/new-name
🗑️ Eliminando archivos antiguos...
✅ Archivo procesado: img -> /images/events/new-name/image1.jpg
✅ Archivo procesado: img_secondary -> /images/events/new-name/image2.jpg
✅ Evento actualizado exitosamente
```

## ⚠️ Consideraciones Importantes

1. **Permisos de Archivo**: Asegúrate de que el servidor tenga permisos de escritura en la carpeta del frontend
2. **Espacio en Disco**: Monitorea el uso de espacio, especialmente con muchas imágenes
3. **Backup**: Implementa backup regular de la carpeta de imágenes
4. **CDN**: Considera usar un CDN para servir las imágenes en producción
5. **Compresión**: Implementa compresión de imágenes para optimizar el almacenamiento

## 🔄 Migración desde Sistema Anterior

Si tienes eventos existentes con el sistema anterior:
1. Los archivos están en `files/events/` (sistema anterior)
2. Las nuevas imágenes se guardarán en `frontend/public/images/events/`
3. Considera migrar archivos existentes si es necesario
4. Actualiza las rutas en la base de datos si cambias la estructura
