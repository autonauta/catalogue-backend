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

exports.createBill = async (general, data) => {
  var Receiver = {};
  var data = {};
  var Items = [];
  if (general) {
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
      NameId: "1",
      ExpeditionPlace: "76904",
      PaymentForm: "03",
      PaymentMethod: "PUE",
      Folio: "100",
      Date: "2023-02-10T14:11:39",
    };
    Items = [
      {
        Quantity: "1",
        ProductCode: "52161545",
        UnitCode: "H87",
        Description: "Cámara digital de vigilancia de batería recargable",
        UnitPrice: "3100.00",
        Subtotal: "3100.00",
        Taxes: [
          {
            Name: "IVA",
            Rate: "0.16",
            Total: "496",
            Base: "3100",
            IsRetention: "false",
          },
        ],
        Total: "3596",
      },
    ];
  } else {
    console.log("Factura a cliente, tomar los datos por favor");
  }
  try {
    const response = await fetch(`https://apisandbox.facturama.mx/2/cfdis`, {
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
