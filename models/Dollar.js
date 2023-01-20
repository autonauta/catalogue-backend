const mongoose = require("mongoose");

const dollarSchema = new mongoose.Schema({
  price: { type: Number },
  lastUpdate: { type: String },
});

const Dollar = mongoose.model("Dollar", dollarSchema);

module.exports.Dollar = Dollar;
