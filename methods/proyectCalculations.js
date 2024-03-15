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
const markupMO = 60;
const panelPower = 550;
const defaultDistance = 40;

const defaultInverters = [
  { modelo: "Inversor 3000W", potencia: 3000, strings: 1 },
  { modelo: "Inversor 6000W", potencia: 6000, strings: 2 },
  { modelo: "Inversor 10000W", potencia: 10000, strings: 6 },
  { modelo: "Inversor 36000W", potencia: 36000, strings: 12 },
];

const getPanelesRequeridos = async (max) => {
  const defaultPanel = {
    nombre: "ETSOLAR 550W",
    marca: "ETSOLAR",
    potencia: 550,
    voltaje: 50,
    precio: 85,
  };
  let dollarPrice;
  const dollarUpdate = await Dollar.find({});
  console.log("Dollar: ", dollarUpdate);
  if (dollarUpdate) dollarPrice = dollarUpdate[0].price;
  else dollarPrice = 17.1;
  const consumoDiario = (max * 1000) / 60;
  const potenciaRequerida = consumoDiario / 5;
  const numPaneles = Math.ceil(potenciaRequerida / panelPower);
  let panel = await Panel.find({});
  console.log("panel: ", panel);
  if (!panel) panel = defaultPanel;
  console.log("panel.precio: ", panel[0].precio);
  console.log("dollarPrice: ", dollarPrice);
  console.log("panelMArkup: ", panelMarkup);
  return {
    numPaneles,
    precio: Number(
      (
        numPaneles *
        panel[0].precio *
        dollarPrice *
        (1 + panelMarkup / 100)
      ).toFixed(2)
    ),
  };
};
const getInversores = async (max) => {
  let dollarPrice;
  const dollarUpdate = await Dollar.find({});
  if (dollarUpdate) dollarPrice = dollarUpdate[0].price;
  else dollarPrice = 17.1;
  const consumoDiario = (max * 1000) / 60;
  const potenciaRequeridaEnWatts = consumoDiario / 5;
  const inversores = await Inverter.find({});
  if (!inversores) inversores = defaultInverters;
  inversores.sort((a, b) => a.potencia - b.potencia); // Ordena los inversores por potencia de forma ascendente

  let potenciaRestante = potenciaRequeridaEnWatts;
  let seleccionados = [];
  const umbral = potenciaRequeridaEnWatts * 0.03; // 3% de la potencia requerida

  while (potenciaRestante > umbral) {
    let inversorSeleccionado;

    // Para el primer inversor y los secundarios, seleccionar el inmediatamente más grande que el restante
    if (potenciaRestante === potenciaRequeridaEnWatts) {
      // Si es el primer inversor
      inversorSeleccionado = inversores.find(
        (inversor) => inversor.potencia >= potenciaRestante
      );
      if (!inversorSeleccionado) {
        // Si no se encuentra un inversor que cumpla exactamente, toma el de mayor potencia
        inversorSeleccionado = inversores[inversores.length - 1];
      }
    } else {
      // Para los inversores secundarios
      inversorSeleccionado = inversores.find(
        (inversor) => inversor.potencia > potenciaRestante
      );
      // Si no se encuentra uno más grande que el restante, toma el de mayor potencia disponible
      if (!inversorSeleccionado)
        inversorSeleccionado = inversores[inversores.length - 1];
    }

    seleccionados.push(inversorSeleccionado); // Agrega el inversor seleccionado a la lista
    potenciaRestante -= inversorSeleccionado.potencia; // Actualiza la potencia restante
  }

  // Agrupa y cuenta los inversores seleccionados
  const resultado = seleccionados.reduce((acc, curr) => {
    const existente = acc.find((item) => item.nombre === curr.nombre);
    if (existente) {
      existente.cantidad++;
    } else {
      acc.push({
        modelo: curr.nombre,
        potencia: curr.potencia,
        cantidad: 1,
        strings: curr.cadenas,
        precio: Number(
          (curr.precio * dollarPrice * (1 + inverterMarkup / 100)).toFixed(2)
        ),
      });
    }
    return acc;
  }, []);

  return resultado;
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
      precio: Number((150 * dollarPrice * (1 + frameMarkup / 100)).toFixed(2)),
    };
  else
    return {
      cantidad: Math.ceil(paneles / 4),
      precio: Number(
        (frame[0].precio * dollarPrice * (1 + frameMarkup / 100)).toFixed(2)
      ),
    };
};
const getMaterials = async (strings) => {
  var diametroTubo;
  if (strings > 0 && strings <= 3) diametroTubo = 0.75;

  if (strings > 3 && strings <= 5) diametroTubo = 1;

  if (strings > 5 && strings <= 7) diametroTubo = 1.15;
  if (strings > 7) diametroTubo = 1.5;
  let precioTubo =
    diametroTubo == 0.75
      ? 127
      : diametroTubo == 1
      ? 160
      : diametroTubo == 1.15
      ? 190
      : 220;
  let precioCondulet =
    diametroTubo == 0.75
      ? 30
      : diametroTubo == 1
      ? 45
      : diametroTubo == 1.15
      ? 60
      : 70;
  let precioConector =
    diametroTubo == 0.75
      ? 7
      : diametroTubo == 1
      ? 12
      : diametroTubo == 1.15
      ? 18
      : 24;
  let precioCople =
    diametroTubo == 0.75
      ? 7
      : diametroTubo == 1
      ? 12
      : diametroTubo == 1.15
      ? 18
      : 24;
  let tubos = {
    cantidad: Math.ceil(defaultDistance / 3),
    precio: Number((Math.ceil(defaultDistance / 3) * precioTubo).toFixed(2)),
  };
  let condulets = {
    cantidad: Math.ceil(tubos.cantidad / 3),
    precio: Number((Math.ceil(tubos.cantidad / 3) * precioCondulet).toFixed(2)),
  };
  let conectores = {
    cantidad: Math.ceil(condulets.cantidad * 6),
    precio: Number(
      (Math.ceil(condulets.cantidad * 6) * precioConector).toFixed(2)
    ),
  };
  let coples = {
    cantidad: Math.ceil(tubos.cantidad * 2),
    precio: Number((Math.ceil(tubos.cantidad * 2) * precioCople).toFixed(2)),
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
  var precioPorPanel = 0;
  var precioInversor = 0;
  if (paneles > 0 && paneles <= 8) {
    precioPorPanel = 1000;
    precioInversor = 0;
  } else if (paneles > 8 && paneles <= 16) {
    precioPorPanel = 800;
    precioInversor = 1000;
  } else if (paneles > 16 && paneles <= 24) {
    precioPorPanel = 700;
    precioInversor = 1000;
  } else if (paneles > 24 && paneles <= 32) {
    precioPorPanel = 600;
    precioInversor = 2000;
  } else if (paneles > 32 && paneles <= 100) {
    precioPorPanel = 500;
    precioInversor = 3000;
  }
  const materiales = {
    precioPorPanel,
    precioInversor,
    total: (precioPorPanel * paneles + precioInversor) * (1 + markupMO / 100),
  };
  return materiales;
};

const calculateProjectPrice = async (project) => {
  console.log("Project inside price: ", project);
  //Precio de inversores
  /* let precioInversores =
  for (let i = 0; i < project.inversores.length; i++) {
    const element = project.inversores[i];

  } */
  //Precio de paneles
  //Precio de soporteria
  //Precio materiales
  //Sumar mano de obra
  //Agregar IVA
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
};

//Code to read PDF BUT NOT IN USE
/* const getMaxConsumption = async (text) => {
  const consumosLine = await text.match(regex);
  const modConsumos = await consumosLine.map((entrada) => {
    return entrada.replace(regex2, "del $1 al $2$3 $4 $$$5");
  });
  console.log("Consumos line: ", modConsumos);
  const numerosAntesDelPrecio = await modConsumos
    .map((entrada) => {
      const match = entrada.match(regex3);
      return match ? match[2] : null; // match[2] contiene el número que buscamos
    })
    .filter((numero) => numero !== null); // Filtramos para quitar posibles nulls
  const numeros = await numerosAntesDelPrecio.map(Number);
  // Encontrar y retornar el valor máximo en el array
  const max = Math.max(...numeros);
  return max;
}; */
