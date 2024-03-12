const express = require("express");
const router = express.Router();
const path = require("path");
const { upload } = require("../middleware/fileReception");
const { Customer } = require("../models/Customer");
const { getConsumption } = require("../methods/getConsumption");

router.post("/contacto", upload.single("pdfFile"), async (req, res) => {
  const { nombre, telefono, email, mensaje } = req.body;
  if (!nombre || !telefono || !email || !mensaje) {
    res.status(401).send({
      error: true,
      message: "No están completos los datos.",
    });
    return;
  }
  //Checa si ya existe un usuario con el correo presentado
  const customer = await Customer.findOne({ email });
  //Si ya existe manda el error al usuario
  if (customer) {
    res.status(402).send({
      error: true,
      message: "Ya existe un usuario con ese correo.",
    });
    //Si no existe procede a crearlo
  } else if (req.file) {
    //Calcula el proyecto

    const processedText = getConsumption("/files/pdf", "044150704119.pdf");
  }
  if (req.file) {
    //Si se recibe un documento pdf primero se guarda
    console.log("Archivo recibido:", req.file.path);
  } else {
    return res.status(401).send({
      error: true,
      message: "No se recibió el archivo PDF.",
    });
  }
  /* 
  
   if (true) {
    console.log("not customer");
    
    /* const newCustomer = new Customer({
      nombre,
      telefono,
      email,
      mensaje,
      consumo: consumo ? consumo : null,
    });
    const customer = await newCustomer.save();
    if (!customer) {
      console.log("No se guardó el cliente");
      res.send({ error: true, message: "No se guardó el cliente" });
    } else {
      console.log("Cliente guardado");
      res.send(customer);
    } 
  }*/
});

module.exports = router;
