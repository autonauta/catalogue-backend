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
  WEBP_QUALITY: 60, // Reducido de 85 a 60 para mayor compresión
  // Tamaño máximo objetivo por imagen (1MB)
  MAX_IMAGE_SIZE: 1024 * 1024, // 1MB en bytes
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
 * Generar thumbnail pequeño (200x200) con compresión máxima
 */
async function generateThumbnail(inputPath, outputPath) {
  try {
    console.log("🖼️ Generando thumbnail...");
    console.log("📁 Archivo de entrada:", inputPath);
    console.log("📁 Archivo de salida:", outputPath);
    
    // Verificar que el archivo de entrada existe
    try {
      await fs.access(inputPath);
      console.log("✅ Archivo de entrada existe");
    } catch (accessError) {
      console.error("❌ Archivo de entrada no encontrado:", inputPath);
      throw new Error(`Archivo de entrada no encontrado: ${inputPath}`);
    }
    
    // Generar thumbnail manteniendo proporción original (máximo 200px en el lado más largo)
    const command = `ffmpeg -i "${inputPath}" -vf "scale=200:200:force_original_aspect_ratio=decrease" -c:v libwebp -quality 30 -compression_level 6 -y "${outputPath}"`;
    console.log("🔧 Comando FFmpeg para thumbnail:", command);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('video:')) {
      console.warn("⚠️ Advertencias de FFmpeg:", stderr);
    }
    
    // Verificar que el archivo se creó
    await fs.access(outputPath);
    
    // Obtener información del thumbnail
    const thumbnailInfo = await getImageInfo(outputPath);
    
    console.log("✅ Thumbnail generado exitosamente");
    console.log(`📊 Tamaño thumbnail:`, (thumbnailInfo.size / 1024).toFixed(2), "KB");
    console.log(`📐 Dimensiones: ${thumbnailInfo.width}x${thumbnailInfo.height}`);
    
    return {
      size: thumbnailInfo.size,
      dimensions: {
        width: thumbnailInfo.width,
        height: thumbnailInfo.height
      }
    };
    
  } catch (error) {
    console.error("❌ Error al generar thumbnail:", error);
    throw new Error(`Error al generar thumbnail: ${error.message}`);
  }
}

/**
 * Generar imagen comprimida de alta calidad manteniendo dimensiones originales
 */
async function generateHighQualityCompressed(inputPath, outputPath, originalDimensions) {
  try {
    console.log("🎨 Generando imagen de alta calidad...");
    console.log("📁 Archivo de entrada:", inputPath);
    console.log("📁 Archivo de salida:", outputPath);
    console.log("📐 Dimensiones originales:", originalDimensions);
    
    // Verificar que el archivo de entrada existe
    try {
      await fs.access(inputPath);
      console.log("✅ Archivo de entrada existe");
    } catch (accessError) {
      console.error("❌ Archivo de entrada no encontrado:", inputPath);
      throw new Error(`Archivo de entrada no encontrado: ${inputPath}`);
    }
    
    // Generar imagen de alta calidad manteniendo dimensiones originales
    const command = `ffmpeg -i "${inputPath}" -c:v libwebp -quality 85 -compression_level 4 -y "${outputPath}"`;
    console.log("🔧 Comando FFmpeg para alta calidad:", command);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('video:')) {
      console.warn("⚠️ Advertencias de FFmpeg:", stderr);
    }
    
    // Verificar que el archivo se creó
    await fs.access(outputPath);
    
    // Obtener información de la imagen comprimida
    const compressedInfo = await getImageInfo(outputPath);
    
    console.log("✅ Imagen de alta calidad generada exitosamente");
    console.log(`📊 Tamaño:`, (compressedInfo.size / 1024).toFixed(2), "KB");
    console.log(`📐 Dimensiones: ${compressedInfo.width}x${compressedInfo.height}`);
    
    return {
      size: compressedInfo.size,
      dimensions: {
        width: compressedInfo.width,
        height: compressedInfo.height
      },
      quality: 85
    };
    
  } catch (error) {
    console.error("❌ Error al generar imagen de alta calidad:", error);
    throw new Error(`Error al generar imagen de alta calidad: ${error.message}`);
  }
}

/**
 * Comprimir imagen a WebP usando FFmpeg con compresión agresiva
 */
async function compressImageToWebP(inputPath, outputPath, targetSize = GALLERY_CONFIG.MAX_IMAGE_SIZE) {
  try {
    console.log("🔧 Iniciando compresión agresiva de imagen...");
    console.log("📁 Archivo de entrada:", inputPath);
    console.log("📁 Archivo de salida:", outputPath);
    console.log("🎯 Tamaño objetivo:", (targetSize / 1024).toFixed(2), "KB");
    
    // Verificar que el archivo de entrada existe
    try {
      await fs.access(inputPath);
      console.log("✅ Archivo de entrada existe");
    } catch (accessError) {
      console.error("❌ Archivo de entrada no encontrado:", inputPath);
      throw new Error(`Archivo de entrada no encontrado: ${inputPath}`);
    }
    
    // Intentar compresión con diferentes niveles de calidad
    const qualityLevels = [60, 50, 40, 30, 20]; // Niveles de calidad de mayor a menor
    let bestResult = null;
    let bestQuality = qualityLevels[0];
    
    for (const quality of qualityLevels) {
      console.log(`🔧 Probando compresión con calidad ${quality}...`);
      
      const command = `ffmpeg -i "${inputPath}" -c:v libwebp -quality ${quality} -compression_level 6 -y "${outputPath}"`;
      console.log("🔧 Comando FFmpeg:", command);
      
      try {
        const { stdout, stderr } = await execAsync(command);
        
        if (stderr && !stderr.includes('video:')) {
          console.warn("⚠️ Advertencias de FFmpeg:", stderr);
        }
        
        // Verificar que el archivo se creó
        await fs.access(outputPath);
        
        // Obtener tamaño del archivo comprimido
        const stats = await fs.stat(outputPath);
        const compressedSize = stats.size;
        
        console.log(`📊 Tamaño comprimido con calidad ${quality}:`, (compressedSize / 1024).toFixed(2), "KB");
        
        if (compressedSize <= targetSize) {
          console.log(`✅ Objetivo alcanzado con calidad ${quality}`);
          bestResult = { quality, size: compressedSize };
          break;
        } else {
          console.log(`⚠️ Tamaño aún muy grande con calidad ${quality}`);
          if (!bestResult || compressedSize < bestResult.size) {
            bestResult = { quality, size: compressedSize };
            bestQuality = quality;
          }
        }
        
      } catch (cmdError) {
        console.warn(`⚠️ Error con calidad ${quality}:`, cmdError.message);
        continue;
      }
    }
    
    if (!bestResult) {
      throw new Error("No se pudo comprimir la imagen con ningún nivel de calidad");
    }
    
    console.log(`✅ Imagen comprimida exitosamente con calidad ${bestResult.quality}`);
    console.log(`📊 Tamaño final:`, (bestResult.size / 1024).toFixed(2), "KB");
    console.log(`📈 Reducción:`, ((await fs.stat(inputPath)).size - bestResult.size) / 1024, "KB");
    
    return { quality: bestResult.quality, size: bestResult.size };
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
    
    // CUARTO: Generar nombres de archivo para las versiones
    console.log("📝 Generando nombres de archivo...");
    const originalFilename = file.originalname;
    const baseFilename = generateUniqueFilename(originalFilename, 'webp').replace('.webp', '');
    const tempPath = file.path;
    
    // Nombres para las versiones (solo thumbnail y original comprimida)
    const thumbnailFilename = `${baseFilename}_thumb.webp`;
    const originalCompressedFilename = `${baseFilename}_orig.webp`;
    
    // Rutas completas
    const thumbnailPath = path.join(GALLERY_CONFIG.SERVER_PATH, thumbnailFilename);
    const originalCompressedPath = path.join(GALLERY_CONFIG.SERVER_PATH, originalCompressedFilename);
    
    console.log("📁 Archivo temporal:", tempPath);
    console.log("📁 Thumbnail:", thumbnailPath);
    console.log("📁 Original comprimida:", originalCompressedPath);
    
    // QUINTO: Obtener información de la imagen original
    console.log("📊 Obteniendo información de imagen original...");
    const originalImageInfo = await getImageInfo(tempPath);
    console.log("📐 Dimensiones originales:", originalImageInfo);
    
    // SEXTO: Generar las dos versiones en paralelo
    console.log("🚀 Generando versiones...");
    const [thumbnailResult, originalCompressedResult] = await Promise.all([
      generateThumbnail(tempPath, thumbnailPath),
      generateHighQualityCompressed(tempPath, originalCompressedPath, originalImageInfo)
    ]);
    
    console.log("✅ Versiones generadas exitosamente");
    
    // Calcular ratio de compresión (usando la versión original comprimida como referencia)
    const compressionRatio = originalSize > 0 ? 
      ((originalSize - originalCompressedResult.size) / originalSize) * 100 : 0;
    
    // Limpiar archivo temporal
    try {
      await fs.unlink(tempPath);
      console.log("🗑️ Archivo temporal eliminado");
    } catch (unlinkError) {
      console.warn("⚠️ No se pudo eliminar archivo temporal:", unlinkError.message);
    }
    
    // Crear registro en base de datos
    const galleryImage = new GalleryImage({
      filename: originalCompressedFilename, // Usar la versión original comprimida como principal
      path: path.join(GALLERY_CONFIG.FRONTEND_PATH, originalCompressedFilename),
      versions: {
        thumbnail: {
          filename: thumbnailFilename,
          path: path.join(GALLERY_CONFIG.FRONTEND_PATH, thumbnailFilename),
          size: thumbnailResult.size,
          dimensions: thumbnailResult.dimensions
        },
        original_compressed: {
          filename: originalCompressedFilename,
          path: path.join(GALLERY_CONFIG.FRONTEND_PATH, originalCompressedFilename),
          size: originalCompressedResult.size,
          dimensions: originalCompressedResult.dimensions,
          quality: originalCompressedResult.quality
        }
      },
      original_filename: originalFilename,
      file_size: originalCompressedResult.size, // Tamaño de la versión original comprimida
      original_size: originalSize,
      compression_ratio: compressionRatio,
      dimensions: originalCompressedResult.dimensions,
      format: 'webp',
      quality: originalCompressedResult.quality,
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
        thumbnailSize: thumbnailResult.size,
        originalCompressedSize: originalCompressedResult.size,
        compressionRatio: compressionRatio,
        dimensions: {
          original: originalImageInfo,
          thumbnail: thumbnailResult.dimensions,
          originalCompressed: originalCompressedResult.dimensions
        }
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
        // Eliminar todos los archivos físicos (todas las versiones)
        const filesToDelete = [];
        
        // Archivo principal
        if (image.filename) {
          filesToDelete.push(path.join(GALLERY_CONFIG.SERVER_PATH, image.filename));
        }
        
        // Archivos de versiones
        if (image.versions) {
          if (image.versions.thumbnail && image.versions.thumbnail.filename) {
            filesToDelete.push(path.join(GALLERY_CONFIG.SERVER_PATH, image.versions.thumbnail.filename));
          }
          if (image.versions.original_compressed && image.versions.original_compressed.filename) {
            filesToDelete.push(path.join(GALLERY_CONFIG.SERVER_PATH, image.versions.original_compressed.filename));
          }
        }
        
        // Eliminar cada archivo
        for (const filePath of filesToDelete) {
          try {
            await fs.unlink(filePath);
            console.log("🗑️ Archivo eliminado:", path.basename(filePath));
          } catch (unlinkError) {
            console.warn("⚠️ No se pudo eliminar archivo:", path.basename(filePath), unlinkError.message);
          }
        }
        
        // Eliminar registro de base de datos
        await GalleryImage.findByIdAndDelete(image._id);
        console.log("🗑️ Registro eliminado:", image._id);
        
        deletedFiles.push({
          id: image._id,
          filename: image.filename,
          path: image.path,
          filesDeleted: filesToDelete.length
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
 * Eliminar todas las imágenes de la galería
 */
async function deleteAllGalleryImages() {
  try {
    console.log("🗑️ Eliminando todas las imágenes de la galería...");
    
    // Obtener todas las imágenes
    const allImages = await GalleryImage.find({});
    
    if (allImages.length === 0) {
      console.log("✅ No hay imágenes para eliminar");
      return {
        success: true,
        deleted: 0,
        files: [],
        message: "No había imágenes en la galería"
      };
    }
    
    console.log(`🗑️ Eliminando ${allImages.length} imágenes...`);
    
    const deletedFiles = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const image of allImages) {
      try {
        // Eliminar todos los archivos físicos (todas las versiones)
        const filesToDelete = [];
        
        // Archivo principal
        if (image.filename) {
          filesToDelete.push(path.join(GALLERY_CONFIG.SERVER_PATH, image.filename));
        }
        
        // Archivos de versiones
        if (image.versions) {
          if (image.versions.thumbnail && image.versions.thumbnail.filename) {
            filesToDelete.push(path.join(GALLERY_CONFIG.SERVER_PATH, image.versions.thumbnail.filename));
          }
          if (image.versions.original_compressed && image.versions.original_compressed.filename) {
            filesToDelete.push(path.join(GALLERY_CONFIG.SERVER_PATH, image.versions.original_compressed.filename));
          }
        }
        
        // Eliminar cada archivo
        const imageDeletedFiles = [];
        for (const filePath of filesToDelete) {
          try {
            await fs.unlink(filePath);
            imageDeletedFiles.push(path.basename(filePath));
            console.log("🗑️ Archivo eliminado:", path.basename(filePath));
          } catch (unlinkError) {
            console.warn("⚠️ No se pudo eliminar archivo:", path.basename(filePath), unlinkError.message);
          }
        }
        
        // Eliminar registro de base de datos
        await GalleryImage.findByIdAndDelete(image._id);
        console.log("🗑️ Registro eliminado:", image._id);
        
        deletedFiles.push({
          id: image._id,
          filename: image.filename,
          path: image.path,
          filesDeleted: imageDeletedFiles,
          totalFiles: filesToDelete.length
        });
        
        successCount++;
        
      } catch (deleteError) {
        console.error("❌ Error al eliminar imagen:", image.filename, deleteError.message);
        errorCount++;
      }
    }
    
    console.log(`✅ Eliminación completada: ${successCount} imágenes eliminadas exitosamente, ${errorCount} errores`);
    
    return {
      success: true,
      deleted: successCount,
      errors: errorCount,
      files: deletedFiles,
      message: `Eliminadas ${successCount} imágenes exitosamente, ${errorCount} errores`
    };
    
  } catch (error) {
    console.error("❌ Error al eliminar todas las imágenes:", error);
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
    
    // Eliminar todos los archivos físicos (todas las versiones)
    const filesToDelete = [];
    
    // Archivo principal
    if (image.filename) {
      filesToDelete.push(path.join(GALLERY_CONFIG.SERVER_PATH, image.filename));
    }
    
    // Archivos de versiones
    if (image.versions) {
      if (image.versions.thumbnail && image.versions.thumbnail.filename) {
        filesToDelete.push(path.join(GALLERY_CONFIG.SERVER_PATH, image.versions.thumbnail.filename));
      }
      if (image.versions.original_compressed && image.versions.original_compressed.filename) {
        filesToDelete.push(path.join(GALLERY_CONFIG.SERVER_PATH, image.versions.original_compressed.filename));
      }
    }
    
    // Eliminar cada archivo
    const deletedFiles = [];
    for (const filePath of filesToDelete) {
      try {
        await fs.unlink(filePath);
        deletedFiles.push(path.basename(filePath));
        console.log("🗑️ Archivo eliminado:", path.basename(filePath));
      } catch (unlinkError) {
        console.warn("⚠️ No se pudo eliminar archivo:", path.basename(filePath), unlinkError.message);
      }
    }
    
    // Eliminar registro de base de datos
    await GalleryImage.findByIdAndDelete(imageId);
    
    console.log("✅ Imagen eliminada:", image.filename);
    console.log(`🗑️ Archivos eliminados: ${deletedFiles.length}/${filesToDelete.length}`);
    
    return {
      success: true,
      deletedImage: image.getImageInfo(),
      deletedFiles: deletedFiles,
      totalFiles: filesToDelete.length
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
  deleteAllGalleryImages,
  generateUniqueFilename,
  compressImageToWebP,
  generateThumbnail,
  generateHighQualityCompressed,
  getImageInfo
};
