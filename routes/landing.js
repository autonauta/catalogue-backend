const express = require("express");
const router = express.Router();
const { Customer } = require("../models/Customer");

router.post("/contacto", async (req, res) => {
  const { nombre, telefono, correo, mensaje } = req.body;
  if (!nombre || !telefono || !correo || !mensaje) {
    res.status(400).send({
      error: true,
      message: "No estan completos los datos.",
    });
    return;
  }
  const customer = await Customer.find({ correo });
  if (customer) {
    res.status(400).send({
      error: true,
      message: "Ya existe un usuario con ese correo.",
    });
  } 
  else if (!customer) {
    const newCustomer = new Customer({
      nombre,
      telefono,
      correo,
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
    }
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
