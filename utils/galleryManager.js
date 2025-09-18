const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

// Importar el modelo
const GalleryImage = require('../models/GalleryImage');

const execAsync = promisify(exec);

// Configuración de la galería
const GALLERY_CONFIG = {
  // Ruta del servidor donde se guardan las imágenes
  SERVER_PATH: '/var/www/exodustribe.com/public_html/files/galery',
  // Ruta relativa para el frontend
  FRONTEND_PATH: 'files/galery',
  // Límite máximo de imágenes
  MAX_IMAGES: 1000,
  // Configuración de compresión WebP
  WEBP_QUALITY: 85,
  // Formatos soportados
  SUPPORTED_FORMATS: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'],
  // Tamaño máximo de archivo (10MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024
};

/**
 * Crear directorio de galería si no existe
 */
async function createGalleryDirectory() {
  try {
    console.log("🔍 Verificando directorio de galería:", GALLERY_CONFIG.SERVER_PATH);
    await fs.access(GALLERY_CONFIG.SERVER_PATH);
    console.log("✅ Directorio de galería ya existe");
    
    // Verificar permisos de escritura
    try {
      await fs.access(GALLERY_CONFIG.SERVER_PATH, fs.constants.W_OK);
      console.log("✅ Permisos de escritura OK");
    } catch (writeError) {
      console.warn("⚠️ Sin permisos de escritura, intentando cambiar permisos...");
      try {
        await fs.chmod(GALLERY_CONFIG.SERVER_PATH, 0o755);
        console.log("✅ Permisos actualizados");
      } catch (chmodError) {
        console.error("❌ No se pudieron cambiar los permisos:", chmodError.message);
        throw new Error("Sin permisos de escritura en el directorio de galería");
      }
    }
    
  } catch (error) {
    console.log("📁 Directorio no existe, creando...");
    try {
      // Crear directorio con permisos apropiados
      await fs.mkdir(GALLERY_CONFIG.SERVER_PATH, { recursive: true, mode: 0o755 });
      console.log("✅ Directorio de galería creado:", GALLERY_CONFIG.SERVER_PATH);
      
      // Verificar que se creó correctamente
      await fs.access(GALLERY_CONFIG.SERVER_PATH);
      console.log("✅ Directorio verificado");
      
    } catch (createError) {
      console.error("❌ Error al crear directorio de galería:", createError);
      console.error("❌ Ruta:", GALLERY_CONFIG.SERVER_PATH);
      console.error("❌ Error details:", createError.message);
      console.error("💡 Verifica que el usuario tenga permisos para crear directorios en:", path.dirname(GALLERY_CONFIG.SERVER_PATH));
      throw createError;
    }
  }
}

/**
 * Generar nombre único para archivo
 */
function generateUniqueFilename(originalName, format = 'webp') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = format === 'webp' ? '.webp' : path.extname(originalName);
  return `${timestamp}_${random}${extension}`;
}

/**
 * Comprimir imagen a WebP usando FFmpeg
 */
async function compressImageToWebP(inputPath, outputPath, quality = GALLERY_CONFIG.WEBP_QUALITY) {
  try {
    console.log("🔧 Iniciando compresión de imagen...");
    console.log("📁 Archivo de entrada:", inputPath);
    console.log("📁 Archivo de salida:", outputPath);
    console.log("⚙️ Calidad:", quality);
    
    // Verificar que el archivo de entrada existe
    try {
      await fs.access(inputPath);
      console.log("✅ Archivo de entrada existe");
    } catch (accessError) {
      console.error("❌ Archivo de entrada no encontrado:", inputPath);
      throw new Error(`Archivo de entrada no encontrado: ${inputPath}`);
    }
    
    const command = `ffmpeg -i "${inputPath}" -c:v libwebp -quality ${quality} -y "${outputPath}"`;
    console.log("🔧 Comando FFmpeg:", command);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('video:')) {
      console.warn("⚠️ Advertencias de FFmpeg:", stderr);
    }
    
    // Verificar que el archivo de salida se creó
    try {
      await fs.access(outputPath);
      console.log("✅ Archivo de salida creado exitosamente");
    } catch (outputError) {
      console.error("❌ Archivo de salida no se creó:", outputPath);
      throw new Error(`Archivo de salida no se creó: ${outputPath}`);
    }
    
    console.log("✅ Imagen comprimida exitosamente");
    return true;
  } catch (error) {
    console.error("❌ Error al comprimir imagen:", error);
    console.error("❌ Input path:", inputPath);
    console.error("❌ Output path:", outputPath);
    throw new Error(`Error al comprimir imagen: ${error.message}`);
  }
}

/**
 * Obtener información de la imagen (dimensiones, tamaño)
 */
async function getImageInfo(filePath) {
  try {
    const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;
    const { stdout } = await execAsync(command);
    const info = JSON.parse(stdout);
    
    const videoStream = info.streams.find(s => s.codec_type === 'video');
    const format = info.format;
    
    return {
      width: videoStream ? videoStream.width : 0,
      height: videoStream ? videoStream.height : 0,
      size: parseInt(format.size),
      duration: parseFloat(format.duration) || 0
    };
  } catch (error) {
    console.error("❌ Error al obtener información de imagen:", error);
    throw new Error(`Error al obtener información de imagen: ${error.message}`);
  }
}

/**
 * Procesar archivo de imagen subido
 */
async function processUploadedImage(file, originalSize, eventId) {
  try {
    console.log("🔄 Procesando imagen:", file.originalname);
    
    // PRIMERO: Verificar que el archivo temporal existe
    try {
      await fs.access(file.path);
      console.log("✅ Archivo temporal existe");
    } catch (accessError) {
      console.error("❌ Archivo temporal no encontrado:", file.path);
      throw new Error("Archivo temporal no encontrado");
    }
    
    // SEGUNDO: Verificar duplicados ANTES de procesar
    console.log("🔍 Verificando duplicados...");
    const existingImage = await GalleryImage.findOne({
      original_filename: file.originalname,
      event_id: eventId
    });
    
    if (existingImage) {
      console.log("⚠️ Imagen duplicada encontrada:", file.originalname);
      console.log("📅 Imagen existente subida el:", existingImage.upload_date);
      console.log("🆔 ID de imagen existente:", existingImage._id);
      
      // Limpiar archivo temporal inmediatamente
      try {
        await fs.unlink(file.path);
        console.log("🗑️ Archivo temporal eliminado (duplicado)");
      } catch (unlinkError) {
        console.warn("⚠️ No se pudo eliminar archivo temporal:", unlinkError.message);
      }
      
      return {
        success: false,
        duplicate: true,
        existingImage: existingImage.getImageInfo(),
        message: `La imagen "${file.originalname}" ya existe en este evento`
      };
    }
    
    console.log("✅ Imagen no duplicada, procediendo con el procesamiento");
    
    // TERCERO: Crear directorio si no existe
    console.log("📁 Preparando directorio de destino...");
    await createGalleryDirectory();
    
    // CUARTO: Generar nombres de archivo
    console.log("📝 Generando nombres de archivo...");
    const originalFilename = file.originalname;
    const uniqueFilename = generateUniqueFilename(originalFilename, 'webp');
    const tempPath = file.path;
    const finalPath = path.join(GALLERY_CONFIG.SERVER_PATH, uniqueFilename);
    
    console.log("📁 Archivo temporal:", tempPath);
    console.log("📁 Archivo final:", finalPath);
    
    // QUINTO: Comprimir a WebP
    console.log("🔧 Iniciando compresión...");
    await compressImageToWebP(tempPath, finalPath, GALLERY_CONFIG.WEBP_QUALITY);
    
    // Obtener información de la imagen comprimida
    const imageInfo = await getImageInfo(finalPath);
    
    // Calcular ratio de compresión
    const compressionRatio = originalSize > 0 ? 
      ((originalSize - imageInfo.size) / originalSize) * 100 : 0;
    
    // Limpiar archivo temporal
    try {
      await fs.unlink(tempPath);
      console.log("🗑️ Archivo temporal eliminado");
    } catch (unlinkError) {
      console.warn("⚠️ No se pudo eliminar archivo temporal:", unlinkError.message);
    }
    
    // Crear registro en base de datos
    const galleryImage = new GalleryImage({
      filename: uniqueFilename,
      path: path.join(GALLERY_CONFIG.FRONTEND_PATH, uniqueFilename),
      original_filename: originalFilename,
      file_size: imageInfo.size,
      original_size: originalSize,
      compression_ratio: compressionRatio,
      dimensions: {
        width: imageInfo.width,
        height: imageInfo.height
      },
      format: 'webp',
      quality: GALLERY_CONFIG.WEBP_QUALITY,
      is_compressed: true,
      event_id: eventId
    });
    
    await galleryImage.save();
    console.log("✅ Imagen guardada en base de datos:", galleryImage._id);
    console.log("🎉 Procesamiento completado exitosamente");
    
    return {
      success: true,
      image: galleryImage,
      info: {
        originalSize: originalSize,
        compressedSize: imageInfo.size,
        compressionRatio: compressionRatio,
        dimensions: imageInfo
      }
    };
    
  } catch (error) {
    console.error("❌ Error al procesar imagen:", error);
    
    // Limpiar archivos en caso de error
    try {
      if (file.path) await fs.unlink(file.path);
    } catch (cleanupError) {
      console.warn("⚠️ Error al limpiar archivos:", cleanupError.message);
    }
    
    throw error;
  }
}

/**
 * Limpiar imágenes antiguas cuando se excede el límite
 */
async function cleanupOldImages() {
  try {
    console.log("🧹 Iniciando limpieza de imágenes antiguas...");
    
    const imagesToDelete = await GalleryImage.cleanupOldImages(GALLERY_CONFIG.MAX_IMAGES);
    
    if (imagesToDelete.length === 0) {
      console.log("✅ No hay imágenes para limpiar");
      return { deleted: 0, files: [] };
    }
    
    console.log(`🗑️ Eliminando ${imagesToDelete.length} imágenes antiguas...`);
    
    const deletedFiles = [];
    
    for (const image of imagesToDelete) {
      try {
        // Eliminar archivo físico
        const filePath = path.join(GALLERY_CONFIG.SERVER_PATH, image.filename);
        await fs.unlink(filePath);
        console.log("🗑️ Archivo eliminado:", image.filename);
        
        // Eliminar registro de base de datos
        await GalleryImage.findByIdAndDelete(image._id);
        console.log("🗑️ Registro eliminado:", image._id);
        
        deletedFiles.push({
          id: image._id,
          filename: image.filename,
          path: image.path
        });
        
      } catch (deleteError) {
        console.error("❌ Error al eliminar imagen:", image.filename, deleteError.message);
      }
    }
    
    console.log(`✅ Limpieza completada: ${deletedFiles.length} imágenes eliminadas`);
    
    return {
      deleted: deletedFiles.length,
      files: deletedFiles
    };
    
  } catch (error) {
    console.error("❌ Error durante limpieza:", error);
    throw error;
  }
}

/**
 * Obtener todas las imágenes de la galería
 */
async function getAllGalleryImages(limit = null, skip = 0, eventId = null) {
  try {
    console.log("📸 Obteniendo imágenes de la galería...");
    
    let query = GalleryImage.find();
    
    // Filtrar por evento si se especifica
    if (eventId) {
      query = query.where({ event_id: eventId });
      console.log("🔍 Filtrando por evento:", eventId);
    }
    
    query = query.sort({ upload_date: -1 });
    
    if (limit) {
      query = query.limit(limit);
    }
    
    if (skip > 0) {
      query = query.skip(skip);
    }
    
    const images = await query.exec();
    
    console.log(`✅ ${images.length} imágenes encontradas`);
    
    return images.map(image => image.getImageInfo());
    
  } catch (error) {
    console.error("❌ Error al obtener imágenes:", error);
    throw error;
  }
}

/**
 * Obtener estadísticas de la galería
 */
async function getGalleryStats() {
  try {
    const totalImages = await GalleryImage.countDocuments();
    const totalSize = await GalleryImage.aggregate([
      { $group: { _id: null, totalSize: { $sum: "$file_size" } } }
    ]);
    
    const formatStats = await GalleryImage.aggregate([
      { $group: { _id: "$format", count: { $sum: 1 } } }
    ]);
    
    const avgCompression = await GalleryImage.aggregate([
      { $group: { _id: null, avgCompression: { $avg: "$compression_ratio" } } }
    ]);
    
    return {
      totalImages,
      maxImages: GALLERY_CONFIG.MAX_IMAGES,
      remainingSlots: Math.max(0, GALLERY_CONFIG.MAX_IMAGES - totalImages),
      totalSize: totalSize[0]?.totalSize || 0,
      formatDistribution: formatStats,
      averageCompression: avgCompression[0]?.avgCompression || 0
    };
    
  } catch (error) {
    console.error("❌ Error al obtener estadísticas:", error);
    throw error;
  }
}

/**
 * Eliminar imagen específica
 */
async function deleteGalleryImage(imageId) {
  try {
    const image = await GalleryImage.findById(imageId);
    if (!image) {
      throw new Error("Imagen no encontrada");
    }
    
    // Eliminar archivo físico
    const filePath = path.join(GALLERY_CONFIG.SERVER_PATH, image.filename);
    await fs.unlink(filePath);
    
    // Eliminar registro de base de datos
    await GalleryImage.findByIdAndDelete(imageId);
    
    console.log("✅ Imagen eliminada:", image.filename);
    
    return {
      success: true,
      deletedImage: image.getImageInfo()
    };
    
  } catch (error) {
    console.error("❌ Error al eliminar imagen:", error);
    throw error;
  }
}

module.exports = {
  GALLERY_CONFIG,
  createGalleryDirectory,
  processUploadedImage,
  cleanupOldImages,
  getAllGalleryImages,
  getGalleryStats,
  deleteGalleryImage,
  generateUniqueFilename,
  compressImageToWebP,
  getImageInfo
};
