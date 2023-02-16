const express = require("express");
const router = express.Router();
const config = require("config");
const { Funnel } = require("../models/Funnel");
const { Product } = require("../models/Product");
const { Dollar } = require("../models/Dollar");
const { Payment } = require("../models/Payment");
const Stripe = require("stripe");
const stripe = Stripe(config.get("STRIPE_TEST_API_KEY"));
const bills = require("../methods/facturacion");

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
    const {
      price,
      email,
      quantity,
      description,
      title,
      name,
      lastName,
      address,
      street,
      colony,
      num,
      postal_code,
      city,
      state,
      country,
      phone,
      sysId,
    } = req.body;
    //Check for product stock abvailability and return error of stock not available and the stock
    //
    //----------------------->
    const paymentIntent = await stripe.paymentIntents.create({
      currency: "mxn",
      amount: Math.ceil(price * 100 * quantity),
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: email,
      metadata: {
        Nombre: name,
        Apellido: lastName,
        producto: title,
        cantidad: quantity,
        envio: address,
      },
      description,
    });

    if (paymentIntent.client_secret) {
      var newPayment = new Payment({
        stripeId: paymentIntent.client_secret,
        status: paymentIntent.status,
        userName: name,
        userLastName: lastName,
        amount: paymentIntent.amount,
        productId: sysId,
        dateCreated: paymentIntent.created,
        description,
        quantity: quantity,
        userAddress: {
          calle: street,
          colonia: colony,
          num_ext: num,
          codigo_postal: postal_code,
          ciudad: city,
          estado: state,
          pais: country,
          telefono: phone,
        },
      });
    }
    await newPayment.save();
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.log(error);
    return res.status(400).send({ error: true, message: error.message });
  }
});

router.post("/funnel/factura", async (req, res) => {
  const { isGlobal, price, description, quantity } = req.body;
  const newBill = await bills.createBill(isGlobal, {
    price,
    description,
    quantity,
  });
  console.log(newBill);
  res.send(newBill);
});

router.post("/funnel/complete-payment", async (req, res) => {
  const { stripeId } = req.body;
  const payment = await Payment.findOne({ stripeId });
  if (!payment) {
    res.status(400).send({
      error: true,
      message: "No existe ese payment intent",
    });
    return;
  }
  payment.status = "succeeded";
  //Crear pedido en syscom
  const url = config.get("SYSCOM_URL") + "carrito/generar";
  const order = {
    tipo_entrega: "domicilio",
    direccion: {
      atencion_a: payment.name,
      calle: payment.userAddress.calle,
      colonia: payment.userAddress.colonia,
      num_ext: payment.userAddress.num_ext,
      codigo_postal: payment.userAddress.codigo_postal,
      ciudad: payment.userAddress.ciudad,
      estado: payment.userAddress.estado,
      pais: "MEX",
      telefono: payment.userAddress.telefono,
    },
    metodo_pago: "03",
    productos: [
      {
        id: Number(payment.productId),
        tipo: "nuevo",
        cantidad: payment.quantity,
      },
    ],
    tipo_pago: "pue",
    moneda: "mxn",
    uso_cfdi: "G03",
    fletera: "estafeta",
    ordenar: true,
    orden_compra: payment.stripeId,
    testmode: true,
    directo_cliente: true,
  };
  await payment.save();
  try {
    console.log("Order: ", order);
    const sysResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: config.get("SYSCOM_AUTH"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: JSON.stringify(order),
    });
    const response = await sysResponse.json();
    console.log("Respuesta de syscom: ", response);
    res.send({ response });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      error: true,
      message: error.message,
    });
  }
});
module.exports = router;
