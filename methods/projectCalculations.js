const { Panel } = require("../models/Panels");
const { Inverter } = require("../models/Inverters");
const { Frame } = require("../models/Frame");
const { Dollar } = require("../models/Dollar");

/* const regex =
  /del \d{2} [A-Z]{3} \d{2} al \d{2} [A-Z]{3} \d{2}.*?\$\d+,\d+\.\d+/g; //Filtro para encontrar unicamente las lineas de los consumos
const regex2 =
  /del (\d{2} [A-Z]{3} \d{2}) al (\d{2} [A-Z]{3} )(\d{2})(\d{3})\$(\d+,\d+\.\d+)/; //Filtro para re acomodar las lineas correctamente
const regex3 =
  /(\d{2} [A-Z]{3} \d{2} al \d{2} [A-Z]{3} \d{2} )(\d+) \$\d+,\d+\.\d+/; //Filtro para obtener únicamente los consumos */

const panelMarkup = 50;
const inverterMarkup = 35;
const frameMarkup = 25;
const markupMO = 50;
const panelPower = 550;
const defaultDistance = 40;
const precioTramite = 3500;
const HORAS_SOL_PICO = 5;
const UMBRAL_POTENCIA = 0.03;

const defaultInverters = [
  { modelo: "Inversor 3000W", potencia: 3000, strings: 1 },
  { modelo: "Inversor 6000W", potencia: 6000, strings: 2 },
  { modelo: "Inversor 10000W", potencia: 10000, strings: 6 },
  { modelo: "Inversor 36000W", potencia: 36000, strings: 12 },
];

const roundToTwo = (num) => Number(num.toFixed(2));

// Usar esta función en lugar de .toFixed(2) en todo el código

const CONSUMO_DIARIO_FACTOR = 1000 / 60;
const PANEL_MINIMO_PROMO = 10;
const PROMO_MINISPLIT = 2000;

// Usar estas constantes en lugar de los valores numéricos directos

const getPanelesRequeridos = async (max) => {
  try {
    const defaultPanel = {
      nombre: "ETSOLAR 550W",
      marca: "ETSOLAR",
      potencia: 550,
      voltaje: 50,
      precio: 85,
    };

    const [dollarUpdate] = await Dollar.find({});
    const dollarPrice = dollarUpdate ? dollarUpdate.price : 17.1;

    const consumoDiario = (max * 1000) / 60;
    const potenciaRequerida = consumoDiario / HORAS_SOL_PICO;

    const [panel] = (await Panel.find({})) || [defaultPanel];

    const numPaneles =
      Math.ceil(potenciaRequerida / panel.potencia) ||
      Math.ceil(potenciaRequerida / panelPower);

    return {
      numPaneles,
      precio: roundToTwo(
        numPaneles * panel.precio * dollarPrice * (1 + panelMarkup / 100)
      ),
    };
  } catch (error) {
    console.error("Error en getPanelesRequeridos:", error);
    throw error;
  }
};
////////////////////////////////////////////////////7777
//////////////////////////////////////////////////////

const getInversores = async (max) => {
  try {
    const dollarUpdate = (await Dollar.findOne({})) || { price: 17.1 };
    const dollarPrice = dollarUpdate.price;

    const consumoDiario = max * CONSUMO_DIARIO_FACTOR;
    const potenciaRequeridaEnWatts = consumoDiario / HORAS_SOL_PICO;

    const inversores = (await Inverter.find({})) || defaultInverters;
    inversores.sort((a, b) => a.potencia - b.potencia);

    let potenciaRestante = potenciaRequeridaEnWatts;
    const umbral = potenciaRequeridaEnWatts * UMBRAL_POTENCIA;
    const seleccionados = [];

    while (potenciaRestante > umbral) {
      const esPrimerInversor = potenciaRestante === potenciaRequeridaEnWatts;
      const inversorSeleccionado =
        inversores.find((inversor) =>
          esPrimerInversor
            ? inversor.potencia >= potenciaRestante
            : inversor.potencia > potenciaRestante
        ) || inversores[inversores.length - 1];

      seleccionados.push(inversorSeleccionado);
      potenciaRestante -= inversorSeleccionado.potencia;
    }

    const resultado = seleccionados.reduce((acc, curr) => {
      const existente = acc.find((item) => item.modelo === curr.nombre);
      if (existente) {
        existente.cantidad++;
      } else {
        acc.push({
          modelo: curr.nombre,
          potencia: curr.potencia,
          cantidad: 1,
          strings: curr.cadenas,
          precio: roundToTwo(
            curr.precio * dollarPrice * (1 + inverterMarkup / 100)
          ),
        });
      }
      return acc;
    }, []);

    return resultado;
  } catch (error) {
    console.error("Error en getInversores:", error);
    throw error;
  }
};
const getStrings = async (paneles) => {
  const panelVoltage = 50;
  const maxVoltage = 500;
  const maxPanelsPerString = maxVoltage / panelVoltage;
  const completeStrings = Math.floor(paneles / maxPanelsPerString);
  const lastString = paneles - completeStrings * 10;
  const strings = {
    completeStrings,
    lastString,
    totalStrings: lastString > 0 ? completeStrings + 1 : completeStrings,
  };
  return strings;
};
const getCables = async (strings) => {
  const defaultCablePrice = 17;
  let blackCable = {
    cantidad: strings * defaultDistance,
    precio: strings * defaultDistance * defaultCablePrice,
  };
  let redCable = blackCable;
  let greenCable = {
    cantidad: defaultDistance,
    precio: defaultDistance * defaultCablePrice,
  };
  const cables = {
    blackCable,
    redCable,
    greenCable,
  };
  return cables;
};
const getSoporteria = async (paneles) => {
  let dollarPrice;
  const dollarUpdate = await Dollar.find({});
  if (dollarUpdate) dollarPrice = dollarUpdate[0].price;
  else dollarPrice = 17.1;
  const frame = await Frame.find({});
  if (!frame)
    return {
      cantidad: Math.ceil(paneles / 4),
      precio: roundToTwo(150 * dollarPrice * (1 + frameMarkup / 100)),
    };
  else
    return {
      cantidad: Math.ceil(paneles / 4),
      precio: roundToTwo(
        Math.ceil(paneles / 4) *
          frame[0].precio *
          dollarPrice *
          (1 + frameMarkup / 100)
      ),
    };
};
const diametroTuboPrecio = new Map([
  [0.75, { tubo: 170, condulet: 46, conector: 18 }],
  [1, { tubo: 300, condulet: 73, conector: 22 }],
  [1.25, { tubo: 380, condulet: 140, conector: 28 }],
  [1.5, { tubo: 550, condulet: 180, conector: 31 }],
]);

const getMaterials = async (strings) => {
  const diametroTubo =
    strings <= 3 ? 0.75 : strings <= 5 ? 1 : strings <= 7 ? 1.25 : 1.5;
  const {
    tubo: precioTubo,
    condulet: precioCondulet,
    conector: precioConector,
  } = diametroTuboPrecio.get(diametroTubo);
  const precioCople = precioConector;

  let tubos = {
    cantidad: Math.ceil(defaultDistance / 3),
    precio: roundToTwo(Math.ceil(defaultDistance / 3) * precioTubo),
  };
  let condulets = {
    cantidad: Math.ceil(tubos.cantidad / 3),
    precio: roundToTwo(Math.ceil(tubos.cantidad / 3) * precioCondulet),
  };
  let conectores = {
    cantidad: Math.ceil(condulets.cantidad * 6),
    precio: roundToTwo(Math.ceil(condulets.cantidad * 6) * precioConector),
  };
  let coples = {
    cantidad: Math.ceil(tubos.cantidad * 2),
    precio: roundToTwo(Math.ceil(tubos.cantidad * 2) * precioCople),
  };
  const materiales = {
    diametroTubo,
    tubos,
    condulets,
    conectores,
    coples,
  };
  return materiales;
};
const getManoObra = async (paneles) => {
  const rangos = [
    { max: 8, precioPorPanel: 1000, precioInversor: 0, precioEnvio: 1200 },
    { max: 16, precioPorPanel: 800, precioInversor: 1000, precioEnvio: 1800 },
    { max: 24, precioPorPanel: 700, precioInversor: 1000, precioEnvio: 2500 },
    { max: 32, precioPorPanel: 600, precioInversor: 2000, precioEnvio: 3000 },
    { max: 100, precioPorPanel: 500, precioInversor: 3000, precioEnvio: 4500 },
  ];

  const rango =
    rangos.find((r) => paneles <= r.max) || rangos[rangos.length - 1];
  const { precioPorPanel, precioInversor, precioEnvio } = rango;

  const precioTotal =
    precioPorPanel * paneles + precioInversor + precioTramite + precioEnvio;

  return {
    porPanel: precioPorPanel,
    inversor: precioInversor,
    tramite: precioTramite,
    precio: precioTotal * (1 + markupMO / 100),
  };
};
const calculateProjectPrice = async (objeto) => {
  const sumarPrecios = (obj) => {
    if (Array.isArray(obj)) {
      return obj.reduce((sum, item) => sum + sumarPrecios(item), 0);
    }
    if (typeof obj !== "object" || obj === null) {
      return 0;
    }
    return Object.entries(obj).reduce((sum, [key, value]) => {
      if (key === "inversores") {
        return (
          sum +
          value.reduce((invSum, inv) => invSum + inv.precio * inv.cantidad, 0)
        );
      }
      if (key.includes("precio")) {
        return sum + value;
      }
      return sum + sumarPrecios(value);
    }, 0);
  };

  return sumarPrecios(objeto);
};

const calculateInversores = (datos) => {
  return datos.inversores.reduce(
    (acumulado, inversor) => acumulado + inversor.precio * inversor.cantidad,
    0
  );
};

const calculateMateriales = async (proyecto) => {
  let total = 0;

  // Sumar precios de los cables
  Object.values(proyecto.cables).forEach((cable) => (total += cable.precio));

  // Sumar precio de la soportería
  total += proyecto.soporteria.precio;

  // Sumar precios de los materiales
  Object.values(proyecto.materiales).forEach((material) => {
    // Si el material es un objeto que contiene un precio, súmalo
    if (typeof material === "object" && material.precio) {
      total += material.precio;
    }
  });

  return roundToTwo(total);
};

const generateInvertersHTML = (datos) => {
  return datos.inversores
    .map(
      ({ modelo, cantidad }) =>
        `<li><strong>Inversor ${modelo} : </strong> ${cantidad}</li>`
    )
    .join("");
};

const calculateProject = async (max) => {
  try {
    const [
      paneles,
      inversores,
      strings,
      cables,
      soporteria,
      materiales,
      manoObra,
    ] = await Promise.all([
      getPanelesRequeridos(max),
      getInversores(max),
      getStrings(paneles.numPaneles),
      getCables(strings.totalStrings),
      getSoporteria(paneles.numPaneles),
      getMaterials(strings.totalStrings),
      getManoObra(paneles.numPaneles),
    ]);

    const proyecto = {
      paneles,
      inversores,
      strings,
      cables,
      soporteria,
      materiales,
      manoObra,
    };
    const precioTotal = await calculateProjectPrice(proyecto);

    return { proyecto, precioTotal };
  } catch (error) {
    console.error("Error en calculateProject:", error);
    throw error;
  }
};

module.exports = {
  getPanelesRequeridos,
  getInversores,
  getStrings,
  getCables,
  getSoporteria,
  getMaterials,
  getManoObra,
  calculateProjectPrice,
  calculateInversores,
  calculateMateriales,
  generateInvertersHTML,
  calculateProject,
};
