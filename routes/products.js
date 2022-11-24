const express = require("express");
const router = express.Router();
const {Product} = require("../models/Product");

//create new product in the DB
router.post("/new", async (req, res) => {
  const [name, sysId, price, category] = req.body;
  const newProduct = new Product({
    name, sysId, price, category
  });
  const product = await newProduct.save();
  if(!product) {
    console.log("No product saved");
    res.send({error: true, message: "No product saved"});
  }else{
    console.log("Product saved");
    res.send(product);
  }
});

module.exports = router;
