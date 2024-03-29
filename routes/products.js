const express = require("express");
const router = express.Router();
const { Product } = require("../models/Product");

router.get("/", async (req, res) => {
  const products = await Product.find({});
  if (!products) {
    res.status(400).send({
      error: true,
      message:
        "An error ocurred while getting the products info, try again later.",
    });
  }
  res.send(products);
});
//create new product in the DB
router.post("/new", async (req, res) => {
  const { name, sysId, price, category } = req.body;
  if (!name || !sysId || !price || !category) {
    res.status(400).send({
      error: true,
      message: "No estan completos los datos.",
    });
    return;
  }
  const newProduct = new Product({
    name,
    sysId,
    price,
    category,
  });
  try {
    const product = await newProduct.save();
    if (!product) {
      console.log("No product saved");
      res.send({ error: true, message: "No product saved" });
    } else {
      console.log("Product saved");
      res.send(product);
    }
  } catch (err) {
    res.status(400).send(err);
  }
});

module.exports = router;
