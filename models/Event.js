const mongoose = require("mongoose");
const config = require("config");

// Crear conexión específica para la base de datos de eventos (exodusDB)
const exodusConnection = mongoose.createConnection(config.get("ATLASDB2"), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const eventSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, "El nombre del evento es obligatorio"],
      trim: true,
      maxlength: [100, "El nombre no puede exceder 100 caracteres"]
    },
    location: { 
      type: String, 
      required: [true, "La ubicación es obligatoria"],
      trim: true,
      maxlength: [200, "La ubicación no puede exceder 200 caracteres"]
    },
    departure_location: { 
      type: String, 
      trim: true,
      maxlength: [200, "El lugar de salida no puede exceder 200 caracteres"]
    },
    event_start_date: { 
      type: Date,
      validate: {
        validator: function(value) {
          return !this.event_end_date || value <= this.event_end_date;
        },
        message: "La fecha de inicio debe ser anterior o igual a la fecha de fin"
      }
    },
    event_end_date: { 
      type: Date,
      validate: {
        validator: function(value) {
          return !this.event_start_date || value >= this.event_start_date;
        },
        message: "La fecha de fin debe ser posterior o igual a la fecha de inicio"
      }
    },
    img: { 
      type: String,
      validate: {
        validator: function(value) {
          if (!value) return true; // Permitir vacío
          return /\.(jpg|jpeg|png|gif|webp)$/i.test(value);
        },
        message: "La imagen debe ser un archivo válido (jpg, jpeg, png, gif, webp)"
      }
    },
    img_secondary: { 
      type: String,
      validate: {
        validator: function(value) {
          if (!value) return true; // Permitir vacío
          return /\.(jpg|jpeg|png|gif|webp)$/i.test(value);
        },
        message: "La imagen secundaria debe ser un archivo válido (jpg, jpeg, png, gif, webp)"
      }
    },
    img_terciary: { 
      type: String,
      validate: {
        validator: function(value) {
          if (!value) return true; // Permitir vacío
          return /\.(jpg|jpeg|png|gif|webp)$/i.test(value);
        },
        message: "La imagen terciaria debe ser un archivo válido (jpg, jpeg, png, gif, webp)"
      }
    },
    description: { 
      type: String,
      trim: true,
      maxlength: [1000, "La descripción no puede exceder 1000 caracteres"]
    },
    includes: [{
      type: String,
      trim: true,
      maxlength: [200, "Cada elemento incluido no puede exceder 200 caracteres"],
      validate: {
        validator: function(value) {
          return value && value.length > 0;
        },
        message: "Los elementos incluidos no pueden estar vacíos"
      }
    }],
    price: {
      early_bird: { 
        type: Number,
        min: [0, "El precio early bird no puede ser negativo"],
        validate: {
          validator: function(value) {
            return !this.full_price || value <= this.full_price;
          },
          message: "El precio early bird debe ser menor o igual al precio completo"
        }
      },
      full_price: { 
        type: Number,
        min: [0, "El precio completo no puede ser negativo"],
        validate: {
          validator: function(value) {
            return !this.early_bird || value >= this.early_bird;
          },
          message: "El precio completo debe ser mayor o igual al precio early bird"
        }
      }
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "published", "cancelled", "completed"],
        message: "El estado debe ser: draft, published, cancelled o completed"
      },
      default: "draft"
    },
    max_participants: {
      type: Number,
      min: [1, "Debe permitir al menos 1 participante"],
      max: [1000, "No puede exceder 1000 participantes"]
    },
    current_participants: [{
      type: String,
      trim: true,
      maxlength: [100, "El nombre del participante no puede exceder 100 caracteres"],
      validate: {
        validator: function(value) {
          return value && value.length > 0;
        },
        message: "El nombre del participante no puede estar vacío"
      }
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para mejorar el rendimiento
eventSchema.index({ name: 1 });
eventSchema.index({ location: 1 });
eventSchema.index({ event_start_date: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ "price.full_price": 1 });

// Virtual para obtener el número de participantes
eventSchema.virtual('participant_count').get(function() {
  return this.current_participants ? this.current_participants.length : 0;
});

// Virtual para verificar si el evento está lleno
eventSchema.virtual('is_full').get(function() {
  return this.max_participants && this.participant_count >= this.max_participants;
});

// Virtual para verificar si el evento está disponible
eventSchema.virtual('is_available').get(function() {
  return this.status === 'published' && !this.is_full;
});

// Método para agregar un participante
eventSchema.methods.addParticipant = function(participantName) {
  if (!participantName || typeof participantName !== 'string' || participantName.trim().length === 0) {
    throw new Error('El nombre del participante es requerido');
  }
  
  if (this.is_full) {
    throw new Error('El evento está lleno');
  }
  
  // Verificar si el participante ya está registrado
  if (this.current_participants && this.current_participants.includes(participantName.trim())) {
    throw new Error('Este participante ya está registrado en el evento');
  }
  
  if (!this.current_participants) {
    this.current_participants = [];
  }
  
  this.current_participants.push(participantName.trim());
  return this.save();
};

// Método para remover un participante
eventSchema.methods.removeParticipant = function(participantName) {
  if (!participantName || typeof participantName !== 'string') {
    throw new Error('El nombre del participante es requerido');
  }
  
  if (!this.current_participants || this.current_participants.length === 0) {
    throw new Error('No hay participantes registrados');
  }
  
  const index = this.current_participants.indexOf(participantName.trim());
  if (index === -1) {
    throw new Error('El participante no está registrado en este evento');
  }
  
  this.current_participants.splice(index, 1);
  return this.save();
};

// Método para verificar si un participante está registrado
eventSchema.methods.isParticipantRegistered = function(participantName) {
  if (!this.current_participants || !participantName) {
    return false;
  }
  return this.current_participants.includes(participantName.trim());
};

// Middleware pre-save para validaciones adicionales
eventSchema.pre('save', function(next) {
  // Si no hay fecha de fin, usar la fecha de inicio
  if (this.event_start_date && !this.event_end_date) {
    this.event_end_date = this.event_start_date;
  }
  
  // Truncar elementos de includes que excedan 200 caracteres
  if (this.includes && Array.isArray(this.includes)) {
    this.includes = this.includes.map(item => {
      if (typeof item === 'string' && item.length > 200) {
        return item.substring(0, 197) + '...';
      }
      return item;
    }).filter(item => item && item.trim().length > 0);
  }
  
  next();
});

// Middleware pre-update para validaciones adicionales
eventSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate();
  
  // Truncar elementos de includes que excedan 200 caracteres
  if (update && update.includes && Array.isArray(update.includes)) {
    update.includes = update.includes.map(item => {
      if (typeof item === 'string' && item.length > 200) {
        return item.substring(0, 197) + '...';
      }
      return item;
    }).filter(item => item && item.trim().length > 0);
  }
  
  next();
});

// Usar la conexión específica para crear el modelo
const Event = exodusConnection.model("Event", eventSchema);

// Agregar eventos de conexión para monitoreo
exodusConnection.on('connected', () => {
  console.log("✅ Conexión a exodusDB (ATLASDB2) establecida para eventos");
});

exodusConnection.on('error', (err) => {
  console.log("❌ Error en conexión a exodusDB (ATLASDB2):", err.message);
});

module.exports.Event = Event;
