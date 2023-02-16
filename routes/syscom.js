const express = require("express");
const router = express.Router();
const config = require("config");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

router.post("/estados", async (req, res) => {
  const { postal_code } = req.body;
  try {
    const sysResponse = await fetch(
      config.get("SYSCOM_URL") + "/carrito/estados/" + postal_code,
      {
        method: "GET",
        headers: {
          Authorization: config.get("SYSCOM_AUTH"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const response = await sysResponse.json();
    if (response.error) throw { message: response.message };
    else if (response.estado)
      res.send({ estado: response.estado[0].codigo_estado });
  } catch (error) {
    console.log("Error: ", error);
    res.send({ error: true, message: error.message });
  }
});

module.exports = router;
