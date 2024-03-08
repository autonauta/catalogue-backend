import mongoose from "mongoose";
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

const Customer = crmDB.model("Customer", customerSchema);

export default Customer;
