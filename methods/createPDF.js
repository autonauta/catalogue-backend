const puppeteer = require("puppeteer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const {
  calculateInversores,
  calculateMateriales,
} = require("../methods/projectCalculations");

const createPDF = async (datos) => {
  // Leer la plantilla Handlebars del sistema de archivos
  const plantillaPath = path.resolve("./html", "cotizacionEmail.handlebars");
  const contenidoPlantilla = fs.readFileSync(plantillaPath, "utf8");
  const precioInversores = await calculateInversores(datos);
  const precioPaneles = datos.paneles.precio;
  const precioMateriales = await calculateMateriales(datos);
  const precioManoDeObra = datos.manoDeObra.precio;
  const fillData = {
    fecha: new Date().toLocaleDateString(),
    numCotizacion: 9999,
    nombre: datos.cliente.nombre,
    consumoBimestral: datos.consumoMaximo.toLocaleString("en-US", {
      minimumFractionDigits: 2, // Mínimo de dígitos fraccionarios
      maximumFractionDigits: 2, // Máximo de dígitos fraccionarios
    }),
    potenciaRequerida: (datos.potencia / 1000).toLocaleString("en-US", {
      minimumFractionDigits: 2, // Mínimo de dígitos fraccionarios
      maximumFractionDigits: 2, // Máximo de dígitos fraccionarios
    }),
    numPaneles: datos.paneles.numPaneles,
    nombreInversor: datos.inversores[0].modelo,
    potenciaInversor: datos.inversores[0].potencia,
    cantidadInversor: datos.inversores[0].cantidad,
    produccionDiaria: ((datos.potencia * 5) / 1000).toLocaleString("en-US", {
      minimumFractionDigits: 2, // Mínimo de dígitos fraccionarios
      maximumFractionDigits: 2, // Máximo de dígitos fraccionarios
    }),
    produccionBimestral: ((datos.potencia * 5 * 60) / 1000).toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2, // Mínimo de dígitos fraccionarios
        maximumFractionDigits: 2, // Máximo de dígitos fraccionarios
      }
    ),
    ahorroAnual: (((datos.potencia * 5) / 1000) * 4 * 365).toLocaleString(
      "es-MX",
      { style: "currency", currency: "MXN" }
    ),
    ROI: Number(
      (
        datos.precioProyecto.total /
        ((4 * (datos.potencia * 5) * 30) / 1000) /
        12
      ).toFixed(2)
    ),
    precioEquipos: (precioInversores + precioPaneles).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    }),
    precioMateriales: precioMateriales.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    }),
    precioInstalacion: precioManoDeObra.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    }),
    precioSubTotal: datos.precioProyecto.subtotal.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    }),
    IVA: datos.precioProyecto.iva.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    }),
    precioTotal: datos.precioProyecto.total.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    }),
  };
  // Compilar la plantilla con Handlebars
  const plantilla = handlebars.compile(contenidoPlantilla);
  const html = plantilla(fillData);

  // Configurar Puppeteer
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  // Definir las dimensiones del viewport antes de generar el contenido
  await page.setViewport({
    width: 2480, // Ancho del viewport en píxeles
    height: 3508, // Alto del viewport en píxeles
    deviceScaleFactor: 1, // Factor de escala del dispositivo (puede afectar la resolución del PDF)
  });

  // Establecer el contenido de la página con el HTML generado
  await page.setContent(html, {
    waitUntil: "networkidle0", // Espera hasta que la red esté inactiva
  });

  // Generar el PDF
  const pdf = await page.pdf({
    format: "A4",
    printBackground: true, // Asegura que los estilos de fondo se impriman
  });

  await browser.close();

  // Opcional: Guardar el PDF en el sistema de archivos, o puedes devolver `pdf` directamente
  const outputPath = path.resolve(
    "./files/cotizaciones",
    "cotizacion_" + datos.cliente.nombre.replace(/ /g, "_") + ".pdf"
  );
  fs.writeFileSync(outputPath, pdf);

  console.log("PDF generado y guardado en:", outputPath);

  // Retorna el nombre del archivo
  return "cotizacion_" + datos.cliente.nombre.replace(/ /g, "_") + ".pdf";
};

module.exports.createPDF = createPDF;
