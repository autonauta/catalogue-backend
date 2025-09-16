const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const config = require("config");
const exodusAuth = require("../middleware/exodusAuth");

const { ExodusUser } = require("../models/ExodusUser");

// POST /exodus/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await ExodusUser.findOne({ email });
    if (!user)
      return res
        .status(400)
        .send({ error: true, message: "Usuario de Exodus no encontrado" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res
        .status(400)
        .send({ error: true, message: "Contraseña incorrecta" });

    const token = jwt.sign(
      { _id: user._id, email: user.email, rol: user.rol, system: "exodus" },
      config.get("jwtPrivateKey"),
      { expiresIn: "24h" }
    );

    res.send({
      token,
      user: { _id: user._id, email: user.email, rol: user.rol, system: "exodus" },
    });
  } catch (err) {
    console.error("Error en login de Exodus:", err);
    res.status(500).send({ error: true, message: "Error del servidor" });
  }
});

// POST /exodus/auth/create
router.post("/create", async (req, res) => {
  const { email, password, rol } = req.body;

  try {
    // Verificar si el usuario ya existe
    const existingUser = await ExodusUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "El email ya está registrado en el sistema de Exodus"
      });
    }

    const newUser = new ExodusUser({ email, password, rol });
    await newUser.save();

    res.status(201).send({
      success: true,
      message: "Usuario de Exodus creado correctamente.",
      credentials: {
        email,
        password,
        rol,
        system: "exodus"
      },
    });
  } catch (error) {
    console.error("Error al crear usuario de Exodus:", error);
    
    // Manejar errores de validación específicos
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: "Error de validación",
        details: errors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "El email ya está registrado en el sistema de Exodus"
      });
    }
    
    res.status(500).send({
      success: false,
      message: "Error del servidor al crear usuario de Exodus.",
    });
  }
});

// GET /exodus/auth/validate
router.get("/validate", exodusAuth, (req, res) => {
  // El middleware ya puso el decoded token en req.user
  const { _id, email, rol, system } = req.user;
  
  // Verificar que el token sea del sistema Exodus
  if (system !== "exodus") {
    return res.status(403).json({
      error: true,
      message: "Token no válido para el sistema Exodus"
    });
  }
  
  res.send({ 
    user: { 
      id: _id, 
      email, 
      rol, 
      system: "exodus" 
    } 
  });
});

// POST /exodus/auth/change-password
router.post("/change-password", exodusAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Verificar que el token sea del sistema Exodus
    if (req.user.system !== "exodus") {
      return res.status(403).json({
        error: true,
        message: "Token no válido para el sistema Exodus"
      });
    }

    // Buscar el usuario
    const user = await ExodusUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: true,
        message: "Usuario de Exodus no encontrado"
      });
    }

    // Verificar la contraseña actual
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({
        error: true,
        message: "Contraseña actual incorrecta"
      });
    }

    // Actualizar la contraseña
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Contraseña actualizada correctamente"
    });
  } catch (error) {
    console.error("Error al cambiar contraseña de Exodus:", error);
    res.status(500).json({
      error: true,
      message: "Error del servidor al cambiar contraseña"
    });
  }
});

// POST /exodus/auth/logout
router.post("/logout", exodusAuth, (req, res) => {
  // En JWT no hay logout real del servidor, pero podemos invalidar el token del lado del cliente
  res.json({
    success: true,
    message: "Sesión cerrada correctamente"
  });
});

module.exports = router;
