const express = require("express");
const router = express.Router();
const { Growatt } = require("../models/Growatt");

router.get("/stats", async (req, res) => {
  try {
    const doc = await Growatt.findOne({});
    if (!doc || !doc.plants || doc.plants.length === 0) {
      return res.status(404).json({ error: "No se encontraron plantas" });
    }

    const totalEnergy = doc.plants.reduce(
      (sum, plant) => sum + (plant.total_energy || 0),
      0
    );

    const totalCurrentPower = doc.plants.reduce(
      (sum, plant) => sum + (plant.current_power || 0),
      0
    );

    const totalPeakPowerKw = doc.plants.reduce(
      (sum, plant) => sum + (plant.peak_power || 0),
      0
    );

    const totalPeakPower = totalPeakPowerKw * 1000;

    const currentPercentage =
      totalPeakPower > 0 ? (totalCurrentPower / totalPeakPower) * 100 : 0;

    const stats = {
      total_energy: Number(totalEnergy.toFixed(2)),
      current_power: Number(totalCurrentPower.toFixed(2)),
      peak_power: Number(totalPeakPower.toFixed(2)),
      percentage: Number(currentPercentage.toFixed(2)),
    };

    return res.json(stats);
  } catch (err) {
    console.error("Error al calcular estadísticas de plantas:", err);
    res.status(500).json({ error: "Error al calcular estadísticas" });
  }
});

module.exports = router;
