const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const config = require("config");

// Crear conexión específica para la base de datos de usuarios de Exodus (exodusDB)
const exodusConnection = mongoose.createConnection(config.get("ATLASDB2"), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const exodusUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: [2, "El nombre debe tener al menos 2 caracteres"],
    maxlength: [50, "El nombre no puede exceder 50 caracteres"]
  },
  rol: {
    type: String,
    enum: ["admin", "client"],
    default: "client",
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /.+@.+\..+/,
  },
  password: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hashear contraseña antes de guardar
exodusUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Ocultar la contraseña al devolver el objeto
exodusUserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Usar la conexión específica para crear el modelo
const ExodusUser = exodusConnection.model("ExodusUser", exodusUserSchema);

// Agregar eventos de conexión para monitoreo
exodusConnection.on('connected', () => {
  console.log("✅ Conexión a exodusDB (ATLASDB2) establecida para usuarios de Exodus");
});

exodusConnection.on('error', (err) => {
  console.log("❌ Error en conexión a exodusDB (ATLASDB2) para usuarios de Exodus:", err.message);
});

module.exports = { ExodusUser };
