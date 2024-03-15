const mongoose = require("mongoose");

const dollarSchema = new mongoose.Schema({
  price: { type: Number },
  lastUpdate: { type: String },
});

let crmDB = mongoose.connection.useDb("crm");

const Dollar = crmDB.model("Dollar", dollarSchema);

module.exports.Dollar = Dollar;
