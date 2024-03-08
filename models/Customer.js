const mongoose = require("mongoose");
const { crmDBPromise, crmDB } = require("../index");

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

let Customer = null;

// Usamos la promesa para esperar a que la conexión esté lista antes de definir el modelo
crmDBPromise
  .then(() => {
    Customer = crmDB.model("Customer", customerSchema);
  })
  .catch((err) => console.error("Error conectando a la DB:", err));
// Exportamos una función que maneja la espera del modelo a ser disponible
module.exports = async () => {
  if (!Customer) {
    await crmDBPromise; // Espera en caso de que se intente acceder al modelo antes de que la conexión esté lista
    if (!Customer) {
      // Verifica de nuevo por si hubo un error inicial
      throw new Error(
        "La conexión a la base de datos falló y el modelo no está disponible."
      );
    }
  }
  return Customer;
};
