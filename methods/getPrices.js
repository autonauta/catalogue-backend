const { Product } = require("../models/Product");
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
    const url = process.env.SYSCOM_URL + "productos/" + productsString;
    const resSyscomProducts = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: process.env.SYSCOM_AUTH,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const syscomProducts = await resSyscomProducts.json();
    if (!syscomProducts) {
      console.log("No products received from syscom.mx");
    } else {
      updateProducts(syscomProducts);
    }
  }
};

const updateProducts = async (products) => {
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
    } else {
      console.log(
        "Product " + products[i].producto_id + " was successfully updated"
      );
    }
  }
};

module.exports = getPrices;
