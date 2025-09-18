const mongoose = require('mongoose');

// Obtener la conexión de Exodus
const { exodusConnection } = require('../index');

const galleryImageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, "El nombre del archivo es requerido"],
    trim: true
  },
  path: {
    type: String,
    required: [true, "La ruta del archivo es requerida"],
    trim: true
  },
  original_filename: {
    type: String,
    required: [true, "El nombre original del archivo es requerido"],
    trim: true
  },
  upload_date: {
    type: Date,
    default: Date.now,
    index: true
  },
  file_size: {
    type: Number,
    required: [true, "El tamaño del archivo es requerido"]
  },
  original_size: {
    type: Number,
    required: [true, "El tamaño original del archivo es requerido"]
  },
  compression_ratio: {
    type: Number,
    default: 0
  },
  dimensions: {
    width: {
      type: Number,
      required: [true, "El ancho de la imagen es requerido"]
    },
    height: {
      type: Number,
      required: [true, "La altura de la imagen es requerida"]
    }
  },
  format: {
    type: String,
    enum: ['webp', 'jpeg', 'png'],
    default: 'webp'
  },
  quality: {
    type: Number,
    min: 1,
    max: 100,
    default: 85
  },
  is_compressed: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0,
    index: true
  },
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, "El ID del evento es requerido"],
    index: true
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
galleryImageSchema.index({ upload_date: -1 });
galleryImageSchema.index({ order: -1 });
galleryImageSchema.index({ format: 1 });
galleryImageSchema.index({ event_id: 1 });
galleryImageSchema.index({ event_id: 1, upload_date: -1 }); // Índice compuesto para filtros por evento

// Virtual para URL completa
galleryImageSchema.virtual('url').get(function() {
  return `/files/galery/${this.filename}`;
});

// Virtual para ratio de compresión en porcentaje
galleryImageSchema.virtual('compression_percentage').get(function() {
  if (this.original_size > 0) {
    return Math.round(((this.original_size - this.file_size) / this.original_size) * 100);
  }
  return 0;
});

// Método para obtener información de la imagen
galleryImageSchema.methods.getImageInfo = function() {
  return {
    id: this._id,
    filename: this.filename,
    path: this.path,
    url: this.url,
    upload_date: this.upload_date,
    file_size: this.file_size,
    original_size: this.original_size,
    compression_percentage: this.compression_percentage,
    dimensions: this.dimensions,
    format: this.format,
    quality: this.quality,
    is_compressed: this.is_compressed,
    order: this.order,
    event_id: this.event_id
  };
};

// Método estático para obtener el siguiente orden
galleryImageSchema.statics.getNextOrder = async function() {
  const lastImage = await this.findOne().sort({ order: -1 });
  return lastImage ? lastImage.order + 1 : 1;
};

// Método estático para limpiar imágenes antiguas
galleryImageSchema.statics.cleanupOldImages = async function(maxImages = 1000) {
  const totalImages = await this.countDocuments();
  
  if (totalImages > maxImages) {
    const imagesToDelete = totalImages - maxImages;
    const oldestImages = await this.find()
      .sort({ upload_date: 1 })
      .limit(imagesToDelete);
    
    return oldestImages;
  }
  
  return [];
};

// Pre-save middleware para actualizar orden si no se especifica
galleryImageSchema.pre('save', async function(next) {
  if (this.isNew && this.order === 0) {
    this.order = await this.constructor.getNextOrder();
  }
  next();
});

module.exports = exodusConnection.model('GalleryImage', galleryImageSchema);
