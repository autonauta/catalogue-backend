const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { Event } = require("../models/Event");
const eventUpload = require("../middleware/eventUpload");

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
      filters.status = 'published';
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
}, eventUpload.fields([
  { name: 'img', maxCount: 1 },
  { name: 'img_secondary', maxCount: 1 },
  { name: 'img_terciary', maxCount: 1 }
]), (req, res, next) => {
  console.log("=== MIDDLEWARE POST-MULTER ===");
  console.log("Body después de multer:", req.body);
  console.log("Files después de multer:", req.files);
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

    // Procesar archivos de imagen
    let imgPath = '';
    let imgSecondaryPath = '';
    let imgTerciaryPath = '';

    if (req.files) {
      if (req.files.img && req.files.img[0]) {
        // Crear la ruta relativa con el nombre del evento
        const cleanEventName = name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        imgPath = `/files/events/${cleanEventName}/${req.files.img[0].filename}`;
        console.log("Imagen principal guardada:", imgPath);
        console.log("Detalles del archivo:", req.files.img[0]);
      }
      
      if (req.files.img_secondary && req.files.img_secondary[0]) {
        // Crear la ruta relativa con el nombre del evento
        const cleanEventName = name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        imgSecondaryPath = `/files/events/${cleanEventName}/${req.files.img_secondary[0].filename}`;
        console.log("Imagen secundaria guardada:", imgSecondaryPath);
        console.log("Detalles del archivo:", req.files.img_secondary[0]);
      }
      
      if (req.files.img_terciary && req.files.img_terciary[0]) {
        // Crear la ruta relativa con el nombre del evento
        const cleanEventName = name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        imgTerciaryPath = `/files/events/${cleanEventName}/${req.files.img_terciary[0].filename}`;
        console.log("Imagen terciaria guardada:", imgTerciaryPath);
        console.log("Detalles del archivo:", req.files.img_terciary[0]);
      }
    }

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

    // Procesar includes si viene como string
    let includesArray = [];
    if (includes) {
      if (typeof includes === 'string') {
        includesArray = includes.split(',').map(item => item.trim()).filter(item => item);
      } else if (Array.isArray(includes)) {
        includesArray = includes;
      }
    }

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
router.put("/update/:id", async (req, res) => {
  try {
    const updated = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated)
      return res.status(404).json({ message: "Evento no encontrado" });
    res.json({ message: "Evento actualizado", data: updated });
  } catch (err) {
    res.status(500).json({ message: "Error al actualizar evento" });
  }
});

// TODO: Agregar middleware auth cuando se implemente el login
router.delete("/delete/:id", async (req, res) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Evento no encontrado" });
    res.json({ message: "Evento eliminado" });
  } catch (err) {
    res.status(500).json({ message: "Error al borrar evento" });
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
