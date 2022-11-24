const express = require("express");
const app = express();
const morgan = require("morgan");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");

//Routes Requirements
const prices = require("./routes/users");
const appointments = require("./routes/appointments");

app.use(express.json());
require("dotenv").config();
app.use(bodyParser.json());
app.use(cors());

//morgan Logging
  app.use(morgan("tiny"));

//----Routes
app.use("/api/prices", prices);
app.use("/api/appointments", appointments);

//Config - connect to DB. Tiene que llevar forzosamente los parametros useCreateIndex y useUnifiedTopology
const db = process.env.ATLASDB;
mongoose.connect(
    db,
    { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
    },(err) => {
    if (err) {
    console.log("error in connection" + err);
    } else {
    console.log("¡HighData Database connected succesfully!");
    }});

const port = process.env.PORT;
app.listen(port, ()=>{
console.log(`HighData Server listening on port: ${port}...`);
});