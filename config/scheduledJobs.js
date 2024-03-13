var cron = require("node-cron");
const {
  getPrices,
  getPanelPrices,
  getInverterPrices,
} = require("../methods/getPrices");

//Update prices of all products in the data base every 4 hours
const updatePrices = cron.schedule("0 */1 * * *", async () => {
  console.log("<------------------Update Prices-------------------->");
  console.log("<---------Started the daily prices updater---------->");
  console.log("<--------------------------------------------------->");
  await getPrices();
  await getPanelPrices();
  await getInverterPrices();
  console.log("<------------------Update Prices-------------------->");
  console.log("<---------Started the daily prices updater---------->");
  console.log("<--------------------------------------------------->");
});

/* const bestProducts = cron.schedule("* * * * *", () => {
  console.log("<------------------Best PRoducts-------------------->");
  console.log("<---------Started the best products updater---------->");
  console.log("<--------------------------------------------------->");
  getBestProducts();
}); */

module.exports = { updatePrices };
