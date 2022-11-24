var cron = require("node-cron");
require("dotenv").config(); 
const getPrices = require("../methods/getPrices");

const updatePrices = cron.schedule("* * * * *", () => {
  console.log("<------------------Update Prices-------------------->");
  console.log("<---------Started the daily prices updater---------->");
  console.log("<--------------------------------------------------->");
  getPrices();
});

module.exports = updatePrices;
