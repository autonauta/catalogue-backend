const mongoose = require("mongoose");

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

const Event = mongoose.model("Event", eventSchema);

module.exports.Event = Event;
