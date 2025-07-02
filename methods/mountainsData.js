const config = require("config");

const { Mountain } = require("../models/Mountain");

const STORMGLASS_API_KEY = config.get("STORMGLASS_API_KEY");

async function getMountainsWeather() {
  try {
    const mountains = await Mountain.find();

    const results = await Promise.all(
      mountains.map(async (mountain) => {
        const { lat, lng, ascent_date } = mountain;
        const today = new Date();
        const startDate = today.toISOString().split(".")[0];
        const endDate = ascent_date;

        const url = `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=airTemperature,cloudCover,humidity,precipitation,snow,windDirection,windSpeed&source=sg&start=${startDate}&end=${endDate}`;

        const response = await fetch(url, {
          headers: {
            Authorization: STORMGLASS_API_KEY,
          },
        });

        const data = await response.json();
        console.log(data);

        if (!data.hours || data.hours.length === 0) {
          console.warn(`Sin datos para ${mountain.name}`);
          return { _id: mountain._id, name: mountain.name, updated: false };
        }

        const first = data.hours[0];
        const last = data.hours[data.hours.length - 1];

        const extract = (entry) => ({
          airTemperature: entry.airTemperature?.sg ?? 0,
          cloudCover: entry.cloudCover?.sg ?? 0,
          humidity: entry.humidity?.sg ?? 0,
          precipitation: entry.precipitation?.sg ?? 0,
          snow: entry.snow?.sg ?? 0,
          windDirection: entry.windDirection?.sg ?? 0,
          windSpeed: entry.windSpeed?.sg ?? 0,
          time: entry.time,
        });

        await Mountain.findByIdAndUpdate(mountain._id, {
          today_weather: extract(first),
          ascent_weather: extract(last),
        });

        return { _id: mountain._id, name: mountain.name, updated: true };
      })
    );

    console.log("✅ Montañas actualizadas:", results);
    return results;
  } catch (error) {
    console.error("❌ Error al actualizar montañas:", error);
    throw error;
  }
}

module.exports = { getMountainsWeather };
