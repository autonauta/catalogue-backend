const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { Event } = require("../models/Event");

router.get("/", async (req, res) => {
  try {
    const events = await Event.find();
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
    } = req.body;

    // Validación básica (puedes agregar más validaciones si lo necesitas)
    if (!name || !location) {
      return res.status(400).json({
        error: true,
        message: "Faltan datos obligatorios: nombre o ubicación.",
      });
    }

    const newEvent = new Event({
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
    });

    await newEvent.save();
    res.status(201).json({
      message: "Evento creado con éxito",
      id: newEvent._id,
      event: newEvent,
    });
  } catch (err) {
    console.error("Error al guardar evento:", err);
    res.status(500).json({ error: "No se pudo guardar el evento" });
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

module.exports = router;
