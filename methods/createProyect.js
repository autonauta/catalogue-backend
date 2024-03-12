const panelPower = 550;
const regex =
  /del \d{2} [A-Z]{3} \d{2} al \d{2} [A-Z]{3} \d{2}.*?\$\d+,\d+\.\d+/g; //Filtro para encontrar unicamente las lineas de los consumos
const regex2 =
  /del (\d{2} [A-Z]{3} \d{2}) al (\d{2} [A-Z]{3} )(\d{2})(\d{3})\$(\d+,\d+\.\d+)/; //Filtro para re acomodar las lineas correctamente
const regex3 =
  /(\d{2} [A-Z]{3} \d{2} al \d{2} [A-Z]{3} \d{2} )(\d+) \$\d+,\d+\.\d+/; //Filtro para obtener únicamente los consumos

const inversores = [
  { modelo: "Inversor 3000W", potencia: 3000 },
  { modelo: "Inversor 6000W", potencia: 6000 },
  { modelo: "Inversor 10000W", potencia: 10000 },
  { modelo: "Inversor 20000W", potencia: 20000 },
  { modelo: "Inversor 36000W", potencia: 50000 },
  { modelo: "Inversor 50000W", potencia: 70000 },
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
      acc.push({ modelo: curr.modelo, potencia: curr.potencia, cantidad: 1 });
    }
    return acc;
  }, []);

  return resultado;
};

const createProyect = async (consumoMax) => {
  //Leer el documento recibido
  //let processedText = await getPDFText("files/pdf", "pdfFile.pdf");
  //Obtener consumo máximo
  //let consumoMaximo = await getMaxConsumption(processedText);
  console.log("consumo maximo: ", consumoMax);
  const consumoDiario = (consumoMax * 1000) / 60;
  const potenciaRequerida = consumoDiario / 5;
  //Calcular cuantos paneles se necesitan
  let panelesRequeridos = await getPanelesRequeridos(consumoMax);
  console.log("Paneles requeridos: ", panelesRequeridos);
  //Calcular el inversor
  let inversor = await getInversores(consumoMax);
  console.log("Inversor requerido: ", inversor);
  //Calcular cuantos strings
  //Calcular el cable
  //Calcular soportería
  //Calcular ductería y materiales
  //Calcular mano de obra
  //regresar el objeto del proyecto
  const proyect = {
    potencia: potenciaRequerida,
    paneles: panelesRequeridos,
    inversores: inversor,
    strings: null,
    cable: null,
    soporteria: null,
    ducteria: null,
    mo: null,
  };
  return proyect;
};

module.exports.createProyect = createProyect;
