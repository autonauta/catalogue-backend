const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configuración de Multer para galería
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Crear directorio temporal si no existe
      const tempDir = '/tmp/gallery_uploads';
      await fs.mkdir(tempDir, { recursive: true });
      cb(null, tempDir);
    } catch (error) {
      console.error("Error al crear directorio temporal:", error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generar nombre único para archivo temporal
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(file.originalname);
    const filename = `temp_${timestamp}_${random}${extension}`;
    cb(null, filename);
  }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|bmp|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, BMP, WebP)'), false);
  }
};

// Configuración de Multer
const galleryUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 30 // Máximo 30 archivos por request
  },
  fileFilter: fileFilter
});

// Middleware para manejar errores de Multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: true,
        message: 'El archivo es demasiado grande. Máximo 10MB por imagen.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: true,
        message: 'Demasiados archivos. Máximo 30 imágenes por request.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: true,
        message: 'Campo de archivo inesperado.'
      });
    }
  }
  
  if (error.message.includes('Solo se permiten archivos de imagen')) {
    return res.status(400).json({
      error: true,
      message: 'Solo se permiten archivos de imagen (JPEG, PNG, GIF, BMP, WebP).'
    });
  }
  
  console.error("Error en middleware de galería:", error);
  res.status(500).json({
    error: true,
    message: 'Error interno del servidor al procesar archivos.'
  });
};

module.exports = {
  galleryUpload,
  handleMulterError
};
