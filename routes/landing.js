const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const { Customer } = require("../models/Customer");
const { getConsumption } = require("../methods/getConsumption");

//path
//const filePath = path.join(__dirname, ".", "TEST");

// Configuración de almacenamiento de Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./TEST"); // Define la carpeta de destino de los archivos subidos
  },
  filename: function (req, file, cb) {
    // Crea un nombre de archivo único
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Filtra los archivos para aceptar solo PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Solo se aceptan archivos PDF"), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

router.post("/contacto", upload.single("pdfFile"), async (req, res) => {
  const { nombre, telefono, email, mensaje } = req.body;
  if (!nombre || !telefono || !email || !mensaje) {
    res.status(401).send({
      error: true,
      message: "No están completos los datos.",
    });
    return;
  }
  if (req.file) {
    console.log("Archivo recibido:", req.file.path);
    res.send({ status: "OK" });
  } else {
    return res.status(401).send({
      error: true,
      message: "No se recibió el archivo PDF.",
    });
  }
  /* const customer = await Customer.findOne({ email });
  if (customer) {
    res.status(402).send({
      error: true,
      message: "Ya existe un usuario con ese correo.",
    });
  }
   if (true) {
    console.log("not customer");
    //const processedText = getConsumption("/files/pdf", "044150704119.pdf");
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
