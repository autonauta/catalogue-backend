const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const config = require("config");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const {
  updatePrices,
  updateGrowattPlants,
  updateMountainsWeather,
} = require("./config/scheduledJobs");
//const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { Payment } = require("./models/Payment");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
app.set("socketio", io);

//Routes Requirements
const products = require("./routes/products");
const diy = require("./routes/diy");
const stripe = require("./routes/stripe");
const ptar = require("./routes/ptar");
const syscom = require("./routes/syscom");
const growatt = require("./routes/growatt");
//const whatsapp = require("./routes/whatsapp");
const landing = require("./routes/landing");
const weather = require("./routes/weather");
const auth = require("./routes/auth");
const training = require("./routes/training");
const upload = require("./routes/upload");
const events = require("./routes/events");
const exodusAuth = require("./routes/exodus_auth");
const exodusUsers = require("./routes/exodus_users");


// Middleware base
app.use(cors({ exposedHeaders: ["X-Total-Count"] }));
app.use(morgan("tiny"));

// Body parsing - excluir rutas de eventos para permitir multipart/form-data
app.use((req, res, next) => {
  if (req.path.startsWith('/api/v1/exodus/events/create')) {
    return next(); // Saltar el parsing de JSON para esta ruta
  }
  express.json()(req, res, next);
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/v1/exodus/events/create')) {
    return next(); // Saltar el parsing de JSON para esta ruta
  }
  bodyParser.json()(req, res, next);
});

//----Routes
app.use("/api/v1/products", products);
app.use("/api/v1/diy", diy);
app.use("/api/v1/ptar", ptar);
app.use("/api/v1/syscom", syscom);
app.use("/api/v1/stripe", stripe);
//app.use("/api/v1/whatsapp", whatsapp);
app.use("/api/v1/landing", landing);
app.use("/api/v1/growatt", growatt);
app.use("/api/v1/weather", weather);
app.use("/api/v1/auth", auth);
app.use("/api/v1/training", training);
app.use("/api/v1/upload", upload);
app.use("/api/v1/exodus/events", events);
app.use("/api/v1/exodus/auth", exodusAuth);
app.use("/api/v1/exodus/users", exodusUsers);
//
//Config - connect to multiple databases.
const catalogueDB = config.get("ATLASDB");
const exodusDB = config.get("ATLASDB2");

// Conexión a la base de datos principal (catalogueDB)
mongoose.connect(
  catalogueDB,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) {
      console.log("Error connecting to catalogueDB: " + err);
    } else {
      console.log("¡CatalogueDB connected successfully!");
    }
  }
);

// Conexión a la segunda base de datos (Exodus)
const exodusConnection = mongoose.createConnection(
  exodusDB,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

exodusConnection.on('connected', () => {
  console.log("¡Exodus Database connected successfully!");
});

exodusConnection.on('error', (err) => {
  console.log("Error connecting to Exodus database: " + err);
});

// Exportar las conexiones para usar en otros archivos
module.exports = {
  catalogueConnection: mongoose.connection,
  exodusConnection: exodusConnection
};
//Update prices every day
updatePrices.start();
updateGrowattPlants.start();
updateMountainsWeather.start();

let onlineFunnelUsers = 15;
//IO socket server functions
io.on("connection", (socket) => {
  console.log(`User connected with socket: ${socket.id}`);
  onlineFunnelUsers++;
  io.emit("onlineFunnelUsers", { onlineFunnelUsers });
  //Handler for when a socket closes connection
  socket.on("disconnect", () => {
    console.log("User disconnected with socket:", socket.id);
    onlineFunnelUsers--;
    io.emit("onlineFunnelUsers", { onlineFunnelUsers });
  });
});

const port = config.get("PORT");
server.listen(port, () => {
  console.log(`HighData Server listening on port: ${port}...`);
});
