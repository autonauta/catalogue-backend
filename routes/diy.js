const express = require("express");
const router = express.Router();
const { Funnel } = require("../models/Funnel");
const { Product } = require("../models/Product");
const { Dollar } = require("../models/Dollar");

const Stripe = require("stripe");
const stripe = Stripe(
  "sk_test_51LGo8xJbTdcQvIUcToGpCGB5GS0m96YdnnQmbw3mApjpVBCSsVOrH3sLuhwtz7HsVQxxAgGdEpujLCIwzp4m5reh00mR9NsMsa"
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
  const productPrice = dollar;
  console.log(productPrice);
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
    const { sysId } = req.body;
    //Check for product stock abvailability
    //
    //----------------------->
    const product = await Product.findOne({ sysId });
    if (!product) {
      res.status(400).send({
        error: true,
        message: "No existe ese producto en la base de datos.",
      });
      return;
    }
    console.log(
      "amount:",
      Math.ceil(product.price * 20 * 1.16 * 1.04),
      "prodId:",
      sysId
    );
    const paymentIntent = await stripe.paymentIntents.create({
      currency: "mxn",
      amount: Math.ceil(product.price * 20 * 1.16 * 1.04 * 100),
      automatic_payment_methods: {
        enabled: true,
      },
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.log(error);
    return res.status(400).send({ error: true, message: error.message });
  }
});
module.exports = router;
