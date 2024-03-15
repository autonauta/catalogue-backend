const express = require("express");
const router = express.Router();
const { createProject } = require("../methods/createProject");
const { upload } = require("../middleware/fileReception");
const { Customer } = require("../models/Customer");
const { createPDF } = require("../methods/createPDF");

router.post("/contacto", async (req, res) => {
  const { nombre, telefono, email, mensaje, consumo } = req.body;
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
  } else if (consumo) {
    //Calcula el proyecto
    const project = await createProject((data = { ...req.body }));
    console.log("Proyecto: ", project);
    //Crear PDF
    await createPDF(project);
    //Enviar por correo electrónico

    //res.send(proyect);
    //const processedText = getConsumption("/files/pdf", "pdfFile.pdf");
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
