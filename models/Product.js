const mongoose = require("mongoose");

const productsSchema = new mongoose.Schema({
  name: { type: String, unique: true},
  sysId: {type: String, unique: true},
  price: { type: Number },
  category: {
    type: String,
    enum: [
      "iluminacion",
      "vigilancia",
      "seguridad",
      "conectividad",
      "videoportero",
      "audio",
      "renovables"
    ],
  },
  lastUpdate: {type: String},
});

const Product = mongoose.model("Product", productsSchema);

module.exports.Product = Product;
