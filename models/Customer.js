const mongoose = require("mongoose");
const { crmDB } = require("../index");

const customerSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "Es necesario proporcionar su nombre completo."],
    },
    email: {
      type: String,
      required: [
        true,
        "Es necesario proporcionar su dirección de correo electrónico",
      ],
      unique: true,
      lowercase: true,
    },
    empresa: {
      type: String,
    },
    telefono: {
      type: String,
      unique: true,
      required: true,
    },
    consumo: {
      type: String,
    },
  },
  { timestamps: true }
);

// Espera a que la conexión esté lista para definir el modelo
crmDB.once("open", () => {
  const Customer = crmDB.model("Customer", customerSchema);
  module.exports.Customer = Customer;
});
