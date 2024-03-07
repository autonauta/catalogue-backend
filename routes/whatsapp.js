const express = require("express");
const router = express.Router();

router.post("/send-message", async (req, res) => {
  const { num, message } = req.body;
  res.send({ error: "", message: "Mensaje enviado" });
});
module.exports = router;
