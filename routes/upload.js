const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const BASE_IMG_PATH =
  "/var/www/camino-al-sol.highdatamx.com/public_html/src/img/";

// Función para decidir la carpeta según el campo
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = "";
    if (file.fieldname === "img")
      folder = path.join(BASE_IMG_PATH, "montañas/image/");
    else if (file.fieldname === "img_real")
      folder = path.join(BASE_IMG_PATH, "montañas/image_real/");
    else if (file.fieldname === "img_route")
      folder = path.join(BASE_IMG_PATH, "montañas/image_route/");
    else folder = path.join(BASE_IMG_PATH, "montañas/otros/");

    // Crear la carpeta si no existe
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}${ext}`);
  },
});

const upload = multer({ storage: storage });

// Endpoint para subir varias imágenes
router.post(
  "/image",
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "img_real", maxCount: 1 },
    { name: "img_route", maxCount: 1 },
  ]),
  (req, res) => {
    const result = {};
    if (req.files.img) {
      result.img = `/src/img/montañas/image/${req.files.img[0].filename}`;
    }
    if (req.files.img_real) {
      result.img_real = `/src/img/montañas/image_real/${req.files.img_real[0].filename}`;
    }
    if (req.files.img_route) {
      result.img_route = `/src/img/montañas/image_route/${req.files.img_route[0].filename}`;
    }
    res.json(result);
  }
);

module.exports = router;
