const express = require("express");
const http = require("http");
const {Server} = require("socket.io");
const app = express();
const config = require("config");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const { updatePrices } = require("./config/scheduledJobs");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { Payment } = require("./models/Payment");


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
app.set("socketio", io);

//Routes Requirements
const products = require("./routes/products");
const diy = require("./routes/diy");
const stripe = require("./routes/stripe");
const syscom = require("./routes/syscom");
const whatsapp = require("./routes/whatsapp");

//Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(cors({exposedHeaders: ['X-Total-Count']}));

//morgan Logging
app.use(morgan("tiny"));

//----Routes
app.use("/api/v1/products", products);
app.use("/api/v1/diy", diy);
app.use("/api/v1/syscom", syscom);
app.use("/api/v1/stripe", stripe);
app.use("/api/v1/whatsapp", whatsapp);
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

//Update prices every days
updatePrices.start();

//Whatsapp web JS implementation
const whatsappClient = new Client({
  authStrategy: new LocalAuth({ dataPath: "./whatsapp-auth-sessions" }),
  puppeteer: {
    args: ["--no-sandbox"],
  },
});
app.set("whatsappClient", whatsappClient);
whatsappClient.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

whatsappClient.on("ready", () => {
  console.log("Whatsapp-web connected properly");
  whatsappClient.sendMessage(
    "5214421818265@c.us",
    "Message from HighData`s ARIES server: ¡Whatsap-web server just started!"
  );
});
whatsappClient.on("message", async (msg) => {
  const phone = msg.from.split("@")[0];
  if (phone === "5219156132561") {
    const message = msg.body;
    const firstWord = message.split(" ")[0];
    if (firstWord === "¡GRACIAS!") {
      const guia = message.split(" ")[4];
      whatsappClient.sendMessage(
        "5214421818265@c.us",
        "La clave de rastreo de tu pedido es: " +
          guia +
          "\n" +
          "Visita https://estafeta.com/Herramientas/Rastreo para conocer el estatus del envío\n"
      );
    }
  }
});
try {
  whatsappClient.initialize();
} catch (error) {
  console.log(error);
}
let onlineFunnelUsers = 0;
//IO socket server functions
io.on("connection", (socket) => {
  console.log(`User connected with socket: ${socket.id}`);
  onlineFunnelUsers++;
  io.emit("onlineFunnelUsers", {onlineFunnelUsers});
  //Handler for when a socket closes connection
  socket.on("disconnect", () => {
    console.log("User disconnected with socket:", socket.id);
    onlineFunnelUsers--;
    io.emit("onlineFunnelUsers", {onlineFunnelUsers});
  });
});

const port = config.get("PORT");
server.listen(port, () => {
  console.log(`HighData Server listening on port: ${port}...`);
});
