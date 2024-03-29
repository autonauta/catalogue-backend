const puppeteer = require("puppeteer");
const nodemailer = require("nodemailer");
const {
  getPanelesRequeridos,
  getInversores,
  getStrings,
  getSoporteria,
  getMaterials,
  getCables,
  getManoObra,
  calculateProjectPrice,
} = require("./projectCalculations");

const createProject = async (data) => {
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
  let stringsRequeridos = await getStrings(panelesRequeridos.numPaneles);
  //Calcular el cable
  let cablesRequeridos = await getCables(stringsRequeridos.totalStrings);
  //Calcular soportería
  let soporteriaRequerida = await getSoporteria(panelesRequeridos.numPaneles);
  //Calcular ductería y materiales
  let materials = await getMaterials(stringsRequeridos.totalStrings);
  //Calcular mano de obra
  let manoDeObra = await getManoObra(panelesRequeridos.numPaneles);
  //regresar el objeto del proyecto

  let project = {
    cliente: {
      nombre: data.nombre ? data.nombre : "default",
      telefono: data.telefono ? data.telefono : "default",
      email: data.email ? data.email : "default",
    },
    consumoMaximo: Number(data.consumo),
    potencia: potenciaRequerida,
    paneles: panelesRequeridos,
    inversores: inversoresRequeridos,
    strings: stringsRequeridos,
    cables: cablesRequeridos,
    soporteria: soporteriaRequerida,
    materiales: materials,
    manoDeObra,
    precioProyecto,
  };
  const projectPrice = await calculateProjectPrice(project);
  project = {
    ...project,
    precioProyecto: {
      subtotal: projectPrice,
      iva: Number((projectPrice * 0.16).toFixed(2)),
      total: Number((projectPrice + Number(projectPrice * 0.16)).toFixed(2)),
    },
  };
  return project;
};

module.exports.createProject = createProject;
