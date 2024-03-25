const express = require("express");
const router = express.Router();
const { createProject } = require("../methods/createProject");
const { upload } = require("../middleware/fileReception");
const { Customer } = require("../models/Customer");
const { createPDF } = require("../methods/createPDF");
const { sendPDFEmail } = require("../config/nodemailer.config");

const getEmailName = (nombre) => {
  return nombre.split(" ")[0];
};

router.post("/contacto", async (req, res) => {
  const { nombre, telefono, email, mensaje, consumo } = req.body;
  const emailName = getEmailName(nombre);
  var fileName;
  var project;
  console.log("REQ: ", req.body);
  if (!nombre) {
    res.status(401).send({
      error: true,
      message: "Es indispensable que pongas tu nombre.",
    });
    return;
  }
  if (!telefono) {
    res.status(401).send({
      error: true,
      message: "Es indispensable que pongas tu teléfono.",
    });
    return;
  }
  if (!email) {
    res.status(401).send({
      error: true,
      message: "Es indispensable que pongas tu correo",
    });
    return;
  }
  //Checa si ya existe un usuario con el correo presentado
  const customer = await Customer.findOne({ email });
  const customer2 = await Customer.findOne({ telefono });
  //Si ya existe manda el error al usuario
  if (customer || customer2) {
    res.status(402).send({
      error: true,
      message:
        "Ya existe un usuario con esos datos, comunícate con nosotros por whatsapp y resolveremos tu petición.",
    });
    return;
    //Si no existe procede a crearlo
  }
  if (consumo) {
    console.log("con consumo");
    //Calcula el proyecto
    project = await createProject((data = { ...req.body }));
    console.log("Proyecto: ", project);
    //Crear PDF
    fileName = await createPDF(project);
    const newCustomer = new Customer({
      nombre,
      telefono,
      email,
      mensaje,
      consumo,
    });
    const response = await newCustomer.save();
    if (!response) {
      console.log("No se guardó el cliente");
      res.send({ error: true, message: "No se guardó el cliente" });
    } else {
      console.log("Cliente guardado");
      //Enviar por correo electrónico
      try {
        const emailResponse = await sendPDFEmail(fileName, email, emailName);
        if (emailResponse.sent) {
          res.send(project);
          return;
        } else throw new Error(email.error);
      } catch (error) {
        console.log("Error al enviar correo: ", error);
        return;
      }
    }
  } else {
    console.log("sin consumo");
    const newCustomer = new Customer({
      nombre,
      telefono,
      email,
      mensaje,
      consumo: null,
    });
    const response = await newCustomer.save();
    if (!response) {
      console.log("No se guardó el cliente");
      res.send({ error: true, message: "No se guardó el cliente" });
      return;
    } else {
      console.log("Cliente guardado");
      res.send(response);
      return;
    }
  }
});

router.post("/defaults", async (req, res) => {
  const { projectOne, projectTwo, projectThree, projectFour } = req.body;
  if (!projectOne || !projectTwo || !projectThree || !projectFour) {
    res.status(401).send({
      error: true,
      message: "No están completos los datos.",
    });
    return;
  }
  const project1 = await createProject((data = { consumo: projectOne }));
  const project2 = await createProject((data = { consumo: projectTwo }));
  const project3 = await createProject((data = { consumo: projectThree }));
  const project4 = await createProject((data = { consumo: projectFour }));
  const prices = {
    projectOne: project1.precioProyecto.total,
    projectTwo: project2.precioProyecto.total,
    projectThree: project3.precioProyecto.total,
    projectFour: project4.precioProyecto.total,
  };
  res.send(prices);
  return;
});

module.exports = router;
