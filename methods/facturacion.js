const config = require("config");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

exports.getClients = async (page) => {
  try {
    const response = await fetch(
      `https://apisandbox.facturama.mx/client?page=${page}`,
      {
        headers: {
          Authorization: config.get("FACTURAMA_SANDBOX_KEY"),
          "Content-Type": "application/json",
        },
      }
    );
    const res = await response.json();
    console.log(res);
    return { res };
  } catch (err) {
    console.log(err);
    return { error: true, message: err };
  }
};
