const express = require("express");
const app = express();
const config = require("config");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const { updatePrices } = require("./config/scheduledJobs");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

//Routes Requirements
const products = require("./routes/products");
const diy = require("./routes/diy");
const stripe = require("./routes/stripe");
const syscom = require("./routes/syscom");

//Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

//morgan Logging
app.use(morgan("tiny"));

//----Routes
app.use("/api/v1/products", products);
app.use("/api/v1/diy", diy);
app.use("/api/v1/syscom", syscom);
app.use("/api/v1/stripe", stripe);

//Config - connect to DB. Tiene que llevar forzosamente los parametros useCreateIndex y useUnifiedTopology
const db = config.get("ATLASDB");
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

//Whatsapp web JS implementation
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox"],
  },
});
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Whatsapp-web connected properly");
  client.sendMessage("5214421818265@c.us", "Whatsap-web server just started!");
});
client.on("message", (message) => {
  console.log(message.body);
  client.sendMessage("5214421818265@c.us", message.body);
});

client.initialize();

const port = config.get("PORT");
app.listen(port, () => {
  console.log(`HighData Server listening on port: ${port}...`);
});
