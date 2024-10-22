const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "Es necesario proporcionar su nombre completo."],
      trim: true, // Eliminar espacios en blanco
    },
    email: {
      type: String,
      required: [
        true,
        "Es necesario proporcionar su dirección de correo electrónico",
      ],
      unique: true,
      lowercase: true,
      trim: true, // Eliminar espacios en blanco
      match: [/.+@.+\..+/, "Por favor ingrese un correo electrónico válido."], // Validación de formato
    },
    empresa: {
      type: String,
      trim: true, // Eliminar espacios en blanco
    },
    telefono: {
      type: String,
      unique: true,
      required: true,
      trim: true, // Eliminar espacios en blanco
    },
    consumo: {
      type: Number,
      min: 0, // Asegurarse de que el consumo no sea negativo
    },
    mensaje: {
      type: String,
      trim: true, // Eliminar espacios en blanco
    },
  },
  { timestamps: true }
);
let crmDB = mongoose.connection.useDb("crm");

const Customer = crmDB.model("Customer", customerSchema);

module.exports.Customer = Customer;
