const { Product } = require("../models/Product");

const getPrices = async () => {
    var productsString = "";
    const products = await Product.find();
    
    if (!products) {
        console.log("No products");
    } else {
        products.forEach(product=>{
            productsString =+ product.sysId + ",";
        });
        productsString = productsString.slice(0, -1);
        console.log(productsString);
        const url = process.env.SYSCOM_URL + "productos/" + productsString;
        const resSyscomProducts = await fetch(url);
        const syscomProducts = resSyscomProducts.json();
        if(!syscomProducts){
            console.log("No products received from syscom");
        }else{
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