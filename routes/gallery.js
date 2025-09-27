const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { galleryUpload, handleMulterError } = require('../middleware/galleryUpload');
const { 
  processUploadedImage, 
  cleanupOldImages, 
  getAllGalleryImages, 
  getGalleryStats, 
  deleteGalleryImage,
  GALLERY_CONFIG 
} = require('../utils/galleryManager');
const GalleryImage = require('../models/GalleryImage');

// Middleware para manejar errores de Multer se aplicará después de las rutas

// POST /gallery/upload - Subir imágenes a la galería
router.post('/upload', galleryUpload.array('images', 10), async (req, res) => {
  try {
    console.log("=== SUBIDA DE IMÁGENES A GALERÍA ===");
    console.log("Archivos recibidos:", req.files?.length || 0);
    console.log("Body recibido:", req.body);
    console.log("Files recibidos:", req.files);
    
    if (!req.files || req.files.length === 0) {
      console.log("❌ No se recibieron archivos");
      return res.status(400).json({
        error: true,
        message: "No se recibieron archivos de imagen"
      });
    }
    
    // Validar event_id
    const { event_id } = req.body;
    console.log("📅 Event ID recibido:", event_id);
    
    if (!event_id) {
      console.log("❌ Event ID faltante");
      return res.status(400).json({
        error: true,
        message: "El event_id es requerido"
      });
    }
    
    console.log("📅 Event ID válido:", event_id);
    
    const results = [];
    const errors = [];
    
    // Procesar cada archivo
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      console.log(`\n🔄 Procesando archivo ${i + 1}/${req.files.length}: ${file.originalname}`);
      console.log("📁 Archivo temporal:", file.path);
      console.log("📏 Tamaño del archivo:", file.size, "bytes");
      
      try {
        // Obtener tamaño original
        const originalSize = file.size;
        console.log("📏 Tamaño original:", (originalSize / 1024).toFixed(2), "KB");
        
        // Procesar imagen (incluye verificación de duplicados)
        console.log("🚀 Iniciando procesamiento de imagen...");
        const result = await processUploadedImage(file, originalSize, event_id);
        
        if (result.success) {
          results.push({
            success: true,
            image: result.image.getImageInfo(),
            compression: result.info
          });
          console.log("✅ Imagen procesada exitosamente");
        } else if (result.duplicate) {
          // Manejar duplicados como información, no como error
          results.push({
            success: false,
            duplicate: true,
            filename: file.originalname,
            existingImage: result.existingImage,
            message: result.message
          });
          console.log("⚠️ Imagen duplicada:", result.message);
        } else {
          errors.push({
            filename: file.originalname,
            error: result.message || "Error desconocido en el procesamiento"
          });
        }
        
      } catch (processError) {
        console.error(`❌ Error al procesar ${file.originalname}:`, processError.message);
        errors.push({
          filename: file.originalname,
          error: processError.message
        });
      }
    }
    
    // Limpiar imágenes antiguas si es necesario
    let cleanupResult = null;
    try {
      cleanupResult = await cleanupOldImages();
      console.log("🧹 Limpieza completada:", cleanupResult);
    } catch (cleanupError) {
      console.error("⚠️ Error durante limpieza:", cleanupError.message);
    }
    
    // Calcular estadísticas de la respuesta
    const successfulImages = results.filter(r => r.success).length;
    const duplicateImages = results.filter(r => r.duplicate).length;
    const failedImages = errors.length;
    
    // Respuesta exitosa
    res.json({
      success: true,
      message: `Procesadas ${successfulImages} imágenes exitosamente, ${duplicateImages} duplicadas, ${failedImages} errores`,
      results: results,
      errors: errors,
      cleanup: cleanupResult,
      stats: {
        totalProcessed: results.length,
        successful: successfulImages,
        duplicates: duplicateImages,
        errors: failedImages,
        imagesDeleted: cleanupResult?.deleted || 0
      }
    });
    
  } catch (error) {
    console.error("❌ Error general en subida de galería:", error);
    res.status(500).json({
      error: true,
      message: "Error interno del servidor al procesar imágenes",
      details: error.message
    });
  }
});

// GET /gallery/images - Obtener todas las imágenes de la galería
router.get('/images', async (req, res) => {
  try {
    console.log("📸 Obteniendo imágenes de la galería...");
    
    const { limit, skip = 0, event_id } = req.query;
    
    // Validar parámetros
    const limitNum = limit ? parseInt(limit) : null;
    const skipNum = parseInt(skip);
    
    if (limitNum && (limitNum < 1 || limitNum > 100)) {
      return res.status(400).json({
        error: true,
        message: "El límite debe estar entre 1 y 100"
      });
    }
    
    if (skipNum < 0) {
      return res.status(400).json({
        error: true,
        message: "El skip no puede ser negativo"
      });
    }
    
    // Obtener imágenes
    const images = await getAllGalleryImages(limitNum, skipNum, event_id);
    
    console.log(`✅ ${images.length} imágenes obtenidas`);
    
    res.json({
      success: true,
      images: images,
      pagination: {
        limit: limitNum,
        skip: skipNum,
        total: images.length
      }
    });
    
  } catch (error) {
    console.error("❌ Error al obtener imágenes:", error);
    res.status(500).json({
      error: true,
      message: "Error interno del servidor al obtener imágenes",
      details: error.message
    });
  }
});

// GET /gallery/stats - Obtener estadísticas de la galería
router.get('/stats', async (req, res) => {
  try {
    console.log("📊 Obteniendo estadísticas de la galería...");
    
    const stats = await getGalleryStats();
    
    console.log("✅ Estadísticas obtenidas:", stats);
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error("❌ Error al obtener estadísticas:", error);
    res.status(500).json({
      error: true,
      message: "Error interno del servidor al obtener estadísticas",
      details: error.message
    });
  }
});

// DELETE /gallery/cleanup - Limpieza manual de imágenes antiguas
router.delete('/cleanup', async (req, res) => {
  try {
    console.log("🧹 Iniciando limpieza manual de la galería...");
    
    const cleanupResult = await cleanupOldImages();
    
    console.log("✅ Limpieza manual completada:", cleanupResult);
    
    res.json({
      success: true,
      message: `Limpieza completada: ${cleanupResult.deleted} imágenes eliminadas`,
      cleanup: cleanupResult
    });
    
  } catch (error) {
    console.error("❌ Error durante limpieza manual:", error);
    res.status(500).json({
      error: true,
      message: "Error interno del servidor durante la limpieza",
      details: error.message
    });
  }
});

// DELETE /gallery/images/:id - Eliminar imagen específica
router.delete('/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🗑️ Eliminando imagen:", id);
    
    if (!id) {
      return res.status(400).json({
        error: true,
        message: "ID de imagen requerido"
      });
    }
    
    const result = await deleteGalleryImage(id);
    
    console.log("✅ Imagen eliminada exitosamente");
    
    res.json({
      success: true,
      message: "Imagen eliminada exitosamente",
      deletedImage: result.deletedImage
    });
    
  } catch (error) {
    console.error("❌ Error al eliminar imagen:", error);
    
    if (error.message === "Imagen no encontrada") {
      return res.status(404).json({
        error: true,
        message: "Imagen no encontrada"
      });
    }
    
    res.status(500).json({
      error: true,
      message: "Error interno del servidor al eliminar imagen",
      details: error.message
    });
  }
});

// GET /gallery/image/:id/:version - Obtener imagen específica en diferentes versiones
router.get('/image/:id/:version?', async (req, res) => {
  try {
    const { id, version = 'original' } = req.params;
    console.log("🖼️ Obteniendo imagen:", id, "versión:", version);
    
    if (!id) {
      return res.status(400).json({
        error: true,
        message: "ID de imagen requerido"
      });
    }
    
    // Buscar la imagen en la base de datos
    const image = await GalleryImage.findById(id);
    if (!image) {
      return res.status(404).json({
        error: true,
        message: "Imagen no encontrada"
      });
    }
    
    // Determinar qué versión servir
    let targetVersion = null;
    let filePath = null;
    
    switch (version) {
      case 'thumbnail':
        if (image.versions.thumbnail) {
          targetVersion = image.versions.thumbnail;
          filePath = path.join(GALLERY_CONFIG.SERVER_PATH, targetVersion.filename);
        }
        break;
      case 'original':
        if (image.versions.original_compressed) {
          targetVersion = image.versions.original_compressed;
          filePath = path.join(GALLERY_CONFIG.SERVER_PATH, targetVersion.filename);
        }
        break;
      default:
        return res.status(400).json({
          error: true,
          message: "Versión no válida. Use: thumbnail u original"
        });
    }
    
    if (!targetVersion || !filePath) {
      return res.status(404).json({
        error: true,
        message: `Versión ${version} no encontrada para esta imagen`
      });
    }
    
    // Verificar que el archivo existe
    try {
      await fs.access(filePath);
    } catch (accessError) {
      console.error("❌ Archivo no encontrado:", filePath);
      return res.status(404).json({
        error: true,
        message: "Archivo de imagen no encontrado en el servidor"
      });
    }
    
    // Configurar headers para la respuesta
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache por 1 año
    res.setHeader('Content-Length', targetVersion.size);
    
    // Enviar el archivo
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("❌ Error al enviar archivo:", err);
        if (!res.headersSent) {
          res.status(500).json({
            error: true,
            message: "Error al servir el archivo de imagen"
          });
        }
      } else {
        console.log("✅ Imagen servida exitosamente:", targetVersion.filename);
      }
    });
    
  } catch (error) {
    console.error("❌ Error al obtener imagen:", error);
    res.status(500).json({
      error: true,
      message: "Error interno del servidor al obtener imagen",
      details: error.message
    });
  }
});

// GET /gallery/config - Obtener configuración de la galería
router.get('/config', (req, res) => {
  try {
    console.log("⚙️ Obteniendo configuración de la galería...");
    
    res.json({
      success: true,
      config: {
        maxImages: GALLERY_CONFIG.MAX_IMAGES,
        maxFileSize: GALLERY_CONFIG.MAX_FILE_SIZE,
        supportedFormats: GALLERY_CONFIG.SUPPORTED_FORMATS,
        webpQuality: GALLERY_CONFIG.WEBP_QUALITY,
        serverPath: GALLERY_CONFIG.SERVER_PATH,
        frontendPath: GALLERY_CONFIG.FRONTEND_PATH
      }
    });
    
  } catch (error) {
    console.error("❌ Error al obtener configuración:", error);
    res.status(500).json({
      error: true,
      message: "Error interno del servidor al obtener configuración",
      details: error.message
    });
  }
});

// GET /gallery/test - Endpoint de prueba para verificar el sistema
router.get('/test', async (req, res) => {
  try {
    console.log("🧪 Ejecutando prueba del sistema de galería...");
    
    const { createGalleryDirectory } = require('../utils/galleryManager');
    
    // Probar creación de directorio
    await createGalleryDirectory();
    
    res.json({
      success: true,
      message: "Sistema de galería funcionando correctamente",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Error en prueba del sistema:", error);
    res.status(500).json({
      error: true,
      message: "Error en el sistema de galería",
      details: error.message
    });
  }
});

// Middleware para manejar errores de Multer
router.use(handleMulterError);

module.exports = router;
