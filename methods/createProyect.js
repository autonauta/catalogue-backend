const panelPower = 550;
const regex =
  /del \d{2} [A-Z]{3} \d{2} al \d{2} [A-Z]{3} \d{2}.*?\$\d+,\d+\.\d+/g; //Filtro para encontrar unicamente las lineas de los consumos
const regex2 =
  /del (\d{2} [A-Z]{3} \d{2}) al (\d{2} [A-Z]{3} )(\d{2})(\d{3})\$(\d+,\d+\.\d+)/; //Filtro para re acomodar las lineas correctamente
const regex3 =
  /(\d{2} [A-Z]{3} \d{2} al \d{2} [A-Z]{3} \d{2} )(\d+) \$\d+,\d+\.\d+/; //Filtro para obtener únicamente los consumos
const defaultDistance = 40;
const inversores = [
  { modelo: "Inversor 3000W", potencia: 3000, strings: 1 },
  { modelo: "Inversor 6000W", potencia: 6000, strings: 2 },
  { modelo: "Inversor 10000W", potencia: 10000, strings: 6 },
  { modelo: "Inversor 36000W", potencia: 36000, strings: 12 },
];

const getMaxConsumption = async (text) => {
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
};
//Funcion para obtener los paneles requeridos
const getPanelesRequeridos = async (max) => {
  const consumoDiario = (max * 1000) / 60;
  const potenciaRequerida = consumoDiario / 5;
  const numPaneles = Math.ceil(potenciaRequerida / panelPower);
  return numPaneles;
};
const getInversores = async (max) => {
  const consumoDiario = (max * 1000) / 60;
  const potenciaRequeridaEnWatts = consumoDiario / 5;
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
    const existente = acc.find((item) => item.modelo === curr.modelo);
    if (existente) {
      existente.cantidad++;
    } else {
      acc.push({
        modelo: curr.modelo,
        potencia: curr.potencia,
        cantidad: 1,
        strings: curr.strings,
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
  let blackCable = strings * defaultDistance;
  let redCable = blackCable;
  let greenCable = defaultDistance;
  const cables = {
    blackCable,
    redCable,
    greenCable,
  };
  return cables;
};
const getSoporteria = async (paneles) => {
  return paneles / 4;
};
const getMaterials = async (strings) => {
  var diametroTubo;
  if (strings > 0 && strings <= 3) diametroTubo = 0.75;

  if (strings > 3 && strings <= 5) diametroTubo = 1;

  if (strings > 5 && strings <= 7) diametroTubo = 1.15;
  if (strings > 7) diametroTubo = 1.5;

  let tubos = Math.ceil(defaultDistance / 3);
  let condulets = Math.ceil(tubos / 3);
  let conectores = Math.ceil(condulets * 6);
  let coples = Math.ceil(tubos * 2);
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
    total: precioPorPanel * paneles + precioInversor,
  };
  return materiales;
};

const createProyect = async (data) => {
  //Leer el documento recibido
  //let processedText = await getPDFText("files/pdf", "pdfFile.pdf");
  //Obtener consumo máximo
  //let consumoMaximo = await getMaxConsumption(processedText);
  const consumoDiario = (data.consumo * 1000) / 60;
  const potenciaRequerida = consumoDiario / 5;
  //Calcular cuantos paneles se necesitan
  let panelesRequeridos = await getPanelesRequeridos(data.consumo);
  //Calcular el inversor
  let inversoresRequeridos = await getInversores(data.consumo);
  //Calcular cuantos strings
  let stringsRequeridos = await getStrings(panelesRequeridos);
  //Calcular el cable
  let cablesRequeridos = await getCables(stringsRequeridos.totalStrings);
  //Calcular soportería
  let soporteriaRequerida = await getSoporteria(panelesRequeridos);
  //Calcular ductería y materiales
  let materials = await getMaterials(stringsRequeridos.totalStrings);
  //Calcular mano de obra
  let manoDeObra = await getManoObra(panelesRequeridos);
  //regresar el objeto del proyecto
  const proyect = {
    cliente: {
      nombre: data.nombre,
      telefono: data.telefono,
      email: data.email,
    },
    consumoMaximo: data.consumo,
    potencia: potenciaRequerida,
    paneles: panelesRequeridos,
    inversores: inversoresRequeridos,
    strings: stringsRequeridos,
    cables: cablesRequeridos,
    soporteria: soporteriaRequerida,
    materiales: materials,
    manoDeObra,
  };
  return proyect;
};

module.exports.createProyect = createProyect;
