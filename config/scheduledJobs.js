var cron = require("node-cron");
const {
  getPrices,
  getPanelPrices,
  getInverterPrices,
  getFramePrices,
} = require("../methods/getPrices");

//Update prices of all products in the data base every 4 hours
const updatePrices = cron.schedule("* * * * *", () => {
  console.log("<------------------Actualizar Precios-------------------->");
  console.log(
    "<---------Iniciado el actualizador de precios cada minuto---------->"
  );
  console.log("<--------------------------------------------------->");
  getPrices();
  getPanelPrices();
  getInverterPrices();
  getFramePrices();
});

/* const bestProducts = cron.schedule("* * * * *", () => {
  console.log("<------------------Best PRoducts-------------------->");
  console.log("<---------Started the best products updater---------->");
  console.log("<--------------------------------------------------->");
  getBestProducts();
}); */

module.exports = { updatePrices };
