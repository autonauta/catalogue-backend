const mongoose = require("mongoose");

const productsSchema = new mongoose.Schema({
  name: { type: String },
  sysId: {type: String},
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
});

const Product = mongoose.model("Product", productsSchema);

module.exports.Product = Product;
