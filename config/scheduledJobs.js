var cron = require("node-cron");
const getPrices = require("../methods/getPrices");


//Update prices of all products in the data base every 4 hours
const updatePrices = cron.schedule("0 */4 * * *", () => {
  console.log("<------------------Update Prices-------------------->");
  console.log("<---------Started the daily prices updater---------->");
  console.log("<--------------------------------------------------->");
  getPrices();
});

module.exports = updatePrices;
