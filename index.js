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


// Middleware base
app.use(cors({ exposedHeaders: ["X-Total-Count"] }));
app.use(morgan("tiny"));

// Body parsing
app.use(express.json());
app.use(bodyParser.json());

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
//
//Config - connect to catlogueDB.
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
      console.log("¡Database connected succesfully!");
    }
  }
);
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
