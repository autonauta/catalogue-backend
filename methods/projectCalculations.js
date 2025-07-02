const { Panel } = require("../models/Panels");
const { Inverter } = require("../models/Inverters");
const { Frame } = require("../models/Frame");
const { Dollar } = require("../models/Dollar");

// Usar estas constantes en lugar de los valores numéricos directos
const panelMarkup = 50;
const inverterMarkup = 30;
const frameMarkup = 25;
const defaultDistance = 25;
const defaultCablePrice = 18;
const defaultCableAcPrice = 22;
const precioTramite = 4000;
const HORAS_SOL_PICO = 5;
const UMBRAL_POTENCIA = 0.03;
const PRECIO_DOLAR_DEFAULT = 20.28;
const CONSUMO_DIARIO_FACTOR = 1000 / 60;
//-----------------------------------------------------------

//Default equipment in case troubles with DB
const defaultInverters = [
  { modelo: "Inversor 3000W", potencia: 3000, strings: 1 },
  { modelo: "Inversor 6000W", potencia: 6000, strings: 2 },
  { modelo: "Inversor 10000W", potencia: 10000, strings: 6 },
  { modelo: "Inversor 36000W", potencia: 36000, strings: 12 },
];
const defaultPanel = {
  nombre: "ETSOLAR 550W",
  marca: "ETSOLAR",
  potencia: 550,
  voltaje: 50,
  precio: 91,
};
//----------------------------------------------

// Usar esta función en lugar de .toFixed(2) en todo el código
const roundToTwo = (num) => Number(num.toFixed(2));
//--------------------------------------------------------

//Function to calculate required pv modules
const getPanelesRequeridos = async (max) => {
  try {
    const dollarPrice =
      (await Dollar.findOne({}))?.price || PRECIO_DOLAR_DEFAULT;
    const potenciaRequerida = (max * CONSUMO_DIARIO_FACTOR) / HORAS_SOL_PICO; // Optimización de cálculo

    const panel = (await Panel.findOne({})) || defaultPanel;
    const numPaneles = Math.ceil(potenciaRequerida / panel.potencia);

    return {
      numPaneles,
      potenciaPanel: panel.potencia,
      precio: roundToTwo(
        numPaneles * panel.precio * dollarPrice * (1 + panelMarkup / 100)
      ),
    };
  } catch (error) {
    console.error("Error en getPanelesRequeridos:", error);
    throw error;
  }
};
//---------------------------------------------------------------------------
//Function to get inverters from DB and select the inverters
const getInversores = async (max) => {
  try {
    const dollarPrice = (await Dollar.findOne({}))?.price || 17.1;
    const potenciaRequeridaEnWatts =
      (max * CONSUMO_DIARIO_FACTOR) / HORAS_SOL_PICO;

    const inversores = (await Inverter.find({})) || defaultInverters;
    inversores.sort((a, b) => a.potencia - b.potencia);

    const seleccionados = seleccionarInversores(
      inversores,
      potenciaRequeridaEnWatts
    );

    return procesarSeleccionados(seleccionados, dollarPrice);
  } catch (error) {
    console.error("Error en getInversores:", error);
    throw error;
  }
};
//-------------------------------------------------------------------------
// Function to select the required inverters based on the required power
const seleccionarInversores = (inversores, potenciaRestante) => {
  const umbral = potenciaRestante * UMBRAL_POTENCIA;
  const seleccionados = [];

  while (potenciaRestante > umbral) {
    const inversorSeleccionado =
      inversores.find((inversor) => inversor.potencia >= potenciaRestante) ||
      inversores[inversores.length - 1];

    seleccionados.push(inversorSeleccionado);
    potenciaRestante -= inversorSeleccionado.potencia;
  }

  return seleccionados;
};
//----------------------------------------------------------------------
// Función para procesar los inversores seleccionados
const procesarSeleccionados = (seleccionados, dollarPrice) => {
  return seleccionados.reduce((acc, curr) => {
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
};
//Function to get the number of pv strings required depending on the amount of panels and the limits of the inverters
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
  const cantidadDc = strings * defaultDistance;
  const cantidadAc = 5;
  const precioDc = cantidadDc * defaultCablePrice;
  const cantidadAcB = cantidadAc * 2;
  const precioAc = cantidadAc * defaultCableAcPrice;
  const precioAcB = cantidadAcB * defaultCableAcPrice;

  return {
    blackCable: { cantidadDc, precio: precioDc },
    redCable: { cantidadDc, precio: precioDc },
    greenCable: {
      cantidad: defaultDistance,
      precio: defaultDistance * defaultCablePrice,
    },
    blackCableAc: { cantidadAcB, precio: precioAcB },
    whiteCableAc: { cantidadAc, precio: precioAc },
  };
};

const getSoporteria = async (paneles) => {
  let dollarPrice;
  const dollarUpdate = await Dollar.find({});
  if (dollarUpdate) dollarPrice = dollarUpdate[0].price;
  else dollarPrice = PRECIO_DOLAR_DEFAULT;
  const frame = await Frame.find({});
  if (!frame)
    return {
      cantidad: Math.ceil(paneles / 4),
      precio: roundToTwo(130 * dollarPrice * (1 + frameMarkup / 100)),
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
  [0.75, { tubo: 170, condulet: 46, conector: 18, codo: 45 }],
  [1, { tubo: 239, condulet: 54, conector: 22, codo: 70 }],
  [1.25, { tubo: 380, condulet: 140, conector: 28, codo: 110 }],
  [1.5, { tubo: 550, condulet: 180, conector: 31, codo: 140 }],
]);

const getMaterials = async (strings) => {
  const diametroTubo =
    strings <= 3 ? 0.75 : strings <= 5 ? 1 : strings <= 7 ? 1.25 : 1.5;
  const {
    tubo: precioTubo,
    condulet: precioCondulet,
    conector: precioConector,
    codo: precioCodo,
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
  let codos = {
    cantidad: 4,
    precio: 4 * precioCodo,
  };
  const materiales = {
    diametroTubo,
    tubos,
    condulets,
    conectores,
    coples,
    codos,
  };
  return materiales;
};

const getManoObra = async (paneles) => {
  const rangos = new Map([
    [
      8,
      {
        precioPorPanel: 1000,
        precioInversor: 0,
        precioEnvio: 1200,
        precioIngenieria: 4000,
      },
    ],
    [
      16,
      {
        precioPorPanel: 800,
        precioInversor: 1000,
        precioEnvio: 1800,
        precioIngenieria: 5000,
      },
    ],
    [
      24,
      {
        precioPorPanel: 700,
        precioInversor: 1000,
        precioEnvio: 2500,
        precioIngenieria: 6000,
      },
    ],
    [
      32,
      {
        precioPorPanel: 600,
        precioInversor: 2000,
        precioEnvio: 3000,
        precioIngenieria: 7000,
      },
    ],
    [
      100,
      {
        precioPorPanel: 500,
        precioInversor: 3000,
        precioEnvio: 4500,
        precioIngenieria: 7000,
      },
    ],
  ]);

  // Buscar el primer rango mayor o igual al número de paneles
  const rangoKey = [...rangos.keys()].find((key) => paneles <= key) || 100;
  const { precioPorPanel, precioInversor, precioEnvio, precioIngenieria } =
    rangos.get(rangoKey);

  return {
    precioPaneles: paneles * precioPorPanel,
    precioInversor,
    precioEnvio,
    precioIngenieria,
    precioTramite,
    precio:
      paneles * precioPorPanel +
      precioInversor +
      precioEnvio +
      precioIngenieria +
      precioTramite,
  };
};

const calculateProjectPrice = async (objeto) => {
  /*  const sumarPrecios = (obj) => {
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
      return sum + (key.includes("precio") ? value : sumarPrecios(value));
    }, 0);
  };
 */
  let total = 0;

  const recorrer = (valor) => {
    if (Array.isArray(valor)) {
      valor.forEach(recorrer);
    } else if (typeof valor === "object" && valor !== null) {
      for (const key in valor) {
        if (key.toLowerCase() === "precio" && typeof valor[key] === "number") {
          total += valor[key];
        } else {
          recorrer(valor[key]);
        }
      }
    }
  };

  recorrer(objeto);
  return roundToTwo(total);
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
