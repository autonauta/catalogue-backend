const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);
// Socket.IO se obtiene de la instancia de la app

// Middleware de autenticación deshabilitado para pruebas
// const auth = require("../middleware/auth");

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/temp");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB límite
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|heic|heif|tiff|bmp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de imagen (JPG, PNG, HEIC, TIFF, BMP)"));
    }
  },
});

// Modelos
const ProcessingJob = require("../models/ProcessingJob");

// Para pruebas: usar un userId fijo
const TEST_USER_ID = "507f1f77bcf86cd799439011"; // ObjectId fijo para pruebas

// Función para emitir progreso via Socket.IO
function emitProgress(io, jobId, type, data) {
  if (io) {
    const eventData = {
      jobId,
      type, // 'upload', 'processing', 'file-progress', 'completed'
      data,
      timestamp: new Date().toISOString()
    };
    
    console.log(`📡 Emitiendo evento Socket.IO:`, {
      type: eventData.type,
      jobId: eventData.jobId,
      fileIndex: data.fileIndex,
      progress: data.progress
    });
    
    io.emit('processing-progress', eventData);
  } else {
    console.error('❌ Socket.IO no disponible para emitir evento');
  }
}

/**
 * @route POST /api/v1/image-processing/process
 * @desc Procesar imágenes con IA
 * @access Private
 */
router.post("/process", upload.array("images", 20), async (req, res) => {
  try {
    const { 
      quality = "standard", 
      convertHeic = true,
      corrections = "[]",
      analysis = "[]"
    } = req.body;
    const userId = TEST_USER_ID; // Usar userId fijo para pruebas
    const io = req.app.get('io'); // Obtener instancia de Socket.IO
    
    // Parsear configuración profesional
    let selectedCorrections = [];
    let selectedAnalysis = [];
    
    try {
      selectedCorrections = JSON.parse(corrections);
      selectedAnalysis = JSON.parse(analysis);
    } catch (error) {
      console.error('Error parseando configuración:', error);
      // Usar valores por defecto
      selectedCorrections = ['whiteBalance', 'exposureCorrection', 'contrastEnhancement', 'noiseReduction'];
      selectedAnalysis = ['histogramAnalysis', 'exposureAnalysis', 'colorAnalysis'];
    }
    
    console.log('Configuración profesional:', {
      quality,
      corrections: selectedCorrections,
      analysis: selectedAnalysis
    });
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No se proporcionaron archivos de imagen"
      });
    }

    // Crear job ID único
    const jobId = uuidv4();
    const tempDir = path.join(__dirname, "../uploads/temp", jobId);
    const outputDir = path.join(__dirname, "../uploads/processed", jobId);
    
    // Emitir inicio de procesamiento
    emitProgress(io, jobId, 'upload', {
      message: 'Iniciando subida de archivos...',
      totalFiles: req.files.length,
      currentFile: 0
    });
    
    // Crear directorios
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    // Mover archivos a directorio temporal con progreso
    const inputPaths = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const newPath = path.join(tempDir, file.originalname);
      fs.renameSync(file.path, newPath);
      inputPaths.push(newPath);
      
      // Emitir progreso de subida individual
      const uploadProgressData = {
        message: `Subiendo archivo ${i + 1} de ${req.files.length}`,
        totalFiles: req.files.length,
        currentFile: i + 1,
        fileName: file.originalname,
        fileSize: file.size,
        fileIndex: i,
        progress: Math.round(((i + 1) / req.files.length) * 100)
      };
      
      console.log(`📤 Enviando progreso de subida para archivo ${i}:`, uploadProgressData);
      emitProgress(io, jobId, 'file-progress', uploadProgressData);
    }

    // Ejecutar procesamiento con Python
    const pythonScript = path.join(__dirname, "../process_images_api.py");
    const convertHeicFlag = convertHeic === 'true' ? '--convert-heic' : '';
    const correctionsFlag = `--corrections "${JSON.stringify(selectedCorrections)}"`;
    const analysisFlag = `--analysis "${JSON.stringify(selectedAnalysis)}"`;
    const command = `./venv/bin/python "${pythonScript}" --quality "${quality}" ${convertHeicFlag} ${correctionsFlag} ${analysisFlag} "${tempDir}" "${outputDir}"`;

    console.log(`Iniciando procesamiento para job ${jobId}...`);
    
    // Emitir inicio de procesamiento
    emitProgress(io, jobId, 'processing', {
      message: 'Iniciando procesamiento con IA...',
      progress: 0,
      totalFiles: req.files.length,
      currentFile: 0
    });
    
    // Ejecutar procesamiento con progreso en tiempo real
    const pythonProcess = spawn('./venv/bin/python', [
      pythonScript,
      '--quality', quality,
      ...(convertHeic === 'true' ? ['--convert-heic'] : []),
      '--corrections', JSON.stringify(selectedCorrections),
      '--analysis', JSON.stringify(selectedAnalysis),
      tempDir,
      outputDir
    ], {
      cwd: path.join(__dirname, '..')
    });

    let processingOutput = '';
    let currentFileIndex = 0;

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      processingOutput += output;
      
      console.log('🐍 Salida de Python:', output);
      
      // Buscar patrones de progreso en la salida de Python
      console.log('🔍 Buscando patrón en:', output);
      console.log('🔍 ¿Contiene "Imagen procesada exitosamente:"?', output.includes('Imagen procesada exitosamente:'));
      
      if (output.includes('Imagen procesada exitosamente:')) {
        console.log('✅ Patrón detectado! Enviando progreso...');
        currentFileIndex++;
        const progress = Math.round((currentFileIndex / req.files.length) * 100);
        
        const processingProgressData = {
          message: `Procesando imagen ${currentFileIndex} de ${req.files.length}`,
          progress: progress,
          totalFiles: req.files.length,
          currentFile: currentFileIndex,
          fileName: output.match(/Imagen procesada exitosamente: (.+)/)?.[1] || `Imagen ${currentFileIndex}`,
          fileIndex: currentFileIndex - 1 // Índice basado en 0
        };
        
        console.log(`📤 Enviando progreso de procesamiento para archivo ${currentFileIndex - 1}:`, processingProgressData);
        emitProgress(io, jobId, 'file-progress', processingProgressData);
      } else {
        console.log('❌ Patrón no detectado en esta salida');
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('🐍 Salida de Python (stderr):', output);
      
      // Buscar patrones de progreso en stderr también
      console.log('🔍 Buscando patrón en stderr:', output);
      console.log('🔍 ¿Contiene "Imagen procesada exitosamente:"?', output.includes('Imagen procesada exitosamente:'));
      
      if (output.includes('Imagen procesada exitosamente:')) {
        console.log('✅ Patrón detectado en stderr! Enviando progreso...');
        currentFileIndex++;
        const progress = Math.round((currentFileIndex / req.files.length) * 100);
        
        const processingProgressData = {
          message: `Procesando imagen ${currentFileIndex} de ${req.files.length}`,
          progress: progress,
          totalFiles: req.files.length,
          currentFile: currentFileIndex,
          fileName: output.match(/Imagen procesada exitosamente: (.+)/)?.[1] || `Imagen ${currentFileIndex}`,
          fileIndex: currentFileIndex - 1 // Índice basado en 0
        };
        
        console.log(`📤 Enviando progreso de procesamiento para archivo ${currentFileIndex - 1}:`, processingProgressData);
        emitProgress(io, jobId, 'file-progress', processingProgressData);
      } else {
        console.log('❌ Patrón no detectado en stderr');
      }
    });

    // Esperar a que termine el proceso
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Proceso terminó con código ${code}`));
        }
      });
    });

    // Leer resultados
    const resultFile = path.join(outputDir, "processing_result.json");
    let processingStats = {};
    
    if (fs.existsSync(resultFile)) {
      processingStats = JSON.parse(fs.readFileSync(resultFile, "utf8"));
    }

    // Emitir progreso de creación de ZIP
    emitProgress(io, jobId, 'processing', {
      message: 'Creando archivo ZIP...',
      progress: 95,
      totalFiles: req.files.length,
      currentFile: req.files.length
    });

    // Crear ZIP con resultados
    const zipPath = path.join(__dirname, "../uploads/zips", `${jobId}.zip`);
    fs.mkdirSync(path.dirname(zipPath), { recursive: true });
    
    const zipCommand = `cd "${outputDir}" && zip -r "${zipPath}" .`;
    await execAsync(zipCommand);

    // Limpiar archivos temporales
    setTimeout(() => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        fs.rmSync(outputDir, { recursive: true, force: true });
      } catch (error) {
        console.error("Error limpiando archivos temporales:", error);
      }
    }, 300000); // Limpiar después de 5 minutos

    // Guardar en base de datos
    const job = new ProcessingJob({
      jobId,
      userId,
      status: 'completed',
      inputFiles: req.files.length,
      outputFiles: processingStats.processed_successfully || 0,
      quality,
      processingTime: processingStats.processing_time_seconds || 0,
      fileSize: req.files.reduce((total, file) => total + file.size, 0)
    });
    await job.save();

    // Emitir finalización
    emitProgress(io, jobId, 'completed', {
      message: 'Procesamiento completado exitosamente',
      progress: 100,
      totalFiles: req.files.length,
      processedFiles: processingStats.processed_successfully || 0,
      processingTime: processingStats.processing_time_seconds || 0,
      downloadUrl: `/api/v1/image-processing/download/${jobId}`
    });

    res.json({
      success: true,
      jobId,
      message: "Procesamiento completado exitosamente",
      stats: processingStats,
      downloadUrl: `/api/v1/image-processing/download/${jobId}`
    });

  } catch (error) {
    console.error("Error en procesamiento:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/image-processing/download/:jobId
 * @desc Descargar resultados procesados
 * @access Private
 */
router.get("/download/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = TEST_USER_ID; // Usar userId fijo para pruebas
    const zipPath = path.join(__dirname, "../uploads/zips", `${jobId}.zip`);
    
    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({
        success: false,
        message: "Archivo no encontrado o expirado"
      });
    }

    // Verificar que el job pertenece al usuario
    const job = await ProcessingJob.findOne({ jobId, userId: userId });
    if (!job) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para descargar este archivo"
      });
    }

    res.download(zipPath, `processed_images_${jobId}.zip`, (err) => {
      if (err) {
        console.error("Error descargando archivo:", err);
        res.status(500).json({
          success: false,
          message: "Error descargando archivo"
        });
      }
    });

  } catch (error) {
    console.error("Error en descarga:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

/**
 * @route GET /api/v1/image-processing/status/:jobId
 * @desc Obtener estado del procesamiento
 * @access Private
 */
router.get("/status/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = TEST_USER_ID; // Usar userId fijo para pruebas
    
    // Obtener estado de la base de datos
    const job = await ProcessingJob.findOne({ jobId, userId: userId });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job no encontrado"
      });
    }

    res.json({
      success: true,
      jobId,
      status: job.status,
      progress: job.status === 'completed' ? 100 : 0,
      message: job.status === 'completed' ? "Procesamiento completado" : "Procesando...",
      inputFiles: job.inputFiles,
      outputFiles: job.outputFiles,
      processingTime: job.processingTime,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    });

  } catch (error) {
    console.error("Error obteniendo estado:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

/**
 * @route GET /api/v1/image-processing/formats
 * @desc Obtener formatos soportados
 * @access Public
 */
router.get("/formats", (req, res) => {
  res.json({
    success: true,
    formats: {
      input: [".jpg", ".jpeg", ".png", ".heic", ".heif", ".tiff", ".bmp"],
      output: ".jpg",
      qualityLevels: ["high", "medium", "fast"]
    }
  });
});

/**
 * @route POST /api/v1/image-processing/validate
 * @desc Validar archivos antes del procesamiento
 * @access Private
 */
router.post("/validate", upload.array("images", 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No se proporcionaron archivos"
      });
    }

    const validation = {
      totalFiles: req.files.length,
      validFiles: [],
      invalidFiles: [],
      totalSizeMB: 0,
      estimatedProcessingTime: 0
    };

    for (let file of req.files) {
      const fileInfo = {
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        valid: true
      };

      validation.totalSizeMB += file.size / (1024 * 1024);
      
      // Validar tamaño (máximo 50MB por archivo)
      if (file.size > 50 * 1024 * 1024) {
        fileInfo.valid = false;
        fileInfo.error = "Archivo demasiado grande (máximo 50MB)";
        validation.invalidFiles.push(fileInfo);
      } else {
        validation.validFiles.push(fileInfo);
      }
    }

    // Estimar tiempo de procesamiento (aproximado)
    validation.estimatedProcessingTime = Math.ceil(validation.totalSizeMB * 2); // 2 segundos por MB

    // Limpiar archivos temporales
    req.files.forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error("Error limpiando archivo temporal:", error);
      }
    });

    res.json({
      success: true,
      validation
    });

  } catch (error) {
    console.error("Error en validación:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

/**
 * @route GET /api/v1/image-processing/jobs
 * @desc Obtener historial de trabajos del usuario
 * @access Private
 */
router.get("/jobs", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const userId = TEST_USER_ID; // Usar userId fijo para pruebas
    
    const jobs = await ProcessingJob.getUserJobs(userId, parseInt(limit), parseInt(skip));
    const totalJobs = await ProcessingJob.countDocuments({ userId: userId });
    
    res.json({
      success: true,
      jobs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalJobs / limit),
        totalJobs,
        hasNext: skip + jobs.length < totalJobs,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Error obteniendo trabajos:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

/**
 * @route GET /api/v1/image-processing/stats
 * @desc Obtener estadísticas del usuario
 * @access Private
 */
router.get("/stats", async (req, res) => {
  try {
    const userId = TEST_USER_ID; // Usar userId fijo para pruebas
    const stats = await ProcessingJob.getUserStats(userId);
    
    res.json({
      success: true,
      stats: stats[0] || {
        totalJobs: 0,
        completedJobs: 0,
        totalImagesProcessed: 0,
        totalProcessingTime: 0,
        totalFileSize: 0
      }
    });

  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

/**
 * @route DELETE /api/v1/image-processing/jobs/:jobId
 * @desc Eliminar un trabajo específico
 * @access Private
 */
router.delete("/jobs/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = TEST_USER_ID; // Usar userId fijo para pruebas
    
    const job = await ProcessingJob.findOneAndDelete({ 
      jobId, 
      userId: userId 
    });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Trabajo no encontrado"
      });
    }
    
    // Eliminar archivos asociados
    const zipPath = path.join(__dirname, "../uploads/zips", `${jobId}.zip`);
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    
    res.json({
      success: true,
      message: "Trabajo eliminado exitosamente"
    });

  } catch (error) {
    console.error("Error eliminando trabajo:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

module.exports = router;
