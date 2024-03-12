const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

//path
const filePath = path.join(__dirname, ".", "TEST");

// Configuración de almacenamiento de Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, filePath); // Define la carpeta de destino de los archivos subidos
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
  // Ahora req.body contendrá los datos del formulario y req.file los datos del archivo
  const { nombre, telefono, email, mensaje } = req.body;
  if (!nombre || !telefono || !email || !mensaje) {
    return res.status(401).send({
      error: true,
      message: "No están completos los datos.",
    });
  }

  if (req.file) {
    console.log("Archivo recibido:", req.file.path);
  } else {
    return res.status(401).send({
      error: true,
      message: "No se recibió el archivo PDF.",
    });
  }

  const customer = await Customer.findOne({ email });
  if (customer) {
    res.status(402).send({
      error: true,
      message: "Ya existe un usuario con ese correo.",
    });
  } else {
    // Procesa el archivo PDF como necesites
    const processedText = getConsumption("/files/pdf", req.file.filename);
    // Procesa el resto de la lógica para guardar al cliente, etc.
  }
});
