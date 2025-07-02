const express = require("express");
const router = express.Router();
const { Training } = require("../models/training.model");
const auth = require("../middleware/auth");

// GET /api/v1/trainings?category=upper
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    const trainings = await Training.find(query).sort({ name: 1 }); // ordenados alfabéticamente
    res.json(trainings);
  } catch (err) {
    console.error("Error al obtener entrenamientos:", err);
    res.status(500).json({ error: "Error al obtener entrenamientos" });
  }
});

// POST - Crear nuevo entrenamiento (privada)
router.post("/create", auth, async (req, res) => {
  try {
    const { name, category, video } = req.body;

    if (!name || !category) {
      return res
        .status(400)
        .json({ error: "Nombre y categoría son obligatorios" });
    }

    const newTraining = new Training({ name, category, video });
    await newTraining.save();

    res.status(201).json({
      message: "Entrenamiento creado exitosamente",
      id: newTraining._id,
    });
  } catch (err) {
    console.error("Error al crear entrenamiento:", err);
    res.status(500).json({ error: "No se pudo crear el entrenamiento" });
  }
});

// PUT - Editar entrenamiento (privada)
router.put("/update/:id", auth, async (req, res) => {
  try {
    const { name, category, video } = req.body;
    const training = await Training.findByIdAndUpdate(
      req.params.id,
      { name, category, video },
      { new: true }
    );

    if (!training) {
      return res.status(404).json({ error: "Entrenamiento no encontrado" });
    }

    res.json({ message: "Entrenamiento actualizado", data: training });
  } catch (err) {
    console.error("Error al actualizar entrenamiento:", err);
    res.status(500).json({ error: "No se pudo actualizar el entrenamiento" });
  }
});

// DELETE - Eliminar entrenamiento (privada)
router.delete("/delete/:id", auth, async (req, res) => {
  try {
    const training = await Training.findByIdAndDelete(req.params.id);
    if (!training) {
      return res.status(404).json({ error: "Entrenamiento no encontrado" });
    }

    res.json({ message: "Entrenamiento eliminado exitosamente" });
  } catch (err) {
    console.error("Error al eliminar entrenamiento:", err);
    res.status(500).json({ error: "No se pudo eliminar el entrenamiento" });
  }
});

module.exports = router;
