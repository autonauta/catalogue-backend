const mongoose = require("mongoose");

const panelSchema = new mongoose.Schema(
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
      required: [true, "La potencia es obligatorio."],
    },
    voltaje: {
      type: Number,
      required: [true, "El voltaje es obligatorio."],
    },
    precio: {
      type: Number,
      required: [true, "El precio es obligatorio."],
    },
    corriente: {
      type: Number,
    },
    ancho: {
      type: Number,
    },
    largo: {
      type: Number,
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

panelSchema.index({ precio: 1, potencia: -1 });

let crmDB = mongoose.connection.useDb("crm");

const Panel = crmDB.model("Panel", panelSchema);

module.exports.Panel = Panel;
