const { Product } = require("../models/Product");
const fetch = (...args) =>
	import('node-fetch').then(({default: fetch}) => fetch(...args));

const getPrices = async () => {
    var productsString = "";
    const products = await Product.find({});
    
    if (!products) {
        console.log("No products");
    } else {
        for(let i=0; i < products.length;i++){
            productsString =+ products[i].sysId + ",";
        }
        productsString = productsString.slice(0, -1);
        console.log("Products string: " + productsString);
        const url = process.env.SYSCOM_URL + "productos/" + productsString;
        const resSyscomProducts = await fetch(url,{
            method: 'GET',
            headers: {
              Authorization: process.env.SYSCOM_AUTH,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          });
        const syscomProducts = await resSyscomProducts.json();
        if(!syscomProducts){
            console.log("No products received from syscom.mx");
        }else{
            console.log(syscomProducts.length + " products received from syscom.mx " + JSON.stringify(syscomProducts,null,4));
            updateProducts(syscomProducts);
        }
    }
};

const updateProducts = async (products) => {
    for(let i = 0; i < products.length; i++){
        const filter = { sysID: products[i].producto_id };
        const update = { price: products[i].precios.precio_descuento };
        const productCreated = await Product.findOneAndUpdate(filter, update);
        if(!productCreated) {
            console.log("Product " + products[i].producto_id + " was not updated");
        }else{
            console.log("Product " + products[i].producto_id + " was successfully updated");
        }
    }
}

module.exports = getPrices;