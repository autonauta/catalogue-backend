const express = require("express");
const app = express();
const morgan = require("morgan");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const { updatePrices } = require("./config/scheduledJobs");

//Routes Requirements
const products = require("./routes/products");
const diy = require("./routes/diy");
const stripe = require("./routes/stripe");

module.exports = stripe;
//Middleware
app.use(express.json());
require("dotenv").config();
app.use(bodyParser.json());
app.use(cors());

//morgan Logging
app.use(morgan("tiny"));

//----Routes
app.use("/api/v1/products", products);
app.use("/api/v1/diy", diy);
app.use("/api/v1/stripe", stripe);

//Config - connect to DB. Tiene que llevar forzosamente los parametros useCreateIndex y useUnifiedTopology
const db = process.env.ATLASDB;
mongoose.connect(
  db,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) {
      console.log("error in connection" + err);
    } else {
      console.log("¡HighData Database connected succesfully!");
    }
  }
);

//Update prices every day
updatePrices.start();
const port = process.env.PORT;
app.listen(port, () => {
  console.log(`HighData Server listening on port: ${port}...`);
});
