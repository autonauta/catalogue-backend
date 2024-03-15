const mongoose = require("mongoose");

const dollarSchema = new mongoose.Schema({
  price: { type: Number },
  lastUpdate: { type: String },
});
dollarSchema.index({ precio: 1, potencia: -1 });

let crmDB = mongoose.connection.useDb("crm");

const Dollar = crmDB.model("Panel", dollarSchema);

module.exports.Dollar = Dollar;
