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
  // Calcular consumo diario y potencia requerida
  const consumoDiario = (data.consumo * 1000) / 60;
  const potenciaRequerida = Math.ceil(consumoDiario / 5);

  // Calcular requerimientos
  const panelesRequeridos = await getPanelesRequeridos(data.consumo);
  const inversoresRequeridos = await getInversores(data.consumo);
  const stringsRequeridos = await getStrings(panelesRequeridos.numPaneles);
  const cablesRequeridos = await getCables(stringsRequeridos.totalStrings);
  const soporteriaRequerida = await getSoporteria(panelesRequeridos.numPaneles);
  const materials = await getMaterials(stringsRequeridos.totalStrings);
  const manoDeObra = await getManoObra(panelesRequeridos.numPaneles);

  // Crear objeto del proyecto
  let project = {
    cliente: {
      nombre: data.nombre || "default",
      telefono: data.telefono || "default",
      email: data.email || "default",
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
    precioProyecto: 0, // Inicializar precioProyecto
  };

  // Calcular precio del proyecto
  const projectPrice = await calculateProjectPrice(project);
  project.precioProyecto = {
    subtotal: projectPrice,
    iva: Number((projectPrice * 0.16).toFixed(2)),
    total: Number((projectPrice + project.precioProyecto.iva).toFixed(2)),
  };

  return project;
};

module.exports.createProject = createProject;
