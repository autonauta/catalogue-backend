const config = require("config");
const { Product } = require("../models/Product");
const { Dollar } = require("../models/Dollar");
const { Panel } = require("../models/Panels");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const getPrices = async () => {
  var productsString = "";
  const products = await Product.find({});
  if (!products) {
    console.log("No products");
  } else {
    productsString = await createProductString(products);
    console.log(productsString);
    const url = config.get("SYSCOM_URL") + "productos/" + productsString;
    const resSyscomProducts = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: config.get("SYSCOM_AUTH"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const syscomProducts = await resSyscomProducts.json();
    if (syscomProducts.status || !syscomProducts) {
      console.log("Error de comunicación con syscom: " + syscomProducts.detail);
    } else {
      updateProducts(syscomProducts);
      updateDollarPrice();
    }
  }
};

const getPanelPrices = async () => {
  var panelString = "";
  const panels = await Panel.find({});
  console.log("Panels: ", panels);
  if (!panels) {
    console.log("No panels");
  } else {
    panelString = await createProductString(panels);
    console.log("Panel String: ", panelString);
    const url = config.get("SYSCOM_URL") + "productos/" + panelString;
    console.log("URL: ", url);
    const resSyscomPanels = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: config.get("SYSCOM_AUTH"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const syscomPanels = await resSyscomPanels.json();
    if (syscomPanels.status || !syscomPanels) {
      console.log("Error de comunicación con syscom: " + syscomPanels.detail);
    } else {
      if (typeof syscomPanels == "object") updatePanels([syscomPanels]);
      else updatePanels(syscomPanels);
    }
  }
};

module.exports = { getPrices, getPanelPrices };

//
/////////////////////////////////////////     UTILITIES    /////////////////////////////////////////////////////
//

const createProductString = async (products) => {
  let productsString = "";
  for (let i = 0; i < products.length; i++) {
    productsString += products[i].sysId + ",";
  }
  productsString = productsString.slice(0, -1);
  return productsString;
};

const updateDollarPrice = async () => {
  try {
    const resSyscom = await fetch(
      "https://developers.syscom.mx/api/v1/tipocambio",
      {
        method: "GET",
        headers: {
          Authorization: config.get("SYSCOM_AUTH"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const responseSyscom = await resSyscom.json();
    let filter = {};
    let update = {
      price: responseSyscom.normal,
      lastUpdate: new Date().toLocaleString(),
    };
    let dollarCreated = await Dollar.findOneAndUpdate(filter, update);
  } catch (error) {
    console.log(error);
  }
};

const updateProducts = async (products) => {
  var updateCounter = 0;
  for (let i = 0; i < products.length; i++) {
    let filter = { sysId: products[i].producto_id };
    let update = {
      price: (products[i].precios.precio_descuento / 1.0417).toFixed(2),
      lastUpdate: new Date().toLocaleString(),
    };
    let productCreated = await Product.findOneAndUpdate(filter, update);
    productCreated = await Product.findOne(filter);
    if (!productCreated.price === products[i].price) {
      console.log("Product " + products[i].producto_id + " was not updated");
    } else updateCounter++;
  }
  console.log(
    new Date().toLocaleString() +
      ": " +
      updateCounter +
      " products of " +
      products.length +
      " in total, were succesfully updated."
  );
};

const updatePanels = async (paneles) => {
  var Counter = 0;
  console.log("Panels length: ", paneles.length);
  for (let i = 0; i < paneles.length; i++) {
    let filter = { sysId: paneles[i].producto_id };
    let update = {
      precio: (paneles[i].precios.precio_descuento / 1.0417).toFixed(2),
      lastUpdate: new Date().toLocaleString(),
    };
    console.log("Update: ", update);
    let panelCreated = await Panel.findOneAndUpdate(filter, update);
    console.log("Panel created 1: ", panelCreated);
    panelCreated = await Panel.findOne(filter);
    console.log("Panel created 2: ", panelCreated);
    if (!panelCreated.precio === paneles[i].precio) {
      console.log("Panel " + paneles[i].producto_id + " was not updated");
    } else Counter++;
  }
  console.log(
    new Date().toLocaleString() +
      ": " +
      Counter +
      " panels of " +
      paneles.length +
      " in total, were succesfully updated."
  );
};
