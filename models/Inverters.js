const mongoose = require("mongoose");
// const User = require('./userModel');
// const validator = require('validator');

const inversorSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio."],
    },
    sysId: {
      type: String,
      required: [true, "El El id de syscom es obligatorio."],
    },
    marca: {
      type: String,
      required: [true, "La marca es obligatoria."],
    },
    potencia: {
      type: Number,
      required: [true, "La potencia es obligatoria."],
    },
    voltajeEntradaMin: {
      type: Number,
      // required: [true, "El voltaje mínimo de entrada es obligatorio."],
    },
    voltajeEntradaMax: {
      type: Number,
      required: [true, "El voltaje máximo de entrada es obligatorio."],
    },
    voltajeSalida: {
      type: Number,
      required: [true, "El voltaje de salida es obligatorio."],
    },
    corriente: {
      type: Number,
      required: [true, "La corriente es obligatoria."],
    },
    cadenas: {
      type: Number,
      required: [true, "El número de cadenas es obligatorio."],
    },
    precio: {
      type: Number,
      required: [true, "El precio es obligatorio."],
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

inversorSchema.index({ precio: 1, potencia: -1 });

let crmDB = mongoose.connection.useDb("crm");

const Inversor = crmDB.model("Inverter", inversorSchema);

module.exports.Inverter = Inverter;
