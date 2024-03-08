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
  } else if (!customer) {
    const newCustomer = new Customer({
      nombre,
      telefono,
      correo,
    });
    try {
      const customer = await newCustomer.save();
      if (!customer) {
        console.log("No se guardó el cliente");
        res.send({ error: true, message: "No se guardó el cliente" });
      } else {
        console.log("Cliente guardado");
        res.send(customer);
      }
    } catch (err) {
      res.status(400).send(err);
    }
  }
});

module.exports = router;
