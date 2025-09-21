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

/**
 * @route POST /api/v1/image-processing/process
 * @desc Procesar imágenes con IA
 * @access Private
 */
router.post("/process", upload.array("images", 20), async (req, res) => {
  try {
    const { quality = "high", convertHeic = true } = req.body;
    const userId = "test-user"; // Usuario temporal para pruebas
    
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
    
    // Crear directorios
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    // Mover archivos a directorio temporal
    const inputPaths = [];
    for (let file of req.files) {
      const newPath = path.join(tempDir, file.originalname);
      fs.renameSync(file.path, newPath);
      inputPaths.push(newPath);
    }

    // Ejecutar procesamiento con Python
    const pythonScript = path.join(__dirname, "../process_images_api.py");
    const command = `./venv/bin/python "${pythonScript}" "${tempDir}" "${outputDir}" "${quality}" "${convertHeic}"`;

    console.log(`Iniciando procesamiento para job ${jobId}...`);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error("Error en procesamiento:", stderr);
    }

    // Leer resultados
    const resultFile = path.join(outputDir, "processing_result.json");
    let processingStats = {};
    
    if (fs.existsSync(resultFile)) {
      processingStats = JSON.parse(fs.readFileSync(resultFile, "utf8"));
    }

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
    const zipPath = path.join(__dirname, "../uploads/zips", `${jobId}.zip`);
    
    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({
        success: false,
        message: "Archivo no encontrado o expirado"
      });
    }

    // Verificar que el job pertenece al usuario
    const job = await ProcessingJob.findOne({ jobId, userId: "test-user" });
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
    
    // Obtener estado de la base de datos
    const job = await ProcessingJob.findOne({ jobId, userId: "test-user" });
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
    
    const jobs = await ProcessingJob.getUserJobs("test-user", parseInt(limit), parseInt(skip));
    const totalJobs = await ProcessingJob.countDocuments({ userId: "test-user" });
    
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
    const stats = await ProcessingJob.getUserStats("test-user");
    
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
    
    const job = await ProcessingJob.findOneAndDelete({ 
      jobId, 
      userId: "test-user" 
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
