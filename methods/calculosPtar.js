interface InputsPlanta {
  caudal: number; // m³/día
  dqoEntrada: number; // mg/L
  sstEntrada: number; // mg/L
  nivelAgua: number; // m respecto al suelo
  norma: string; // Norma a cumplir (ej. "NOM-003-SEMARNAT-1997")
}

interface ModulosPlanta {
  trampaGrasas: object;
  carcamoRegulacion: object;
  biodigestor: object;
  reactorBiologico: object;
  clarificador: object;
  clorador: object;
  cisternaBombeo: object;
}

export const calcularPlanta = (inputs: InputsPlanta): ModulosPlanta => {
  const { caudal, dqoEntrada, sstEntrada, nivelAgua, norma } = inputs;

  // Trampa de grasas
  const tiempoRetencionGrasas = 20; // min típico
  const velocidadSedimentacionGrasas = 0.03; // m/s típica
  const volumenTrampaGrasas = (caudal * tiempoRetencionGrasas) / 1440; // m³
  const areaTrampaGrasas = volumenTrampaGrasas / velocidadSedimentacionGrasas;
  const longitudTrampa = Math.sqrt(areaTrampaGrasas) * 2; // Relación L:W = 2:1
  const anchoTrampa = longitudTrampa / 2;
  const profundidadTrampa = volumenTrampaGrasas / areaTrampaGrasas;

  const trampaGrasas = {
    volumen: volumenTrampaGrasas,
    area: areaTrampaGrasas,
    longitud: longitudTrampa,
    ancho: anchoTrampa,
    profundidad: profundidadTrampa,
  };

  // Cárcamo de regulación
  const tiempoRetencionCarcamo = 30; // min típico
  const volumenCarcamo = (caudal * tiempoRetencionCarcamo) / 1440; // m³
  const profundidadCarcamo = 3; // m típico
  const areaCarcamo = volumenCarcamo / profundidadCarcamo;

  const carcamoRegulacion = {
    volumen: volumenCarcamo,
    profundidad: profundidadCarcamo,
    area: areaCarcamo,
  };

  // Biodigestor
  const tiempoRetencionBiodigestor = 6 * 60; // 6 horas en min
  const volumenBiodigestor = (caudal * tiempoRetencionBiodigestor) / 1440; // m³
  const biodigestor = {
    volumen: volumenBiodigestor,
    tiempoRetencion: tiempoRetencionBiodigestor,
  };

  // Reactor biológico
  const eficienciaDQO = norma === "NOM-003-SEMARNAT-1997" ? 80 : 70; // % típica
  const dqoSalida = dqoEntrada * (1 - eficienciaDQO / 100); // mg/L
  const cargaOrganica = (caudal * (dqoEntrada - dqoSalida)) / 1000; // kg/día
  const volumenReactor = cargaOrganica / 0.6; // m³ basado en carga volumétrica

  const reactorBiologico = { volumen: volumenReactor, cargaOrganica };

  // Clarificador
  const velocidadSedimentacionClarificador = 0.02; // m/s típica
  const areaClarificador = caudal / (velocidadSedimentacionClarificador * 3600); // m²
  const tiempoRetencionClarificador = 120; // min típico
  const volumenClarificador = (caudal * tiempoRetencionClarificador) / 1440; // m³

  const clarificador = { area: areaClarificador, volumen: volumenClarificador };

  // Clorador
  const dosisCloro = norma === "NOM-003-SEMARNAT-1997" ? 1.5 : 1; // mg/L típica
  const tiempoRetencionClorador = 30; // min típico
  const volumenClorador = (caudal * tiempoRetencionClorador) / 1440; // m³

  const clorador = { volumen: volumenClorador, dosisCloro };

  // Cisterna de bombeo
  const ciclosPorDia = 4; // Número típico de ciclos de bombeo
  const volumenCisterna = caudal / ciclosPorDia;

  const cisternaBombeo = { volumen: volumenCisterna, ciclosPorDia };

  return {
    trampaGrasas,
    carcamoRegulacion,
    biodigestor,
    reactorBiologico,
    clarificador,
    clorador,
    cisternaBombeo,
  };
};
