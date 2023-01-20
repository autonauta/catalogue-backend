const { Product } = require("../models/Product");
const { Dollar } = require("../models/Dollar");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const getPrices = async () => {
  var productsString = "";
  const products = await Product.find({});
  if (!products) {
    console.log("No products");
  } else {
    for (let i = 0; i < products.length; i++) {
      productsString += products[i].sysId + ",";
    }
    productsString = productsString.slice(0, -1);
    console.log(productsString);
    const url = process.env.SYSCOM_URL + "productos/" + productsString;
    const resSyscomProducts = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: process.env.SYSCOM_AUTH,
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
const updateDollarPrice = async () => {
  try {
    const resSyscom = await fetch(
      "https://developers.syscom.mx/api/v1/tipocambio",
      {
        method: "GET",
        headers: {
          Authorization: process.env.SYSCOM_AUTH,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const dollarPrice = resSyscom;
    console.log("Received from syscom: " + dollarPrice);
    let filter = {};
    let update = {
      price: dollarPrice,
      lastUpdate: new Date().toLocaleString(),
    };
    let dollarCreated = await Dollar.findOneAndUpdate(filter, update);
    console.log(dollarCreated);
  } catch (error) {
    console.log(error);
  }
};
const updateProducts = async (products) => {
  var updateCounter = 0;
  for (let i = 0; i < products.length; i++) {
    let filter = { sysId: products[i].producto_id };
    let update = {
      price: products[i].precios.precio_descuento,
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

module.exports = getPrices;
