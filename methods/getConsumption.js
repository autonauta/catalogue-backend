const fs = require("fs");
const pdf = require("pdf-parse");
const path = require("path");

const getConsumption = async (folder, file) => {
  // Construct a path to myfile.txt relative to script.js
  const filePath = path.join(__dirname, "..", folder, file);
  let dataBuffer = fs.readFileSync(filePath);
  let pdf = await pdf(dataBuffer);
  console.log("PDF dATA", pdf);
};
module.exports.getConsumption = getConsumption;
