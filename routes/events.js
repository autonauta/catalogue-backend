const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { Event } = require("../models/Event");
const eventUpload = require("../middleware/eventUpload");
const multer = require("multer");
const { processUploadedFiles } = require("../utils/fileManager");

router.get("/", async (req, res) => {
  try {
    const { status, location, min_price, max_price, available } = req.query;
    
    // Construir filtros
    const filters = {};
    
    if (status) {
      filters.status = status;
    }
    
    if (location) {
      filters.location = { $regex: location, $options: 'i' };
    }
    
    if (min_price || max_price) {
      filters['price.full_price'] = {};
      if (min_price) filters['price.full_price'].$gte = Number(min_price);
      if (max_price) filters['price.full_price'].$lte = Number(max_price);
    }
    
    if (available === 'true') {
      filters.status = 'activo';
      filters.$expr = {
        $lt: ['$current_participants', '$max_participants']
      };
    }
    
    const events = await Event.find(filters).sort({ event_start_date: 1 });
    res.json(events);
  } catch (error) {
    console.error("Error al obtener eventos:", error.message);
    res.status(500).json({ error: "Error al obtener los eventos" });
  }
});

// TODO: Agregar middleware auth cuando se implemente el login
router.post("/create", (req, res, next) => {
  console.log("=== MIDDLEWARE PRE-MULTER ===");
  console.log("Content-Type:", req.headers['content-type']);
  console.log("Content-Length:", req.headers['content-length']);
  console.log("Body antes de multer:", req.body);
  console.log("Files antes de multer:", req.files);
  next();
}, (err, req, res, next) => {
  // Middleware de manejo de errores de multer
  if (err instanceof multer.MulterError) {
    console.error("=== ERROR DE MULTER ===");
    console.error("Tipo de error:", err.code);
    console.error("Mensaje:", err.message);
    console.error("Field:", err.field);
    return res.status(400).json({
      error: true,
      message: `Error al procesar archivos: ${err.message}`,
      code: err.code
    });
  } else if (err) {
    console.error("=== ERROR GENERAL ===");
    console.error("Error:", err.message);
    return res.status(400).json({
      error: true,
      message: `Error al procesar archivos: ${err.message}`
    });
  }
  next();
}, eventUpload.any(), (req, res, next) => {
  console.log("=== MIDDLEWARE POST-MULTER ===");
  console.log("Body después de multer:", req.body);
  console.log("Files después de multer:", req.files);
  
  if (req.files && req.files.length > 0) {
    console.log("=== DETALLES DE ARCHIVOS RECIBIDOS ===");
    req.files.forEach((file, index) => {
      console.log(`Archivo ${index + 1}:`, {
        fieldname: file.fieldname,
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size
      });
    });
  }
  
  next();
}, async (req, res) => {
  try {
    // LOG: Mostrar todo lo que llega del frontend
    console.log("=== INICIO CREACIÓN DE EVENTO ===");
    console.log("Headers:", req.headers);
    console.log("Body completo:", JSON.stringify(req.body, null, 2));
    console.log("Files:", req.files);
    console.log("Tipo de body:", typeof req.body);
    console.log("Keys del body:", Object.keys(req.body || {}));

    // Extrae los campos del modelo Event desde el body
    const {
      name,
      location,
      departure_location,
      event_start_date,
      event_end_date,
      description,
      includes,
      price,
      status,
      max_participants,
      current_participants
    } = req.body;

    // Procesar archivos de imagen usando las utilidades
    const imagePaths = await processUploadedFiles(req.files, name);
    const { img: imgPath, img_secondary: imgSecondaryPath, img_terciary: imgTerciaryPath } = imagePaths;

    // LOG: Mostrar cada campo extraído
    console.log("=== CAMPOS EXTRAÍDOS ===");
    console.log("name:", name, "| tipo:", typeof name);
    console.log("location:", location, "| tipo:", typeof location);
    console.log("departure_location:", departure_location, "| tipo:", typeof departure_location);
    console.log("event_start_date:", event_start_date, "| tipo:", typeof event_start_date);
    console.log("event_end_date:", event_end_date, "| tipo:", typeof event_end_date);
    console.log("img:", imgPath, "| tipo:", typeof imgPath);
    console.log("img_secondary:", imgSecondaryPath, "| tipo:", typeof imgSecondaryPath);
    console.log("img_terciary:", imgTerciaryPath, "| tipo:", typeof imgTerciaryPath);
    console.log("description:", description, "| tipo:", typeof description);
    console.log("includes:", includes, "| tipo:", typeof includes);
    console.log("price:", price, "| tipo:", typeof price);
    console.log("status:", status, "| tipo:", typeof status);
    console.log("max_participants:", max_participants, "| tipo:", typeof max_participants);
    console.log("current_participants:", current_participants, "| tipo:", typeof current_participants);

    // Validación básica (las validaciones del modelo se encargan del resto)
    if (!name || !location) {
      console.log("❌ ERROR: Faltan datos obligatorios");
      console.log("name presente:", !!name);
      console.log("location presente:", !!location);
      return res.status(400).json({
        error: true,
        message: "Faltan datos obligatorios: nombre y ubicación.",
      });
    }

    // Mantener includes tal como llega del frontend
    let includesArray = includes;

    // Procesar price si viene como string
    let priceObject = {};
    if (price) {
      if (typeof price === 'string') {
        try {
          priceObject = JSON.parse(price);
        } catch (e) {
          console.log("Error parsing price:", e);
        }
      } else if (typeof price === 'object') {
        priceObject = price;
      }
    }

    // LOG: Mostrar el objeto que se va a crear
    const eventData = {
      name,
      location,
      departure_location,
      event_start_date: event_start_date ? new Date(event_start_date) : undefined,
      event_end_date: event_end_date ? new Date(event_end_date) : undefined,
      img: imgPath,
      img_secondary: imgSecondaryPath,
      img_terciary: imgTerciaryPath,
      description,
      includes: includesArray,
      price: priceObject,
      status,
      max_participants: max_participants ? Number(max_participants) : undefined,
      current_participants: current_participants || []
    };

    console.log("=== OBJETO EVENTO A CREAR ===");
    console.log(JSON.stringify(eventData, null, 2));

    const newEvent = new Event(eventData);

    console.log("=== ANTES DE GUARDAR ===");
    console.log("Evento creado:", newEvent);

    await newEvent.save();
    
    console.log("✅ Evento guardado exitosamente");
    console.log("ID:", newEvent._id);
    console.log("=== FIN CREACIÓN DE EVENTO ===");

    res.status(201).json({
      message: "Evento creado con éxito",
      id: newEvent._id,
      event: newEvent,
    });
  } catch (err) {
    console.error("❌ ERROR AL GUARDAR EVENTO:");
    console.error("Tipo de error:", err.name);
    console.error("Mensaje:", err.message);
    console.error("Stack completo:", err.stack);
    
    // Si es error de validación, mostrar detalles
    if (err.name === 'ValidationError') {
      console.error("=== ERRORES DE VALIDACIÓN ===");
      Object.keys(err.errors).forEach(key => {
        console.error(`Campo ${key}:`, err.errors[key].message);
      });
      
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        error: true,
        message: "Error de validación",
        details: errors 
      });
    }
    
    res.status(500).json({ 
      error: true,
      message: "No se pudo guardar el evento",
      debug: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    console.log("Typeof: ", typeof req.params.id);
    console.log("ID: ", req.params.id);
    const event = await Event.findById(req.params.id);
    if (!event)
      return res.status(404).json({ message: "Evento no encontrado" });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener el evento" });
  }
});

// TODO: Agregar middleware auth cuando se implemente el login
router.put("/update/:id", (req, res, next) => {
  console.log("=== MIDDLEWARE PRE-MULTER UPDATE ===");
  console.log("Content-Type:", req.headers['content-type']);
  console.log("Content-Length:", req.headers['content-length']);
  next();
}, (err, req, res, next) => {
  // Middleware de manejo de errores de multer
  if (err instanceof multer.MulterError) {
    console.error("=== ERROR DE MULTER EN UPDATE ===");
    console.error("Tipo de error:", err.code);
    console.error("Mensaje:", err.message);
    console.error("Field:", err.field);
    return res.status(400).json({
      error: true,
      message: `Error al procesar archivos: ${err.message}`,
      code: err.code
    });
  } else if (err) {
    console.error("=== ERROR GENERAL EN UPDATE ===");
    console.error("Error:", err.message);
    return res.status(400).json({
      error: true,
      message: `Error al procesar archivos: ${err.message}`
    });
  }
  next();
}, eventUpload.any(), (req, res, next) => {
  console.log("=== MIDDLEWARE POST-MULTER UPDATE ===");
  console.log("Body después de multer:", req.body);
  console.log("Files después de multer:", req.files);
  
  if (req.files && req.files.length > 0) {
    console.log("=== DETALLES DE ARCHIVOS RECIBIDOS ===");
    req.files.forEach((file, index) => {
      console.log(`Archivo ${index + 1}:`, {
        fieldname: file.fieldname,
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size
      });
    });
  }
  
  next();
}, async (req, res) => {
  try {
    console.log("=== INICIO ACTUALIZACIÓN DE EVENTO ===");
    console.log("ID del evento:", req.params.id);
    console.log("Body completo:", JSON.stringify(req.body, null, 2));
    console.log("Files:", req.files);

    // Buscar el evento existente
    const existingEvent = await Event.findById(req.params.id);
    if (!existingEvent) {
      return res.status(404).json({ 
        error: true,
        message: "Evento no encontrado" 
      });
    }

    console.log("Evento existente:", {
      name: existingEvent.name,
      img: existingEvent.img,
      img_secondary: existingEvent.img_secondary,
      img_terciary: existingEvent.img_terciary
    });

    // Importar la función de manejo de archivos
    const { handleEventFileUpdate } = require("../utils/fileManager");

    // Manejar la actualización de archivos
    const updateData = await handleEventFileUpdate(
      existingEvent, 
      req.body, 
      req.files
    );

    console.log("=== DATOS DE ACTUALIZACIÓN FINALES ===");
    console.log(JSON.stringify(updateData, null, 2));

    // Actualizar el evento en la base de datos
    const updated = await Event.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    console.log("✅ Evento actualizado exitosamente");
    console.log("=== FIN ACTUALIZACIÓN DE EVENTO ===");

    res.json({ 
      message: "Evento actualizado exitosamente", 
      data: updated 
    });
  } catch (err) {
    console.error("❌ ERROR AL ACTUALIZAR EVENTO:");
    console.error("Tipo de error:", err.name);
    console.error("Mensaje:", err.message);
    console.error("Stack completo:", err.stack);
    
    // Si es error de validación, mostrar detalles
    if (err.name === 'ValidationError') {
      console.error("=== ERRORES DE VALIDACIÓN ===");
      Object.keys(err.errors).forEach(key => {
        console.error(`Campo ${key}:`, err.errors[key].message);
      });
      
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        error: true,
        message: "Error de validación",
        details: errors 
      });
    }
    
    res.status(500).json({ 
      error: true,
      message: "No se pudo actualizar el evento",
      debug: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// TODO: Agregar middleware auth cuando se implemente el login
router.delete("/delete/:id", async (req, res) => {
  try {
    console.log("=== INICIO ELIMINACIÓN DE EVENTO ===");
    console.log("ID del evento:", req.params.id);

    // Buscar el evento antes de eliminarlo
    const eventToDelete = await Event.findById(req.params.id);
    if (!eventToDelete) {
      return res.status(404).json({ 
        error: true,
        message: "Evento no encontrado" 
      });
    }

    console.log("Evento a eliminar:", {
      name: eventToDelete.name,
      img: eventToDelete.img,
      img_secondary: eventToDelete.img_secondary,
      img_terciary: eventToDelete.img_terciary
    });

    // Eliminar archivos del evento
    const { deleteEventFolder, getEventFolderPath } = require("../utils/fileManager");
    const eventFolder = getEventFolderPath(eventToDelete.name);
    
    try {
      await deleteEventFolder(eventFolder);
      console.log("✅ Archivos del evento eliminados");
    } catch (fileError) {
      console.error("⚠️ Error al eliminar archivos:", fileError.message);
      // Continuar con la eliminación del evento aunque falle la eliminación de archivos
    }

    // Eliminar el evento de la base de datos
    const deleted = await Event.findByIdAndDelete(req.params.id);
    
    console.log("✅ Evento eliminado exitosamente");
    console.log("=== FIN ELIMINACIÓN DE EVENTO ===");

    res.json({ 
      message: "Evento eliminado exitosamente",
      deletedEvent: {
        id: deleted._id,
        name: deleted.name
      }
    });
  } catch (err) {
    console.error("❌ ERROR AL ELIMINAR EVENTO:");
    console.error("Tipo de error:", err.name);
    console.error("Mensaje:", err.message);
    
    res.status(500).json({ 
      error: true,
      message: "No se pudo eliminar el evento",
      debug: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Ruta para agregar un participante a un evento
router.post("/:id/participant", async (req, res) => {
  try {
    const { participantName } = req.body;
    
    if (!participantName) {
      return res.status(400).json({ 
        error: true,
        message: "El nombre del participante es requerido" 
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    await event.addParticipant(participantName);
    res.json({ 
      message: "Participante agregado exitosamente",
      participantName: participantName,
      current_participants: event.current_participants,
      participant_count: event.participant_count,
      is_full: event.is_full
    });
  } catch (err) {
    if (err.message === 'El evento está lleno' || 
        err.message === 'Este participante ya está registrado en el evento' ||
        err.message === 'El nombre del participante es requerido') {
      return res.status(400).json({ 
        error: true,
        message: err.message 
      });
    }
    res.status(500).json({ 
      error: true,
      message: "Error al agregar participante" 
    });
  }
});

// Ruta para remover un participante de un evento
router.delete("/:id/participant", async (req, res) => {
  try {
    const { participantName } = req.body;
    
    if (!participantName) {
      return res.status(400).json({ 
        error: true,
        message: "El nombre del participante es requerido" 
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    await event.removeParticipant(participantName);
    res.json({ 
      message: "Participante removido exitosamente",
      participantName: participantName,
      current_participants: event.current_participants,
      participant_count: event.participant_count
    });
  } catch (err) {
    if (err.message === 'El participante no está registrado en este evento' ||
        err.message === 'No hay participantes registrados' ||
        err.message === 'El nombre del participante es requerido') {
      return res.status(400).json({ 
        error: true,
        message: err.message 
      });
    }
    res.status(500).json({ 
      error: true,
      message: "Error al remover participante" 
    });
  }
});

// Ruta para obtener estadísticas de un evento
router.get("/:id/stats", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    res.json({
      name: event.name,
      current_participants: event.current_participants,
      participant_count: event.participant_count,
      max_participants: event.max_participants,
      is_full: event.is_full,
      is_available: event.is_available,
      status: event.status,
      occupancy_rate: event.max_participants ? 
        Math.round((event.participant_count / event.max_participants) * 100) : 0
    });
  } catch (err) {
    res.status(500).json({ message: "Error al obtener estadísticas" });
  }
});

// Ruta para verificar si un participante está registrado
router.get("/:id/participant/:name", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    const participantName = decodeURIComponent(req.params.name);
    const isRegistered = event.isParticipantRegistered(participantName);

    res.json({
      participantName: participantName,
      isRegistered: isRegistered,
      eventName: event.name
    });
  } catch (err) {
    res.status(500).json({ message: "Error al verificar participante" });
  }
});

module.exports = router;
