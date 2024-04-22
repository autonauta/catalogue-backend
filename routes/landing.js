const express = require("express");
const router = express.Router();
const { createProject } = require("../methods/createProject");
const { upload } = require("../middleware/fileReception");
const { Customer } = require("../models/Customer");
const { createPDF } = require("../methods/createPDF");
const { sendPDFEmail } = require("../config/nodemailer.config");
const { sendNotifyEmail } = require("../config/nodemailer.config");

const getEmailName = (nombre) => {
  return nombre.split(" ")[0];
};

router.post("/contacto", async (req, res) => {
  let { nombre, telefono, email, mensaje, consumo } = req.body;
  const emailName = getEmailName(nombre); // Para
  var fileName;
  var project;
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
  if (telefono.length < 10 || telefono.length > 10) {
    res.status(401).send({
      error: true,
      message: "El teléfono debe ser a 10 dígitos.",
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
  if (!email.includes("@")) {
    res.status(401).send({
      error: true,
      message: "el correo recibido no tiene el formato adecuado",
    });
    return;
  }
  if (email.includes(" ")) {
    email = email.replace(/\s/g, "");
  }
  //Checa si ya existe un usuario con el correo presentado
  const customer = await Customer.findOne({ email });
  const customerPhone = await Customer.findOne({ telefono });
  //Si ya existe manda el error al usuario
  if (customer || customerPhone) {
    res.status(402).send({
      error: true,
      message:
        "Ya existe un usuario con esos datos 🧔, comunícate con nosotros por whatsapp 📱 y resolveremos tu petición.",
    });
    return;
    //Si no existe procede a crearlo
  }
  if (consumo) {
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
      res.status(404).send({
        error: true,
        message:
          "Hubo un error con la base de datos 📄, comunícate con nosotros por whatsapp 📱 y te atenderemos cuanto antes.",
      });
      return;
    } else {
      console.log("Cliente guardado");
      //Enviar por correo electrónico
      try {
        sendNotifyEmail(
          email,
          emailName,
          project.cliente,
          project.potencia,
          project.paneles.numPaneles,
          project.precioProyecto.total,
          fileName
        );
        const emailResponse = await sendPDFEmail(fileName, email, emailName);
        if (emailResponse.sent) {
          res.send({
            error: false,
            message:
              consumo > 9000
                ? "Ya enviamos tu cotización ✉️ pero tu proyecto es de más de 9,000 kWh ⚡. Ponte en contacto con nosotros por whatsapp 📱 para atender a detalle tu proyecto!"
                : "Ya enviamos tu cotización ✉️, ponte en contacto con nosotros por whatsapp 📱 para confirmar tu proyecto",
          });
          return;
        } else throw new Error(email.error);
      } catch (error) {
        console.log("Error al enviar correo: ", error);
        res.status(404).send({
          error: true,
          message:
            "Recibimos tu información 📄 pero por alguna razón no pudimos enviarte la cotización a tu correo ✉️, ponte en contacto con nosotros para hacertela llegar por whatsapp 📱.",
        });
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
      res.send({
        error: true,
        message:
          "Hubo un error al guardar tus datos 📄, comunícate con nosotros por whatsapp 📱 para dar seguimiento a tu proyecto.",
      });
      return;
    } else {
      console.log("Cliente guardado");
      sendNotifyEmail(email, emailName, 0, 0, 0);
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
