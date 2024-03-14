const mongoose = require("mongoose");
// const User = require('./userModel');
// const validator = require('validator');

const frameSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio."],
    },
    syId: {
      type: String,
      required: [true, "El El id de syscom es obligatorio."],
    },
    marca: {
      type: String,
      required: [true, "La marca es obligatoria."],
    },
    precio: {
      type: Number,
      required: [true, "El precio es obligatorio."],
    },
    numeroPaneles: {
      type: Number,
      required: [true, "El número de paneles es obligatorio."],
    },
    descripcion: {
      type: String,
    },
    imagen: {
      type: String,
    },
    lastUpdate: {
      type: String,
    },
  },
  { timestamps: true }
);

frameSchema.index({ precio: 1, potencia: -1 });

let crmDB = mongoose.connection.useDb("crm");

const Frame = crmDB.model("Frame", frameSchema);

module.exports.Frame = Frame;
