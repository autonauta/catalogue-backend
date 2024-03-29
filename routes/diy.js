const express = require("express");
const router = express.Router();
const config = require("config");
const { Funnel } = require("../models/Funnel");
const { Product } = require("../models/Product");
const { Dollar } = require("../models/Dollar");
const { Payment } = require("../models/Payment");
const { WhiteList } = require("../models/WhiteList");
const Stripe = require("stripe");
const stripe = Stripe(config.get("STRIPE_LIVE_API_KEY"));
const bills = require("../methods/facturacion");
const {
  sendConfirmationEmail,
  sendTrackingEmail,
} = require("../config/nodemailer.config");

const getFOLIO = async () => {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
  const charactersLength = characters.length;
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
//FUNNEL
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
  const fakeMarkup = 2.1;
  const markupOne = 1.7;
  const markupThree = 1.47;
  const markupFive = 1.325;
  const fakeProductPrice = product.price * dollar[0].price * tax * fakeMarkup;
  const productPriceOne = product.price * dollar[0].price * tax * markupOne;
  const productPriceThree = product.price * dollar[0].price * tax * markupThree;
  const productPriceFive = product.price * dollar[0].price * tax * markupFive;
  funnel.productPrice = {
    fakeProductPrice: fakeProductPrice.toFixed(2),
    productPriceOne: productPriceOne.toFixed(2),
    productPriceThree: productPriceThree.toFixed(2),
    productPriceFive: productPriceFive.toFixed(2),
  };
  await funnel.save();
  res.send(funnel);
});
//Endpoint for creating new Funnels
router.post("/funnel/new", async (req, res) => {
  const { title, subtitle, main_text, image, video, features, productId } =
    req.body;
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

router.post("/funnel/edit", async (req, res) => {
  const { id, feature } = req.body;
  const funnel = await Funnel.findById(id);
  if (!funnel)
    return res.status(400).send({
      error: true,
      message: "No existe ese funnel revisa la información.",
    });
  funnel.features.push(feature);
  await funnel.save();
  res.send({ funnel });
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
      numInt,
      postal_code,
      city,
      state,
      country,
      phone,
      sysId,
      promotion,
    } = req.body;
    //Check for product stock abvailability and return error of stock not available and the stock
    //
    //----------------------->
    console.log(req.body);
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
        ciudad: city,
        estado: state,
        codigo_postal: postal_code,
        telefono: phone,
        correo: email,
      },
      description,
    });

    if (paymentIntent.client_secret) {
      var newPayment = new Payment({
        stripeId: paymentIntent.id,
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
          num_int: numInt,
          codigo_postal: postal_code,
          ciudad: city,
          estado: state,
          pais: country,
          telefono: phone,
          correo: email,
        },
      });
      await newPayment.save();
    } else {
      console.log("paymentIntent: ", paymentIntent);
      return res.send({ error: true, message: paymentIntent });
    }
    var newWhiteList;
    if (promotion) {
      let whiteList = await WhiteList.findOne();
      console.log("Found in data base: ", whiteList);
      if (!whiteList) {
        newWhiteList = new WhiteList({
          userList: [
            {
              userName: newPayment.userName,
              userLastName: newPayment.userLastName,
              userAddress: newPayment.userAddress,
              userEmail: newPayment.userAddress.correo,
            },
          ],
        });
        await newWhiteList.save();
      } else {
        whiteList.userList.push({
          userName: newPayment.userName,
          userLastName: newPayment.userLastName,
          userAddress: newPayment.userAddress,
          userEmail: newPayment.userAddress.correo,
        });
        await whiteList.save();
      }
    }
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
  //
  //Crear pedido en syscom
  const url = config.get("SYSCOM_URL") + "carrito/generar";
  const order = {
    tipo_entrega: "domicilio",
    direccion: {
      atencion_a: payment.userName,
      calle: payment.userAddress.calle,
      colonia: payment.userAddress.colonia,
      num_ext: payment.userAddress.num_ext,
      num_int: payment.userAddress.num_int ? payment.userAddress.num_int : "-",
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
    testmode: false,
    directo_cliente: true,
  };
  console.log(order);
  try {
    const sysResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: config.get("SYSCOM_AUTH"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(order),
    });
    const response = await sysResponse.json();
    console.log("Syscom response: ", response);
    const folio = await getFOLIO();
    payment.syscomOrder = response.resumen;
    payment.syscomOrderId =
      response.resumen.folio === "TESTMODE" ? folio : response.resumen.folio;
    await payment.save();
    /* const whatsappClient = await req.app.get("whatsappClient");
    await whatsappClient.sendMessage(
      "5214421818265@c.us",
      "Nuevo pedido realizado\n" +
        "Folio: " +
        payment.syscomOrderId +
        "\n" +
        "Compra: $" +
        (payment.amount / 100).toLocaleString("en-US") +
        "\n" +
        "Usuario: " +
        payment.userName +
        "\n"
    );
    await whatsappClient.sendMessage(
      `521${payment.userAddress.telefono}@c.us`,
      "¡Pedido realizado con éxito!\n" +
        "Folio del pedido: " +
        payment.syscomOrderId +
        "\n" +
        "Gracias por ser parte de la comunidad DIY.\n" +
        "Recibirás un mensaje cuando tu pedido esté en camino."
    ); */
    sendConfirmationEmail(
      payment.userAddress.correo,
      payment.userAddress.telefono,
      payment.syscomOrderId,
      payment.description,
      payment.quantity,
      (payment.amount / 100).toLocaleString("en-US"),
      new Date().toUTCString()
    );
    res.send({ response });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      error: true,
      message: error.message,
    });
  }
});

router.post("/funnel/send-tracking-number", async (req, res) => {
  const { syscomOrderId, syscomTracking } = req.body;
  const payment = await Payment.findOne({ syscomOrderId });
  //check error
  //const whatsappClient = await req.app.get("whatsappClient");
  const phone = payment.userAddress.telefono;
  try {
    await whatsappClient.sendMessage(
      `521${phone}@c.us`,
      "¡Tu pedido con folio " +
        syscomOrderId +
        "  ha sido enviado!\n" +
        "El código de rastreo es: " +
        syscomTracking +
        "\n" +
        "Puedes rastrear tu pedido en el link que te llegará después de este mensaje.\n" +
        "¡Disfruta tu pedido!"
    );
    /* await whatsappClient.sendMessage(`521${phone}@c.us`, syscomTracking);
    await whatsappClient.sendMessage(
      `521${phone}@c.us`,
      "https://estafeta.com/Herramientas/Rastreo"
    ); */
  } catch (err) {
    res.status(400).json({ error: true, message: err });
  }
  try {
    sendTrackingEmail(
      payment.userAddress.correo,
      syscomTracking,
      syscomOrderId,
      new Date().toUTCString(),
      payment.userAddress.estado,
      payment.userAddress.ciudad,
      payment.userAddress.colonia,
      payment.userAddress.calle,
      payment.userAddress.num_ext,
      payment.userAddress.num_int,
      payment.userAddress.telefono
    );
    res.json({ message: "Correo enviado correctamente." });
  } catch (error) {
    console.log(error);
    res.json({ error: true, message: error });
  }
});

router.post("/funnel/email-test", async (req, res) => {
  const { email, phone, syscomOrderId, product, quantity, ammount, date } =
    req.body;
  try {
    sendConfirmationEmail(
      email,
      phone,
      syscomOrderId,
      product,
      quantity,
      ammount,
      date
    );
    res.json({ message: "Correo enviado correctamente." });
  } catch (error) {
    console.log(error);
    res.json({ error: true, message: error });
  }
});
module.exports = router;
