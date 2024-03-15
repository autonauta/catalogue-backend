const {
  getPanelesRequeridos,
  getInversores,
  getStrings,
  getSoporteria,
  getMaterials,
  getCables,
  getManoObra,
  calculateProjectPrice,
} = require("../methods/proyectCalculations");

const createProyect = async (data) => {
  //Leer el documento recibido
  //let processedText = await getPDFText("files/pdf", "pdfFile.pdf");
  //Obtener consumo máximo
  //let consumoMaximo = await getMaxConsumption(processedText);
  let precioProyecto = 0;
  const consumoDiario = (data.consumo * 1000) / 60;
  const potenciaRequerida = Math.ceil(consumoDiario / 5);
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

  const project = {
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
    soporteria: Math.ceil(soporteriaRequerida),
    materiales: materials,
    manoDeObra,
    precioProyecto,
  };
  //const projectPrice = await calculateProjectPrice(project);
  project = { ...projectPrice, precioProyecto: projectPrice };
  return project;
};

module.exports.createProyect = createProyect;
