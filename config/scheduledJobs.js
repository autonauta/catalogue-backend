const cron = require("node-cron");

const {
  getPrices,
  getPanelPrices,
  getInverterPrices,
  getFramePrices,
} = require("../methods/getPrices");

const { getGrowattPlants } = require("../methods/growattData");
const { getMountainsWeather } = require("../methods/mountainsData"); // 👈 importa la función

// Update prices of all products in the data base every 4 hours
const updatePrices = cron.schedule("0 0 */4 * * *", () => {
  console.log("<------------------Update Prices-------------------->");
  console.log("<---------Started the daily prices updater---------->");
  console.log("<--------------------------------------------------->");
  getPrices();
  getPanelPrices();
  getInverterPrices();
  getFramePrices();
});

// Sync Growatt plants every 6 minutes
const updateGrowattPlants = cron.schedule("*/6 * * * *", async () => {
  console.log("<------------------Growatt Sync--------------------->");
  console.log("<---------Fetching latest Growatt plants------------>");
  console.log("<--------------------------------------------------->");
  try {
    await getGrowattPlants();
  } catch (error) {
    console.error("Error in Growatt sync cron:", error.message);
  }
});

// Update mountain weather every 3 hours
const updateMountainsWeather = cron.schedule("0 */3 * * *", async () => {
  console.log("<------------------Mountains Weather---------------->");
  console.log("<---------Updating mountain weather forecast-------->");
  console.log("<--------------------------------------------------->");
  try {
    await getMountainsWeather();
  } catch (error) {
    console.error("Error in mountain weather cron:", error.message);
  }
});

module.exports = {
  updatePrices,
  updateGrowattPlants,
  updateMountainsWeather, // 👈 exporta el nuevo cronjob también
};
