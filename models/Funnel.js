const mongoose = require("mongoose");

const funnelSchema = new mongoose.Schema({
  title: { type: String },
  subtitle: { type: String },
  image_text: {type: String},
  main_text: {
    text: {type: String},
    span: {type: String}
  },
  features: [
    { 
      title: {type: String},
      image: {type: String},
      description: {type: String},
      span: {type: String}
    }
  ],
  image: {type: String},
  video: {type: String},
  productId: { type: String },
  productPrice: { 
    fakeProductPrice: {type: String},
    productPriceOne: {type: String},
    productPriceThree: {type: String},
    productPriceFive: {type: String}
   },
});

const Funnel = mongoose.model("Funnel", funnelSchema);

module.exports.Funnel = Funnel;
