/**
 * Configuración del servidor de procesamiento de imágenes
 */

module.exports = {
  // Configuración de Python
  python: {
    // Ruta al ejecutable de Python (ajustar según el servidor)
    executable: process.env.PYTHON_PATH || 'python3',
    // Scripts de procesamiento
    scripts: {
      imageProcessor: './image_processor.py',
      heicConverter: './heic_converter.py',
      processingService: './processing_service.py',
      processImagesAPI: './process_images_api.py'
    }
  },

  // Configuración de archivos
  uploads: {
    // Directorio base de uploads
    baseDir: './uploads',
    // Directorios específicos
    temp: './uploads/temp',
    processed: './uploads/processed',
    zips: './uploads/zips',
    // Límites
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 20,
    // Formatos permitidos
    allowedFormats: ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.tiff', '.bmp']
  },

  // Configuración de procesamiento
  processing: {
    // Niveles de calidad disponibles
    qualityLevels: ['high', 'medium', 'fast'],
    // Calidad por defecto
    defaultQuality: 'high',
    // Conversión HEIC por defecto
    defaultConvertHeic: true,
    // Tiempo de expiración de archivos (en días)
    expirationDays: 7,
    // Tiempo de limpieza de archivos temporales (en horas)
    tempCleanupHours: 1
  },

  // Configuración de limpieza automática
  cleanup: {
    // Habilitar limpieza automática
    enabled: true,
    // Intervalo de limpieza (en horas)
    intervalHours: 1,
    // Script de limpieza
    script: './utils/cleanup.js'
  },

  // Configuración de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: './logs/processing.log',
    maxSize: '10m',
    maxFiles: 5
  }
};
