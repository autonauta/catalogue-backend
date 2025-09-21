/**
 * Script de limpieza automática para archivos y trabajos expirados
 * Se ejecuta como cron job en el servidor
 */

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const config = require("config");
const ProcessingJob = require("../models/ProcessingJob");

// Conectar a la base de datos
const catalogueDB = config.get("ATLASDB");
mongoose.connect(catalogueDB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function cleanupExpiredJobs() {
  try {
    console.log("🧹 Iniciando limpieza de trabajos expirados...");
    
    // Obtener trabajos expirados
    const expiredJobs = await ProcessingJob.find({
      status: "completed",
      expiresAt: { $lt: new Date() }
    });
    
    console.log(`📊 Encontrados ${expiredJobs.length} trabajos expirados`);
    
    let deletedFiles = 0;
    let deletedJobs = 0;
    
    for (const job of expiredJobs) {
      try {
        // Eliminar archivo ZIP si existe
        const zipPath = path.join(__dirname, "../uploads/zips", `${job.jobId}.zip`);
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
          deletedFiles++;
          console.log(`🗑️  Eliminado archivo: ${job.jobId}.zip`);
        }
        
        // Eliminar registro de la base de datos
        await ProcessingJob.findByIdAndDelete(job._id);
        deletedJobs++;
        
      } catch (error) {
        console.error(`❌ Error limpiando trabajo ${job.jobId}:`, error.message);
      }
    }
    
    console.log(`✅ Limpieza completada: ${deletedJobs} trabajos y ${deletedFiles} archivos eliminados`);
    
  } catch (error) {
    console.error("❌ Error en limpieza:", error);
  } finally {
    mongoose.connection.close();
  }
}

async function cleanupOldTempFiles() {
  try {
    console.log("🧹 Limpiando archivos temporales antiguos...");
    
    const tempDir = path.join(__dirname, "../uploads/temp");
    const processedDir = path.join(__dirname, "../uploads/processed");
    
    let deletedDirs = 0;
    
    // Limpiar directorios temporales más antiguos de 1 hora
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const dir of [tempDir, processedDir]) {
      if (fs.existsSync(dir)) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory() && stats.mtime.getTime() < oneHourAgo) {
            try {
              fs.rmSync(itemPath, { recursive: true, force: true });
              deletedDirs++;
              console.log(`🗑️  Eliminado directorio temporal: ${item}`);
            } catch (error) {
              console.error(`❌ Error eliminando directorio ${item}:`, error.message);
            }
          }
        }
      }
    }
    
    console.log(`✅ Limpieza de archivos temporales completada: ${deletedDirs} directorios eliminados`);
    
  } catch (error) {
    console.error("❌ Error limpiando archivos temporales:", error);
  }
}

async function getStorageStats() {
  try {
    console.log("📊 Obteniendo estadísticas de almacenamiento...");
    
    const uploadsDir = path.join(__dirname, "../uploads");
    let totalSize = 0;
    let fileCount = 0;
    
    function calculateSize(dir) {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          calculateSize(itemPath);
        } else {
          totalSize += stats.size;
          fileCount++;
        }
      }
    }
    
    calculateSize(uploadsDir);
    
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    const totalSizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
    
    console.log(`📁 Almacenamiento total: ${totalSizeMB} MB (${totalSizeGB} GB)`);
    console.log(`📄 Total de archivos: ${fileCount}`);
    
    // Estadísticas de la base de datos
    const dbStats = await ProcessingJob.aggregate([
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          completedJobs: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          totalImagesProcessed: { $sum: "$outputFiles" },
          totalFileSize: { $sum: "$fileSize" }
        }
      }
    ]);
    
    if (dbStats.length > 0) {
      const stats = dbStats[0];
      console.log(`📊 Estadísticas de la base de datos:`);
      console.log(`   - Total trabajos: ${stats.totalJobs}`);
      console.log(`   - Trabajos completados: ${stats.completedJobs}`);
      console.log(`   - Imágenes procesadas: ${stats.totalImagesProcessed}`);
      console.log(`   - Tamaño total procesado: ${(stats.totalFileSize / (1024 * 1024)).toFixed(2)} MB`);
    }
    
  } catch (error) {
    console.error("❌ Error obteniendo estadísticas:", error);
  }
}

// Función principal
async function main() {
  console.log("🚀 Iniciando limpieza automática del sistema de procesamiento de imágenes");
  console.log(`⏰ Fecha: ${new Date().toISOString()}`);
  
  try {
    await cleanupExpiredJobs();
    await cleanupOldTempFiles();
    await getStorageStats();
    
    console.log("✅ Limpieza automática completada exitosamente");
    
  } catch (error) {
    console.error("❌ Error en limpieza automática:", error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  cleanupExpiredJobs,
  cleanupOldTempFiles,
  getStorageStats
};
