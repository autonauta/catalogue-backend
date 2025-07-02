const express = require("express");
const { calcularPlanta } = require("../methods/calculosPtar"); // Importando la función de cálculos

const router = express.Router();

// Ruta para calcular el diseño de la planta
router.post("/diseno", (req, res) => {
  const { caudal, dqoEntrada, sstEntrada, nivelAgua, norma } = req.body;

  try {
    // Llamada a la función para calcular los módulos de la planta
    const disenoPlanta = calcularPlanta({
      caudal,
      dqoEntrada,
      sstEntrada,
      nivelAgua,
      norma,
    });

    // Enviar el resultado de los cálculos como respuesta
    res.json(disenoPlanta);
  } catch (error) {
    // Manejo de errores
    console.error(error);
    res.status(500).json({ error: "Error al calcular el diseño de la planta" });
  }
});

module.exports = router;
