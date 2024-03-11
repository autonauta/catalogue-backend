const fs = require("fs");
const pdf = require("pdf-parse");

const getConsumption = async (file) => {
  let dataBuffer = fs.readFileSync(file);
  let pdf = await pdf(dataBuffer);
  console.log("PDF dATA", pdf);
};
module.exports.getConsumption = getConsumption;
