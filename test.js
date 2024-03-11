const fs = require("fs");
const pdf = require("pdf-parse");
const path = require("path");

const getConsumption = async () => {
  // Construct a path to myfile.txt relative to script.js
  const filePath = path.join(__dirname, ".", "files/pdf", "044150704119.pdf");
  let dataBuffer = fs.readFileSync(filePath);
  let processedPDF = await pdf(dataBuffer);
  console.log("PDF dATA", processedPDF);
};

getConsumption();
