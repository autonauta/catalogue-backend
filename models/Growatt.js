const mongoose = require("mongoose");

const singlePlantSchema = new mongoose.Schema({
  plant_id: { type: Number, required: true },
  user_id: { type: Number },
  name: { type: String },
  country: { type: String },
  city: { type: String },
  locale: { type: String },
  status: { type: Number },
  installer: { type: String },
  operator: { type: String },
  image_url: { type: String },
  latitude: { type: String },
  longitude: { type: String },
  latitude_f: { type: mongoose.Schema.Types.Mixed }, // puede ser null o número
  latitude_d: { type: mongoose.Schema.Types.Mixed },
  total_energy: { type: Number },
  current_power: { type: Number },
  peak_power: { type: Number },
  create_date: { type: String },
});

const growattSchema = new mongoose.Schema(
  {
    plants: [singlePlantSchema],
  },
  { timestamps: true }
);

const Growatt = mongoose.model("Growatt", growattSchema);

module.exports.Growatt = Growatt;
