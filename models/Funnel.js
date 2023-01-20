const mongoose = require("mongoose");

const funnelSchema = new mongoose.Schema({
  title: { type: String },
  subtitle: { type: String },
  features: [{ type: String }],
  buttonOne: { type: String },
  buttonTwo: { type: String },
  image: {
    uri: { type: String, default: null },
  },
  video: {
    uri: { type: String, default: null },
  },
  productId: mongoose.ObjectId,
  productPrice: { type: Number },
});

const Funnel = mongoose.model("Funnel", funnelSchema);

module.exports.Funnel = Funnel;
