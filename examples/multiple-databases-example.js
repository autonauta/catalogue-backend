// Ejemplo de cómo usar múltiples bases de datos

const mongoose = require("mongoose");
const config = require("config");

// Configuración de las bases de datos
const catalogueDB = config.get("ATLASDB");
const crmDB = config.get("ATLASDB2");

// Conexión principal (catalogueDB)
mongoose.connect(catalogueDB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Conexión secundaria (CRM)
const crmConnection = mongoose.createConnection(crmDB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Ejemplo 1: Modelo que usa la conexión principal (catalogueDB)
const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String
});

const Product = mongoose.model("Product", ProductSchema);

// Ejemplo 2: Modelo que usa la conexión CRM
const CustomerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  company: String
});

const Customer = crmConnection.model("Customer", CustomerSchema);

// Ejemplo 3: Modelo que usa la conexión CRM con nombre específico
const LeadSchema = new mongoose.Schema({
  name: String,
  email: String,
  source: String,
  status: String
});

const Lead = crmConnection.model("Lead", LeadSchema);

// Ejemplo de uso en rutas:
/*
// En routes/products.js (usa catalogueDB)
const Product = require("../models/Product");

// En routes/customers.js (usa CRM)
const Customer = require("../models/Customer");
const Lead = require("../models/Lead");
*/

module.exports = {
  Product,
  Customer,
  Lead,
  crmConnection
};
