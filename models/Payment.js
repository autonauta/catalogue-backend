const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  stripeId: { type: String },
  status: { type: String },
  userName: { type: String },
  userLastName: { type: String },
  amount: { type: Number },
  productId: { type: String },
  quantity: { type: Number },
  description: { type: String },
  userAddress: {
    calle: { type: String },
    colonia: { type: String },
    num_ext: { type: String },
    num_int: { type: String},
    codigo_postal: { type: String },
    ciudad: { type: String },
    estado: { type: String },
    pais: { type: String },
    telefono: { type: String },
  },
  syscomOrder: { type: Object },
  syscomOrderId: { type: String },
  dateCreated: { type: Date },
});

const Payment = mongoose.model("Payment", paymentSchema);

module.exports.Payment = Payment;
