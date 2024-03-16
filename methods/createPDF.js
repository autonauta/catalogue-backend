const puppeteer = require("puppeteer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");

const createPDF = async (datos) => {
  // Leer la plantilla Handlebars del sistema de archivos
  const plantillaPath = path.resolve("./html", "cotizacionEmail.handlebars");
  const contenidoPlantilla = fs.readFileSync(plantillaPath, "utf8");
  const fillData = {
    numCotizacion,
    nombre: datos.cliente.nombre,
    consumoBimestral: datos.consumoMaximo,
    potenciaRequerida,
    numPaneles,
    nombreInversor,
    potenciaInversor,
    cantidadInversor,
    produccionDiaria,
    produccionBimestral,
    ahorroAnual,
    ROI,
    precioEquipos,
    precioMateriales,
    precioInstalacion,
    precioTotal,
  };
  // Compilar la plantilla con Handlebars
  const plantilla = handlebars.compile(contenidoPlantilla);
  const html = plantilla(datos);

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
    "cotizacion_" + datos.cliente.nombre + ".pdf"
  );
  fs.writeFileSync(outputPath, pdf);

  console.log("PDF generado y guardado en:", outputPath);

  // Retorna el buffer del PDF si prefieres enviarlo directamente sin guardar en disco
  return pdf;
};

module.exports.createPDF = createPDF;
