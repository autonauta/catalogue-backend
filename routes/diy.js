const express = require("express");
const router = express.Router();
const { Funnel } = require("../models/Funnel");
const { Product } = require("../models/Product");
const { Dollar } = require("../models/Dollar");
const Stripe = require("stripe");
const stripe = Stripe(
  "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"
);

router.post("/funnel", async (req, res) => {
  const funnelId = req.body.funnelId;
  if (!funnelId) {
    res.status(400).send({
      error: true,
      message: "No se recibió ningún funnelId",
    });
    return;
  }
  if (!funnelId.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(400).send({
      error: true,
      message: "No es un id válido.",
    });
    return;
  }
  var funnel = await Funnel.findById(funnelId);
  if (!funnel) {
    res.status(400).send({
      error: true,
      message: "No se encontró un funnel con ese id.",
    });
    return;
  }
  const product = await Product.findOne({ sysId: funnel.productId });
  if (!product) {
    res.status(400).send({
      error: true,
      message: "No existe ese producto en la base de datos.",
    });
    return;
  }
  const dollar = await Dollar.find({});
  if (!dollar) {
    res.status(400).send({
      error: true,
      message: "No existe el precio del dollar, revisar base de datos.",
    });
    return;
  }
  const tax = 1.16;
  const markup = 1.2;
  const stripeComission = 1.041;
  const productPrice =
    product.price * dollar[0].price * tax * markup * stripeComission;
  console.log(productPrice);
  funnel.productPrice = productPrice.toFixed(2);
  await funnel.save();
  res.send(funnel);
});
//Endpoint for creating new Funnels
router.post("/funnel/new", async (req, res) => {
  const {
    title,
    subtitle,
    image,
    video,
    buttonOne,
    buttonTwo,
    features,
    productId,
  } = req.body;
  if (
    !title ||
    !subtitle ||
    !image ||
    !video ||
    !buttonOne ||
    !buttonTwo ||
    !features ||
    !productId
  ) {
    res.status(400).send({
      error: true,
      message: "No estan completos los datos.",
    });
    return;
  }
  const newFunnel = new Funnel({
    title,
    subtitle,
    image,
    video,
    buttonOne,
    buttonTwo,
    features,
    productId,
  });
  const saved = await newFunnel.save();
  console.log(
    "New funnel created with link: " + "https://diy.highdatamx.com/" + saved._id
  );
  res.send({ link: "https://diy.highdatamx.com/" + saved._id });
});

router.post("/funnel/payment-intent", async (req, res) => {
  try {
    const { price, email } = req.body;
    //Check for product stock abvailability
    //
    //----------------------->
    const paymentIntent = await stripe.paymentIntents.create({
      currency: "mxn",
      amount: Math.ceil(price * 100),
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: email,
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.log(error);
    return res.status(400).send({ error: true, message: error.message });
  }
});
module.exports = router;
