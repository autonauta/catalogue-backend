//Default equipment in case troubles with DB
const defaultInverters = [
  { modelo: "Inversor 3000W", potencia: 3000, strings: 1, precio: 313.92 },
  { modelo: "Inversor 6000W", potencia: 6000, strings: 2, precio: 446 },
  { modelo: "Inversor 10000W", potencia: 10000, strings: 6, precio: 734 },
];

// Usar estas constantes en lugar de los valores numéricos directos
const PRECIO_DOLAR_DEFAULT = 19.83;
const CONSUMO_DIARIO_FACTOR = 1000 / 60;
const HORAS_SOL_PICO = 5;
const UMBRAL_POTENCIA = 0.03;
const inverterMarkup = 30;
//---------------------------------------------------------------------------
//Function to get inverters from DB and select the inverters
const max = 6000;
const getInversores = async (max) => {
  try {
    const dollarPrice = PRECIO_DOLAR_DEFAULT;
    const potenciaRequeridaEnWatts =
      (max * CONSUMO_DIARIO_FACTOR) / HORAS_SOL_PICO;

    const inversores = defaultInverters;
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
// Usar esta función en lugar de .toFixed(2) en todo el código
const roundToTwo = (num) => Number(num.toFixed(2));

const results = getInversores(max);
console.log(results);
