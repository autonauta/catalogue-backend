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
    return { res };
  } catch (err) {
    return { error: true, message: err };
  }
};

exports.getBills = async (type) => {
  try {
    const response = await fetch(
      `https://apisandbox.facturama.mx/cfdi?type=${type}`,
      {
        headers: {
          Authorization: config.get("FACTURAMA_SANDBOX_KEY"),
          "Content-Type": "application/json",
        },
      }
    );
    const res = await response.json();
    return { res };
  } catch (err) {
    return { error: true, message: err };
  }
};

exports.createBill = async (isGlobal, product) => {
  const { price, description, quantity } = product;
  var Receiver = {};
  var data = {};
  var Items = [];
  if (isGlobal) {
    const date = new Date();
    Receiver = {
      Name: "PUBLICO EN GENERAL",
      FiscalRegime: "616",
      Email: "contacto@highdatamx.com",
      EmailOp1: "ce.al.nu@gmail.com",
      CfdiUse: "S01",
      TaxZipCode: "76904",
      Rfc: "XAXX010101000",
    };
    data = {
      CfdiType: "I",
      ExpeditionPlace: "76904",
      PaymentForm: "03",
      PaymentMethod: "PUE",
      GlobalInformation: {
        Periodicity: "04",
        Months: date.getMonth() + 1,
        Year: date.getFullYear,
      },
    };
    Items = [
      {
        Quantity: quantity.toFixed(2),
        ProductCode: "52161545",
        UnitCode: "H87",
        Description: description,
        UnitPrice: price.toFixed(2),
        Subtotal: price.toFixed(2),
        Taxes: [
          {
            Name: "IVA",
            Rate: "0.16",
            Total: (price * 0.16).toFixed(2),
            Base: price.toFixed(2),
            IsRetention: "false",
          },
        ],
        Total: (price * quantity * (1 + 0.16)).toFixed(2),
      },
    ];
  } else {
    console.log("Factura a cliente, tomar los datos por favor");
  }
  try {
    const response = await fetch(`https://apisandbox.facturama.mx/3/cfdis`, {
      method: "POST",
      headers: {
        Authorization: config.get("FACTURAMA_SANDBOX_KEY"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Receiver,
        ...data,
        Items,
      }),
    });
    const res = await response.json();
    return { res };
  } catch (err) {
    return { error: true, message: err };
  }
};
