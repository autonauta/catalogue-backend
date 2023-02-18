const express = require("express");
const router = express.Router();

router.post("/send-message", async (req, res) => {
  const { num, message } = req.body;
  const whatsappClient = await req.app.get("whatsappClient");
  whatsappClient.sendMessage("521" + num + "@c.us", message);
});
module.exports = router;
