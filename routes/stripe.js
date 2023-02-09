const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const stripe = Stripe(
  "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"
);
router.get("/delete/payment-intents", async (req, res) => {
  try {
    const paymentIntents = await stripe.paymentIntents.list({});

    for (const intent of paymentIntents.data) {
      console.log(intent.status);
    }

    res.send({ message: "All incomplete payment intents deleted." });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;
