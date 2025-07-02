const express = require("express");
const router = express.Router();
const { createProject } = require("../methods/createProject");
const { Customer } = require("../models/Customer");
const { createPDF } = require("../methods/createPDF");
const {
  sendPDFEmail,
  sendNotifyEmail,
} = require("../config/nodemailer.config");
const config = require("config");

const getEmailName = (nombre) => nombre.split(" ")[0];

router.post("/contacto", async (req, res) => {
  const {
    nombre,
    telefono,
    email,
    mensaje,
    consumo,
    recaptcha_token,
    recaptcha_action,
  } = req.body;
  console.log("RECAPTCHA_ACTION: ", recaptcha_action);
  console.log("RECAPTCHA_TOKEN: ", recaptcha_token);
  // Validaciones básicas
  if (!nombre || !telefono || !email || !consumo) {
    return res
      .status(401)
      .send({ error: true, message: "Todos los campos son obligatorios." });
  }

  if (telefono.length !== 10) {
    return res
      .status(401)
      .send({ error: true, message: "El teléfono debe tener 10 dígitos." });
  }

  if (!email.includes("@")) {
    return res.status(401).send({ error: true, message: "Correo inválido." });
  }

  // Validar reCAPTCHA v3
  const secretKey = config.get("RECAPTCHA_SECRET_KEY");
  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: secretKey,
          response: recaptcha_token,
        }),
      }
    );

    const data = await response.json();
    console.log(data);
    if (!data.success) {
      return res
        .status(401)
        .send({ error: true, message: "La verificación reCAPTCHA falló." });
    }

    if (data.action !== recaptcha_action) {
      return res
        .status(401)
        .send({ error: true, message: "Acción inválida en reCAPTCHA." });
    }

    if (data.score < 0.7) {
      return res.status(401).send({
        error: true,
        message: `Actividad sospechosa detectada (score: ${data.score}).`,
      });
    }

    // Validar existencia previa
    const customer = await Customer.findOne({ email });
    const customerPhone = await Customer.findOne({ telefono });

    if (customer || customerPhone) {
      return res.status(402).send({
        error: true,
        message:
          "Ya existe un usuario con esos datos 🧔, comunícate con nosotros por whatsapp 📱 y resolveremos tu petición.",
      });
    }

    const emailName = getEmailName(nombre);
    let fileName;
    let project;

    if (consumo) {
      project = await createProject({
        nombre,
        telefono,
        email,
        mensaje,
        consumo,
      });
      fileName = await createPDF(project);
    }

    const newCustomer = new Customer({
      nombre,
      telefono,
      email,
      mensaje,
      consumo: consumo || null,
    });
    const saved = await newCustomer.save();

    if (!saved) {
      return res.status(404).send({
        error: true,
        message:
          "Hubo un error con la base de datos 📄, comunícate con nosotros por whatsapp 📱 y te atenderemos cuanto antes.",
      });
    }

    try {
      sendNotifyEmail(
        email,
        emailName,
        newCustomer,
        project?.potencia || 0,
        project?.paneles?.numPaneles || 0,
        project?.precioProyecto?.total || 0,
        fileName || null
      );

      if (project && fileName) {
        const emailResponse = await sendPDFEmail(fileName, email, emailName);
        if (!emailResponse.sent) throw new Error("Fallo en envío de correo");
      }

      return res.send({
        error: false,
        message:
          consumo > 9000
            ? "Ya enviamos tu cotización ✉️ pero tu proyecto es de más de 9000 kWh ⚡. Ponte en contacto con nosotros por whatsapp 📱 para atender a detalle tu proyecto!"
            : "Ya enviamos tu cotización ✉️, ponte en contacto con nosotros por whatsapp 📱 para confirmar tu proyecto",
      });
    } catch (error) {
      console.log("Error al enviar correo:", error);
      return res.status(404).send({
        error: true,
        message:
          "Recibimos tu información 📄 pero no pudimos enviarte la cotización a tu correo ✉️, comunícate por whatsapp 📱.",
      });
    }
  } catch (err) {
    console.error("Error con reCAPTCHA:", err);
    return res
      .status(500)
      .send({ error: true, message: "Error al verificar reCAPTCHA." });
  }
});

router.post("/defaults", async (req, res) => {
  const { projectOne, projectTwo, projectThree, projectFour } = req.body;

  if (!projectOne || !projectTwo || !projectThree || !projectFour) {
    return res.status(401).send({
      error: true,
      message: "No están completos los datos.",
    });
  }

  const proyectos = [projectOne, projectTwo, projectThree, projectFour];
  const resultados = await Promise.all(
    proyectos.map((consumo) => createProject({ consumo }))
  );

  const prices = {
    projectOne: resultados[0].precioProyecto.total,
    projectTwo: resultados[1].precioProyecto.total,
    projectThree: resultados[2].precioProyecto.total,
    projectFour: resultados[3].precioProyecto.total,
  };

  res.send(prices);
});

module.exports = router;
