const config = require("config");
const { Growatt } = require("../models/Growatt");

const getGrowattPlants = async () => {
  try {
    const token = config.get("GROWATT_TOKEN");

    const response = await fetch("https://openapi.growatt.com/v1/plant/list", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
    });

    const result = await response.json();

    if (!result?.data?.plants) {
      throw new Error("No se encontraron plantas en la respuesta");
    }

    // Convertir strings numéricos a Number
    const plants = result.data.plants.map((plant) => ({
      ...plant,
      total_energy: parseFloat(plant.total_energy),
      current_power: parseFloat(plant.current_power),
      peak_power: parseFloat(plant.peak_power),
    }));

    await Growatt.updateOne({}, { $set: { plants } }, { upsert: true });

    console.log("Plantas actualizadas correctamente.");
    return plants;
  } catch (error) {
    console.error("Error al obtener o guardar plantas de Growatt:", error);
  }
};

module.exports.getGrowattPlants = getGrowattPlants;
