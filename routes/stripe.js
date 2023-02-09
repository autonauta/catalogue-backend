const express = require("express");
const router = express.Router();
require("dotenv").config({ path: `../.env` });
const stripe = require("stripe")(process.env.STRIPE_LIVE_KEY);

router.get("/delete/payment-intents", async (req, res) => {
  try {
    const paymentIntents = await stripe.paymentIntents.list({
      status: "incomplete",
    });

    for (const intent of paymentIntents.data) {
      await stripe.paymentIntents.del(intent.id);
    }

    res.send({ message: "All incomplete payment intents deleted." });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;
