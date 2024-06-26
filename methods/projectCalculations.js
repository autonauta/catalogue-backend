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
const precioTramite = 3000;

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
  if (dollarUpdate) dollarPrice = dollarUpdate[0].price;
  else dollarPrice = 17.1;
  const consumoDiario = (max * 1000) / 60;
  const potenciaRequerida = consumoDiario / 5;
  const numPaneles = Math.ceil(potenciaRequerida / panelPower);
  let panel = await Panel.find({});
  if (!panel) panel = defaultPanel;
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
////////////////////////////////////////////////////7777
//////////////////////////////////////////////////////

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
    const existente = acc.find((item) => item.modelo === curr.nombre);
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
        (
          Math.ceil(paneles / 4) *
          frame[0].precio *
          dollarPrice *
          (1 + frameMarkup / 100)
        ).toFixed(2)
      ),
    };
};
const getMaterials = async (strings) => {
  var diametroTubo;
  if (strings > 0 && strings <= 3) diametroTubo = 0.75;

  if (strings > 3 && strings <= 5) diametroTubo = 1;

  if (strings > 5 && strings <= 7) diametroTubo = 1.25;
  if (strings > 7) diametroTubo = 1.5;
  let precioTubo =
    diametroTubo == 0.75
      ? 170
      : diametroTubo == 1
      ? 300
      : diametroTubo == 1.25
      ? 380
      : 550;
  let precioCondulet =
    diametroTubo == 0.75
      ? 46
      : diametroTubo == 1
      ? 73
      : diametroTubo == 1.25
      ? 140
      : 180;
  let precioConector =
    diametroTubo == 0.75
      ? 18
      : diametroTubo == 1
      ? 22
      : diametroTubo == 1.25
      ? 28
      : 31;
  let precioCople =
    diametroTubo == 0.75
      ? 18
      : diametroTubo == 1
      ? 22
      : diametroTubo == 1.25
      ? 28
      : 31;
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
  const promoMinisplit = paneles >= 10 ? 2000 : 0;
  if (paneles >= 10) {
    console.log("PROMO PANELES APLICADA", paneles);
  }
  var precioPorPanel = 0;
  var precioInversor = 0;
  var precioEnvio = 0;
  if (paneles > 0 && paneles <= 8) {
    precioPorPanel = 1000;
    precioInversor = 0;
    precioEnvio = 1200;
  } else if (paneles > 8 && paneles <= 16) {
    precioPorPanel = 800;
    precioInversor = 1000;
    precioEnvio = 1800;
  } else if (paneles > 16 && paneles <= 24) {
    precioPorPanel = 700;
    precioInversor = 1000;
    precioEnvio = 2500;
  } else if (paneles > 24 && paneles <= 32) {
    precioPorPanel = 600;
    precioInversor = 2000;
    precioEnvio = 3000;
  } else if (paneles > 32 && paneles <= 100) {
    precioPorPanel = 500;
    precioInversor = 3000;
    precioEnvio = 4500;
  }
  const mo = {
    porPanel: precioPorPanel,
    inversor: precioInversor,
    tramite: precioTramite,
    precio:
      (precioPorPanel * paneles +
        precioInversor +
        precioTramite +
        precioEnvio +
        promoMinisplit) *
      (1 + markupMO / 100),
  };
  return mo;
};
const calculateProjectPrice = async (objeto) => {
  let total = 0;

  function sumar(obj, esInversor = false) {
    for (const key of Object.keys(obj)) {
      const valor = obj[key];

      // Si el valor es un objeto y no es null, se revisa si estamos en el array 'inversores'
      if (typeof valor === "object" && valor !== null) {
        // Si es un array, revisamos si estamos en 'inversores' por el nombre de la clave
        if (Array.isArray(valor) && key === "inversores") {
          // Pasamos true para indicar que estamos procesando 'inversores'
          valor.forEach((item) => sumar(item, true));
        } else {
          // Continuamos la recursión normalmente para otros objetos o arrays
          sumar(valor);
        }
      } else if (esInversor && key === "precio") {
        // Si estamos en un inversor, multiplicamos el precio por la cantidad
        const cantidad = obj.cantidad || 1; // Aseguramos que haya una cantidad mínima de 1
        total += valor * cantidad;
      } else if (!esInversor && key.includes("precio")) {
        // Sumamos si la clave es un precio y no estamos en un inversor
        total += valor;
      }
    }
  }

  sumar(objeto); // Inicia la función recursiva
  return total;
};

const calculateInversores = async (datos) => {
  let inversores = datos.inversores;
  return inversores.reduce(
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

  return Number(total.toFixed(2));
};

const generateInvertersHTML = async (datos) => {
  const inversores = datos.inversores;
  let html = "";
  for (let i = 0; i < inversores.length; i++) {
    html += `<li><strong>Inversor ${inversores[i].modelo} : </strong> ${inversores[i].cantidad}</li>`;
  }
  return html;
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
};
