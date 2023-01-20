const express = require("express");
const router = express.Router();
const { Product } = require("../models/Product");

const printProducts = async (products) => {
  for (let i = 0; i < products.length; i++) {
    console.log(products[i]);
  }
};

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
  const name = req.body.name;
  const sysId = req.body.sysId;
  const price = req.body.price;
  const category = req.body.category;
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
