const express = require("express");
const router = express.Router();

router.post("/contacto", async (req, res) => {
  const { nombre, telefono, correo, mensaje } = req.body;
  if (!nombre || !telefono || !correo || !mensaje) {
    res.status(400).send({
      error: true,
      message: "No estan completos los datos.",
    });
    return;
  }
  /* const newProduct = new Product({
    name,
    sysId,
    price,
    category,
  }); 
  try {
    const product = await newProduct.save();
    if (!product) {
      console.log("No product saved");
      res.send({ error: true, message: "No product saved" });
    } else {
      console.log("Product saved");
      res.send(product);
    }
  } catch (err) {
    res.status(400).send(err);
  }*/
  const respuesta = { nombre, telefono, correo, mensaje };
  res.send(respuesta);
});

module.exports = router;
