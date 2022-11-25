var cron = require("node-cron");
const getPrices = require("../methods/getPrices");

const updatePrices = cron.schedule("0 1 * * *", () => {
  console.log("<------------------Update Prices-------------------->");
  console.log("<---------Started the daily prices updater---------->");
  console.log("<--------------------------------------------------->");
  getPrices();
});

module.exports = updatePrices;
