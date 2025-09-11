const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configuración de almacenamiento para eventos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Crear ruta basada en el nombre del evento
    const eventName = req.body.name || 'evento-sin-nombre';
    // Limpiar el nombre del evento para usarlo como nombre de carpeta
    const cleanEventName = eventName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const eventFolder = path.join(__dirname, '../files/events', cleanEventName);
    
    // Crear la carpeta del evento si no existe
    fs.mkdirSync(eventFolder, { recursive: true });
    
    cb(null, eventFolder);
  },
  filename: function (req, file, cb) {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    
    // Limpiar el nombre base
    const cleanBase = base
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    cb(null, `${cleanBase}-${uniqueSuffix}${ext}`);
  }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  // Verificar que sea una imagen
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 2 // Máximo 2 archivos (img e img_secondary)
  }
});

module.exports = upload;
