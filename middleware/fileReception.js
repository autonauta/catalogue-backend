const path = require("path");
const multer = require("multer");

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

module.exports = { storage, fileFilter, upload };
