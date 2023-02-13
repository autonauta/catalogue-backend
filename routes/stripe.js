const express = require("express");
const router = express.Router();
const config = require("config");
const Stripe = require("stripe");
const stripe = Stripe(config.get("STRIPE_TEST_API_KEY"));
router.get("/delete/payment-intents", async (req, res) => {
  try {
    const paymentIntents = await stripe.paymentIntents.list({
      created: { lte: Date.now() },
      limit: 100,
    });

    for (const intent of paymentIntents.data) {
      if (intent.status === "requires_payment_method") {
        await stripe.paymentIntents.cancel(intent.id);
      }
    }

    res.send({ message: "All incomplete payment intents deleted." });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
router.get("/payment-intents", async (req, res) => {
  try {
    const paymentIntents = await stripe.paymentIntents.list({
      created: { lte: Date.now() },
      limit: 100,
    });

    for (const intent of paymentIntents.data) {
      console.log(intent.status);
    }

    res.send(paymentIntents.data);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;
