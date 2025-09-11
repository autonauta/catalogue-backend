const mongoose = require("mongoose");

// Obtener la conexión específica (en este caso, la conexión principal)
// Si quisieras usar la conexión CRM, cambiarías esto por la conexión CRM
const connection = mongoose.connection;

const eventSchema = new mongoose.Schema(
  {
    name: { type: String },
    location: { type: String },
    departure_location: { type: String },
    event_start_date: { type: String },
    event_end_date: { type: String },
    img: { type: String },
    img_secondary: { type: String },
    description: { type: String },
    includes: [
      {
        type: String
      }
    ],
    price: {
      early_bird: { type: Number },
      full_price: { type: Number }
    },
  },
  { timestamps: true }
);

// Usar la conexión específica para crear el modelo
const EventCRM = connection.model("Event", eventSchema);

module.exports.EventCRM = EventCRM;
