const express = require("express");
const router = express.Router();
const config = require("config");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

router.post("/locations", async (req, res) => {
  const { postal_code } = req.body;
  try {
    const estadoRaw = await fetch(
      config.get("SYSCOM_URL") + "carrito/estados/" + postal_code,
      {
        method: "GET",
        headers: {
          Authorization: config.get("SYSCOM_AUTH"),
          "Content-Type": "application/json",
        },
      }
    );
    const estado = await estadoRaw.json();
    if (estado.error) throw { message: estado.message };
    const coloniesRaw = await fetch(
      config.get("SYSCOM_URL") + "carrito/colonias/" + postal_code,
      {
        method: "GET",
        headers: {
          Authorization: config.get("SYSCOM_AUTH"),
          "Content-Type": "application/json",
        },
      }
    );
    const colonies = await coloniesRaw.json();
    if (colonies.error) throw { message: colonies.message };
    console.log({ colonies, estado });
    res.send({ colonies, estado });
  } catch (error) {
    console.log("Error: ", error);
    res.send({ error: true, message: error.message });
  }
});

module.exports = router;
