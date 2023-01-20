const express = require("express");
const router = express.Router();
const { Funnel } = require("../models/Funnel");
const { Product } = require("../models/Product");
const { Dollar } = require("../models/Dollar");

router.get("/funnel", async (req, res) => {
  const funnelId = req.body.funnelId;
  if (!funnelId) {
    res.status(400).send({
      error: true,
      message: "No se recibió ningún funnelId",
    });
    return;
  }
  if (funnel.length != 24) {
    res.status(400).send({
      error: true,
      message: "No es un id válido, tiene que tener 24 caractéres",
    });
    return;
  }
  const funnel = await Funnel.findById(funnelId);
  if (!funnel) {
    res.status(400).send({
      error: true,
      message: "No se encontró un funnel con ese id.",
    });
    return;
  }

  const product = await Product.findById(funnel.productId);
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
  funnel.productPrice = product.price * dollar.price;

  res.send(funnel);
});
module.exports = router;
