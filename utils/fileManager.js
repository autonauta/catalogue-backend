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
  
  // Configurar permisos correctos para Apache
  try {
    await fs.chmod(folderPath, 0o755);
    console.log(`✅ Permisos configurados para carpeta: ${folderPath}`);
  } catch (error) {
    console.error(`⚠️ Error al configurar permisos: ${error.message}`);
  }
  
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
  
  console.log(`🔄 Actualizando rutas de imágenes para el nuevo nombre: ${newEventName}`);
  
  // Actualizar imagen principal
  if (event.img && (event.img.includes('files/events/') || event.img.includes('/files/events/'))) {
    const filename = path.basename(event.img);
    updatedEvent.img = getEventImageUrl(newEventName, filename);
    console.log(`📸 Imagen principal: ${event.img} → ${updatedEvent.img}`);
  }
  
  // Actualizar imagen secundaria
  if (event.img_secondary && (event.img_secondary.includes('files/events/') || event.img_secondary.includes('/files/events/'))) {
    const filename = path.basename(event.img_secondary);
    updatedEvent.img_secondary = getEventImageUrl(newEventName, filename);
    console.log(`📸 Imagen secundaria: ${event.img_secondary} → ${updatedEvent.img_secondary}`);
  }
  
  // Actualizar imagen terciaria
  if (event.img_terciary && (event.img_terciary.includes('files/events/') || event.img_terciary.includes('/files/events/'))) {
    const filename = path.basename(event.img_terciary);
    updatedEvent.img_terciary = getEventImageUrl(newEventName, filename);
    console.log(`📸 Imagen terciaria: ${event.img_terciary} → ${updatedEvent.img_terciary}`);
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
  
  console.log(`=== PROCESANDO ARCHIVOS SUBIDOS ===`);
  console.log(`Número de archivos recibidos: ${files ? files.length : 0}`);
  console.log(`Archivos recibidos:`, files);
  
  if (!files || files.length === 0) {
    console.log(`⚠️ No hay archivos para procesar`);
    return imagePaths;
  }
  
  // Crear la carpeta del evento
  await createEventFolder(eventName);
  
  // Procesar cada archivo
  for (const file of files) {
    console.log(`📁 Procesando archivo:`, {
      fieldname: file.fieldname,
      originalname: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size
    });
    
    const imageUrl = getEventImageUrl(eventName, file.filename);
    
    switch (file.fieldname) {
      case 'img':
        imagePaths.img = imageUrl;
        console.log(`✅ Imagen principal asignada: ${imageUrl}`);
        break;
      case 'img_secondary':
        imagePaths.img_secondary = imageUrl;
        console.log(`✅ Imagen secundaria asignada: ${imageUrl}`);
        break;
      case 'img_terciary':
        imagePaths.img_terciary = imageUrl;
        console.log(`✅ Imagen terciaria asignada: ${imageUrl}`);
        break;
      default:
        console.log(`⚠️ Campo de archivo no reconocido: ${file.fieldname}`);
    }
  }
  
  console.log(`=== RESULTADO FINAL DE PROCESAMIENTO ===`);
  console.log(`imagePaths:`, imagePaths);
  
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
    console.log(`Carpeta anterior: ${getEventFolderPath(oldEventName)}`);
    console.log(`Carpeta nueva: ${getEventFolderPath(newEventName)}`);
    await renameEventFolder(oldEventName, newEventName);
    console.log(`✅ Carpeta renombrada exitosamente`);
  }
  
  // Si hay archivos nuevos, procesar solo los archivos subidos
  if (newFiles.length > 0) {
    console.log(`📁 Procesando archivos nuevos...`);
    console.log(`Archivos recibidos para procesar:`, newFiles.map(f => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      filename: f.filename
    })));
    
    // Procesar archivos nuevos
    const newImagePaths = await processUploadedFiles(newFiles, newEventName);
    
    console.log(`=== ACTUALIZANDO RUTAS EN updateData ===`);
    console.log(`newImagePaths recibido:`, newImagePaths);
    
    // Actualizar solo las rutas de las imágenes que se subieron
    if (newImagePaths.img) {
      updateData.img = newImagePaths.img;
      console.log(`✅ Imagen principal actualizada: ${newImagePaths.img}`);
    } else {
      console.log(`⚠️ No se actualizó imagen principal (vacía)`);
    }
    if (newImagePaths.img_secondary) {
      updateData.img_secondary = newImagePaths.img_secondary;
      console.log(`✅ Imagen secundaria actualizada: ${newImagePaths.img_secondary}`);
    } else {
      console.log(`⚠️ No se actualizó imagen secundaria (vacía)`);
    }
    if (newImagePaths.img_terciary) {
      updateData.img_terciary = newImagePaths.img_terciary;
      console.log(`✅ Imagen terciaria actualizada: ${newImagePaths.img_terciary}`);
    } else {
      console.log(`⚠️ No se actualizó imagen terciaria (vacía)`);
    }
  } else {
    console.log(`⚠️ No hay archivos nuevos para procesar`);
  }
  
  // Si cambió el nombre del evento, actualizar las rutas de las imágenes existentes
  if (oldEventName !== newEventName) {
    console.log(`🔄 Actualizando rutas por cambio de nombre...`);
    const updatedPaths = updateEventImagePaths(existingEvent, newEventName, {});
    
    // Actualizar las rutas de las imágenes existentes (solo si no se subieron archivos nuevos)
    if (newFiles.length === 0 || !newFiles.some(f => f.fieldname === 'img')) {
      updateData.img = updatedPaths.img;
      console.log(`✅ Ruta de imagen principal actualizada por cambio de nombre: ${updatedPaths.img}`);
    }
    if (newFiles.length === 0 || !newFiles.some(f => f.fieldname === 'img_secondary')) {
      updateData.img_secondary = updatedPaths.img_secondary;
      console.log(`✅ Ruta de imagen secundaria actualizada por cambio de nombre: ${updatedPaths.img_secondary}`);
    }
    if (newFiles.length === 0 || !newFiles.some(f => f.fieldname === 'img_terciary')) {
      updateData.img_terciary = updatedPaths.img_terciary;
      console.log(`✅ Ruta de imagen terciaria actualizada por cambio de nombre: ${updatedPaths.img_terciary}`);
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
