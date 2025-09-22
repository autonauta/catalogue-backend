const mongoose = require("mongoose");

const processingJobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Asumiendo que tienes un modelo User
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending",
    index: true
  },
  inputFiles: {
    type: Number,
    required: true,
    min: 1
  },
  outputFiles: {
    type: Number,
    default: 0
  },
  quality: {
    type: String,
    enum: ["professional", "standard", "fast"],
    default: "standard"
  },
  convertHeic: {
    type: Boolean,
    default: true
  },
  processingTime: {
    type: Number, // en segundos
    default: 0
  },
  fileSize: {
    type: Number, // en bytes
    default: 0
  },
  errorMessage: {
    type: String,
    default: null
  },
  downloadUrl: {
    type: String,
    default: null
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Los archivos expiran en 7 días
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    },
    index: { expireAfterSeconds: 0 } // TTL index para limpieza automática
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Índices compuestos para consultas eficientes
processingJobSchema.index({ userId: 1, status: 1 });
processingJobSchema.index({ userId: 1, createdAt: -1 });
processingJobSchema.index({ status: 1, createdAt: 1 });

// Método para actualizar el estado del trabajo
processingJobSchema.methods.updateStatus = function(status, additionalData = {}) {
  this.status = status;
  
  if (status === "completed") {
    this.completedAt = new Date();
  }
  
  // Actualizar campos adicionales si se proporcionan
  Object.assign(this, additionalData);
  
  return this.save();
};

// Método estático para obtener trabajos de un usuario
processingJobSchema.statics.getUserJobs = function(userId, limit = 10, skip = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .select("-__v");
};

// Método estático para obtener estadísticas de un usuario
processingJobSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        completedJobs: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
        },
        totalImagesProcessed: { $sum: "$outputFiles" },
        totalProcessingTime: { $sum: "$processingTime" },
        totalFileSize: { $sum: "$fileSize" }
      }
    }
  ]);
};

// Método estático para limpiar trabajos expirados
processingJobSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    status: "completed",
    expiresAt: { $lt: new Date() }
  });
};

// Pre-save middleware para generar downloadUrl
processingJobSchema.pre("save", function(next) {
  if (this.status === "completed" && !this.downloadUrl) {
    this.downloadUrl = `/api/v1/image-processing/download/${this.jobId}`;
  }
  next();
});

module.exports = mongoose.model("ProcessingJob", processingJobSchema);
