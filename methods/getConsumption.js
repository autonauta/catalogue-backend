const fs = require("fs");
const pdf = require("pdf-parse");
const path = require("path");

const getConsumption = async (folder, file) => {
  // Construct a path to myfile.txt relative to script.js
  const filePath = path.join(__dirname, "..", folder, file);
  let dataBuffer = fs.readFileSync(filePath);
  let processedPDF = await pdf(dataBuffer);

  return processedPDF.text;
  //print in console the result of reading the pdf
  //console.log("PDF dATA", processedPDF);
};
module.exports.getConsumption = getConsumption;
