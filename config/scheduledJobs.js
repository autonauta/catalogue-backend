var cron = require("node-cron");
const getPrices = require("../methods/getPrices");
const getBestProducts = require("../methods/getBestProducts");

//Update prices of all products in the data base every 4 hours
const updatePrices = cron.schedule("0 */4 * * *", () => {
  console.log("<------------------Update Prices-------------------->");
  console.log("<---------Started the daily prices updater---------->");
  console.log("<--------------------------------------------------->");
  getPrices();
});

const bestProducts = cron.schedule("* * * * *", () => {
  console.log("<------------------Best PRoducts-------------------->");
  console.log("<---------Started the best products updater---------->");
  console.log("<--------------------------------------------------->");
  getBestProducts();
});

module.exports = { updatePrices, bestProducts };
