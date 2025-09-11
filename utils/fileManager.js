const fs = require('fs').promises;
const path = require('path');

/**
 * Utilidades para el manejo de archivos de eventos
 * Diseñado para funcionar con frontend y backend en el mismo servidor
 */

// Ruta base donde se almacenarán las imágenes (carpeta del servidor web)
const FRONTEND_IMAGES_PATH = '/var/www/exodustribe.com/public_html/files/events';

/**
 * Limpia un nombre para usarlo como nombre de carpeta
 * @param {string} name - Nombre a limpiar
 * @returns {string} - Nombre limpio
 */
function cleanEventName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Obtiene la ruta completa de la carpeta de un evento
 * @param {string} eventName - Nombre del evento
 * @returns {string} - Ruta completa de la carpeta
 */
function getEventFolderPath(eventName) {
  const cleanName = cleanEventName(eventName);
  return path.join(FRONTEND_IMAGES_PATH, cleanName);
}

/**
 * Obtiene la ruta relativa para las URLs (desde la raíz del sitio web - public_html)
 * @param {string} eventName - Nombre del evento
 * @param {string} filename - Nombre del archivo
 * @returns {string} - Ruta relativa para URLs desde public_html
 */
function getEventImageUrl(eventName, filename) {
  const cleanName = cleanEventName(eventName);
  return `files/events/${cleanName}/${filename}`;
}

/**
 * Crea la carpeta de un evento si no existe
 * @param {string} eventName - Nombre del evento
 * @returns {Promise<string>} - Ruta de la carpeta creada
 */
async function createEventFolder(eventName) {
  const folderPath = getEventFolderPath(eventName);
  await fs.mkdir(folderPath, { recursive: true });
  return folderPath;
}

/**
 * Elimina una carpeta y todo su contenido
 * @param {string} folderPath - Ruta de la carpeta a eliminar
 * @returns {Promise<void>}
 */
async function deleteEventFolder(folderPath) {
  try {
    await fs.rm(folderPath, { recursive: true, force: true });
    console.log(`✅ Carpeta eliminada: ${folderPath}`);
  } catch (error) {
    console.error(`❌ Error al eliminar carpeta ${folderPath}:`, error.message);
    throw error;
  }
}

/**
 * Renombra una carpeta de evento
 * @param {string} oldEventName - Nombre anterior del evento
 * @param {string} newEventName - Nombre nuevo del evento
 * @returns {Promise<string>} - Ruta de la nueva carpeta
 */
async function renameEventFolder(oldEventName, newEventName) {
  const oldPath = getEventFolderPath(oldEventName);
  const newPath = getEventFolderPath(newEventName);
  
  try {
    // Verificar si la carpeta antigua existe
    await fs.access(oldPath);
    
    // Si la nueva carpeta ya existe, eliminarla primero
    try {
      await fs.access(newPath);
      await deleteEventFolder(newPath);
    } catch (error) {
      // La nueva carpeta no existe, está bien
    }
    
    // Renombrar la carpeta
    await fs.rename(oldPath, newPath);
    console.log(`✅ Carpeta renombrada de ${oldPath} a ${newPath}`);
    
    return newPath;
  } catch (error) {
    console.error(`❌ Error al renombrar carpeta:`, error.message);
    throw error;
  }
}

/**
 * Actualiza las rutas de las imágenes en un objeto de evento
 * @param {Object} event - Objeto del evento
 * @param {string} newEventName - Nombre nuevo del evento
 * @param {Object} newFiles - Archivos nuevos subidos
 * @returns {Object} - Objeto con las rutas actualizadas
 */
function updateEventImagePaths(event, newEventName, newFiles = {}) {
  const updatedEvent = { ...event };
  
  // Actualizar imagen principal si hay archivo nuevo
  if (newFiles.img && newFiles.img.length > 0) {
    updatedEvent.img = getEventImageUrl(newEventName, newFiles.img[0].filename);
  } else if (event.img && (event.img.includes('files/events/') || event.img.includes('/files/events/'))) {
    // Mantener la imagen existente pero actualizar la ruta si cambió el nombre
    const filename = path.basename(event.img);
    updatedEvent.img = getEventImageUrl(newEventName, filename);
  }
  
  // Actualizar imagen secundaria si hay archivo nuevo
  if (newFiles.img_secondary && newFiles.img_secondary.length > 0) {
    updatedEvent.img_secondary = getEventImageUrl(newEventName, newFiles.img_secondary[0].filename);
  } else if (event.img_secondary && (event.img_secondary.includes('files/events/') || event.img_secondary.includes('/files/events/'))) {
    const filename = path.basename(event.img_secondary);
    updatedEvent.img_secondary = getEventImageUrl(newEventName, filename);
  }
  
  // Actualizar imagen terciaria si hay archivo nuevo
  if (newFiles.img_terciary && newFiles.img_terciary.length > 0) {
    updatedEvent.img_terciary = getEventImageUrl(newEventName, newFiles.img_terciary[0].filename);
  } else if (event.img_terciary && (event.img_terciary.includes('files/events/') || event.img_terciary.includes('/files/events/'))) {
    const filename = path.basename(event.img_terciary);
    updatedEvent.img_terciary = getEventImageUrl(newEventName, filename);
  }
  
  return updatedEvent;
}

/**
 * Procesa archivos subidos y los mueve a la carpeta correcta
 * @param {Array} files - Array de archivos de multer
 * @param {string} eventName - Nombre del evento
 * @returns {Object} - Objeto con las rutas de las imágenes
 */
async function processUploadedFiles(files, eventName) {
  const imagePaths = {
    img: '',
    img_secondary: '',
    img_terciary: ''
  };
  
  if (!files || files.length === 0) {
    return imagePaths;
  }
  
  // Crear la carpeta del evento
  await createEventFolder(eventName);
  
  // Procesar cada archivo
  for (const file of files) {
    const imageUrl = getEventImageUrl(eventName, file.filename);
    
    switch (file.fieldname) {
      case 'img':
        imagePaths.img = imageUrl;
        break;
      case 'img_secondary':
        imagePaths.img_secondary = imageUrl;
        break;
      case 'img_terciary':
        imagePaths.img_terciary = imageUrl;
        break;
    }
    
    console.log(`✅ Archivo procesado: ${file.fieldname} -> ${imageUrl}`);
  }
  
  return imagePaths;
}

/**
 * Maneja la actualización completa de archivos de un evento
 * @param {Object} existingEvent - Evento existente
 * @param {Object} updateData - Datos de actualización
 * @param {Array} newFiles - Archivos nuevos subidos
 * @returns {Promise<Object>} - Datos actualizados del evento
 */
async function handleEventFileUpdate(existingEvent, updateData, newFiles = []) {
  const newEventName = updateData.name || existingEvent.name;
  const oldEventName = existingEvent.name;
  
  console.log(`=== ACTUALIZANDO ARCHIVOS DEL EVENTO ===`);
  console.log(`Evento anterior: ${oldEventName}`);
  console.log(`Evento nuevo: ${newEventName}`);
  console.log(`Archivos nuevos: ${newFiles.length}`);
  console.log(`Datos de actualización recibidos:`, JSON.stringify(updateData, null, 2));
  console.log(`Evento existente:`, {
    img: existingEvent.img,
    img_secondary: existingEvent.img_secondary,
    img_terciary: existingEvent.img_terciary
  });
  
  // Si cambió el nombre del evento, renombrar la carpeta
  if (oldEventName !== newEventName) {
    console.log(`🔄 Renombrando carpeta del evento...`);
    await renameEventFolder(oldEventName, newEventName);
  }
  
  // Si hay archivos nuevos, procesar solo los archivos subidos
  if (newFiles.length > 0) {
    console.log(`📁 Procesando archivos nuevos...`);
    
    // Procesar archivos nuevos
    const newImagePaths = await processUploadedFiles(newFiles, newEventName);
    
    // Actualizar solo las rutas de las imágenes que se subieron
    if (newImagePaths.img) {
      updateData.img = newImagePaths.img;
      console.log(`✅ Imagen principal actualizada: ${newImagePaths.img}`);
    }
    if (newImagePaths.img_secondary) {
      updateData.img_secondary = newImagePaths.img_secondary;
      console.log(`✅ Imagen secundaria actualizada: ${newImagePaths.img_secondary}`);
    }
    if (newImagePaths.img_terciary) {
      updateData.img_terciary = newImagePaths.img_terciary;
      console.log(`✅ Imagen terciaria actualizada: ${newImagePaths.img_terciary}`);
    }
  }
  
  // Si cambió el nombre del evento, actualizar las rutas de las imágenes existentes
  if (oldEventName !== newEventName) {
    console.log(`🔄 Actualizando rutas por cambio de nombre...`);
    const updatedPaths = updateEventImagePaths(existingEvent, newEventName);
    
    // Solo actualizar las rutas que no fueron cambiadas por archivos nuevos
    if (!updateData.img) {
      updateData.img = updatedPaths.img;
    }
    if (!updateData.img_secondary) {
      updateData.img_secondary = updatedPaths.img_secondary;
    }
    if (!updateData.img_terciary) {
      updateData.img_terciary = updatedPaths.img_terciary;
    }
  }
  
  console.log(`=== DATOS FINALES DE ACTUALIZACIÓN ===`);
  console.log(`updateData final:`, JSON.stringify(updateData, null, 2));
  
  return updateData;
}

module.exports = {
  cleanEventName,
  getEventFolderPath,
  getEventImageUrl,
  createEventFolder,
  deleteEventFolder,
  renameEventFolder,
  updateEventImagePaths,
  processUploadedFiles,
  handleEventFileUpdate,
  FRONTEND_IMAGES_PATH
};
