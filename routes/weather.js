const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { Mountain } = require("../models/Mountain");

router.get("/mountains", async (req, res) => {
  try {
    const mountains = await Mountain.find();
    res.json(mountains);
  } catch (error) {
    console.error("Error al obtener montañas:", error.message);
    res.status(500).json({ error: "Error al obtener las montañas" });
  }
});

router.post("/mountains/create", auth, async (req, res) => {
  try {
    const { training } = req.body;

    // Normaliza formato de entrenamiento si es necesario
    if (training) {
      ["upper", "lower", "aerobics"].forEach((key) => {
        if (training[key] && !Array.isArray(training[key])) {
          training[key] = [];
        }

        if (training[key]) {
          training[key] = training[key].map((typeValue) =>
            typeof typeValue === "string" ? { type: typeValue } : typeValue
          );
        }
      });
    }

    const newMountain = new Mountain({
      ...req.body,
      updatedAt: new Date(),
    });

    await newMountain.save();
    res
      .status(201)
      .json({ message: "Montaña creada con éxito", id: newMountain._id });
  } catch (err) {
    console.error("Error al guardar montaña:", err);
    res.status(500).json({ error: "No se pudo guardar la montaña" });
  }
});

router.get("/mountains/:id", async (req, res) => {
  try {
    console.log("Typeof: ", typeof req.params.id);
    console.log("ID: ", req.params.id);
    const mountain = await Mountain.findById(req.params.id);
    if (!mountain)
      return res.status(404).json({ message: "Montaña no encontrada" });
    res.json(mountain);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener la montaña" });
  }
});

router.put("/mountains/update/:id", auth, async (req, res) => {
  try {
    const updated = await Mountain.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated)
      return res.status(404).json({ message: "Montaña no encontrada" });
    res.json({ message: "Montaña actualizada", data: updated });
  } catch (err) {
    res.status(500).json({ message: "Error al actualizar montaña" });
  }
});

router.delete("/mountains/delete/:id", auth, async (req, res) => {
  try {
    const deleted = await Mountain.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Montaña no encontrada" });
    res.json({ message: "Montaña eliminada" });
  } catch (err) {
    res.status(500).json({ message: "Error al borrar montaña" });
  }
});

module.exports = router;
