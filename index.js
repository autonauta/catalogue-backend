const express = require("express");
const app = express();
const https = require("https");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const { updatePrices } = require("./config/scheduledJobs");

//Routes Requirements
const products = require("./routes/products");
const diy = require("./routes/diy");

const privateKey = fs.readFileSync(
  "/etc/letsencrypt/live/arq.highdatamx.com/privkey.pem"
);
const certificate = fs.readFileSync(
  "/etc/letsencrypt/live/arq.highdatamx.com/fullchain.pem"
);

const server = https.createServer(
  {
    key: privateKey,
    cert: certificate,
  },
  app
);
app.use(express.json());
require("dotenv").config();
app.use(bodyParser.json());

//morgan Logging
app.use(morgan("tiny"));

//----Routes
app.use("/api/v1/products", products);
app.use("/api/v1/diy", diy);

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
server.listen(port, () => {
  console.log(`HighData Server listening on port: ${port}...`);
});
