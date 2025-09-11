const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { Event } = require("../models/Event");

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

router.post("/create", auth, async (req, res) => {
  try {
    // Extrae los campos del modelo Event desde el body
    const {
      name,
      location,
      departure_location,
      event_start_date,
      event_end_date,
      img,
      img_secondary,
      description,
      includes,
      price,
      status,
      max_participants,
      current_participants
    } = req.body;

    // Validación básica (las validaciones del modelo se encargan del resto)
    if (!name || !location) {
      return res.status(400).json({
        error: true,
        message: "Faltan datos obligatorios: nombre y ubicación.",
      });
    }

    const newEvent = new Event({
      name,
      location,
      departure_location,
      event_start_date: event_start_date ? new Date(event_start_date) : undefined,
      event_end_date: event_end_date ? new Date(event_end_date) : undefined,
      img,
      img_secondary,
      description,
      includes,
      price,
      status,
      max_participants,
      current_participants
    });

    await newEvent.save();
    res.status(201).json({
      message: "Evento creado con éxito",
      id: newEvent._id,
      event: newEvent,
    });
  } catch (err) {
    console.error("Error al guardar evento:", err);
    
    // Manejo de errores de validación de Mongoose
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        error: true,
        message: "Error de validación",
        details: errors 
      });
    }
    
    res.status(500).json({ 
      error: true,
      message: "No se pudo guardar el evento" 
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

router.put("/update/:id", auth, async (req, res) => {
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

router.delete("/delete/:id", auth, async (req, res) => {
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
