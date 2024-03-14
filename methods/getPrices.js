const config = require("config");
const { Product } = require("../models/Product");
const { Dollar } = require("../models/Dollar");
const { Panel } = require("../models/Panels");
const { Inverter } = require("../models/Inverters");
const { Frame } = require("../models/Frame");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const getPrices = async () => {
  var productsString = "";
  const products = await Product.find({});
  if (!products) {
    console.log("No products");
  } else {
    productsString = await createProductString(products);
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
  if (!panels) {
    console.log("No panels");
  } else {
    panelString = await createProductString(panels);
    const url = config.get("SYSCOM_URL") + "productos/" + panelString;
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
      if (typeof syscomPanels === "object" && !Array.isArray(syscomPanels))
        updatePanels([syscomPanels]);
      else updatePanels(syscomPanels);
    }
  }
};

const getInverterPrices = async () => {
  var inverterString = "";
  const inverters = await Inverter.find({});
  if (!inverters) {
    console.log("No inverters");
  } else {
    inverterString = await createProductString(inverters);
    console.log("inverter string: ", inverterString);
    const url = config.get("SYSCOM_URL") + "productos/" + inverterString;
    const resSyscomInverters = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: config.get("SYSCOM_AUTH"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const syscomInverters = await resSyscomInverters.json();
    if (syscomInverters.status || !syscomInverters) {
      console.log(
        "Error de comunicación con syscom: " + syscomInverters.detail
      );
    } else {
      if (
        typeof syscomInverters === "object" &&
        !Array.isArray(syscomInverters)
      )
        updateInverters([syscomInverters]);
      else updateInverters(syscomInverters);
    }
  }
};
const getFramePrices = async () => {
  var frameString = "";
  const frames = await Frame.find({});
  if (!frames) {
    console.log("No frames");
  } else {
    frameString = await createProductString(frames);
    console.log("frames string: ", frameString);
    const url = config.get("SYSCOM_URL") + "productos/" + frameString;
    const resSyscomFrames = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: config.get("SYSCOM_AUTH"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const syscomFrames = await resSyscomFrames.json();
    if (syscomFrames.status || !syscomFrames) {
      console.log("Error de comunicación con syscom: " + syscomFrames.detail);
    } else {
      if (typeof syscomFrames === "object" && !Array.isArray(syscomFrames))
        updateFrames([syscomFrames]);
      else updateFrames(syscomFrames);
    }
  }
};

module.exports = {
  getPrices,
  getPanelPrices,
  getInverterPrices,
  getFramePrices,
};

//
/////////////////////////////////////////     UTILITIES    /////////////////////////////////////////////////////
//

const createProductString = (products) => {
  var productsString = "";
  console.log("Products1: ", products);
  for (let i = 0; i < products.length; i++) {
    productsString += products[i].sysId + ",";
    console.log("product: ", products[i]);
    console.log("product2: ", products[i].sysId);
    console.log("product3: ", Object.keys(products[i]));
  }
  productsString = productsString.slice(0, -1);
  console.log("Product string: ", productsString);
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
  for (let i = 0; i < paneles.length; i++) {
    let filter = { sysId: paneles[i].producto_id };
    let update = {
      precio: (paneles[i].precios.precio_descuento / 1.0417).toFixed(2),
      lastUpdate: new Date().toLocaleString(),
    };
    let panelCreated = await Panel.findOneAndUpdate(filter, update);
    panelCreated = await Panel.findOne(filter);
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

const updateInverters = async (inverters) => {
  var Counter = 0;
  for (let i = 0; i < inverters.length; i++) {
    let filter = { sysId: inverters[i].producto_id };
    let update = {
      precio: (inverters[i].precios.precio_descuento / 1.0417).toFixed(2),
      lastUpdate: new Date().toLocaleString(),
    };
    let inverterCreated = await Inverter.findOneAndUpdate(filter, update);
    inverterCreated = await Inverter.findOne(filter);
    if (!inverterCreated.precio === inverters[i].precio) {
      console.log("Inverter " + inverters[i].producto_id + " was not updated");
    } else Counter++;
  }
  console.log(
    new Date().toLocaleString() +
      ": " +
      Counter +
      " inverters of " +
      inverters.length +
      " in total, were succesfully updated."
  );
};

const updateFrames = async (frames) => {
  var Counter = 0;
  for (let i = 0; i < frames.length; i++) {
    let filter = { sysId: frames[i].producto_id };
    let update = {
      precio: (frames[i].precios.precio_descuento / 1.0417).toFixed(2),
      lastUpdate: new Date().toLocaleString(),
    };
    let frameCreated = await Frame.findOneAndUpdate(filter, update);
    frameCreated = await Frame.findOne(filter);
    if (!frameCreated.precio === frames[i].precio) {
      console.log("Frame " + frames[i].producto_id + " was not updated");
    } else Counter++;
  }
  console.log(
    new Date().toLocaleString() +
      ": " +
      Counter +
      " frames of " +
      frames.length +
      " in total, were succesfully updated."
  );
};
