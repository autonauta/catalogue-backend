const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const config = require("config");
const auth = require("../middleware/auth");

const { User } = require("../models/User"); // Asegúrate de que esté bien el path

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .send({ error: true, message: "Usuario no encontrado" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res
        .status(400)
        .send({ error: true, message: "Contraseña incorrecta" });

    const token = jwt.sign(
      { _id: user._id, email: user.email, rol: user.rol },
      config.get("jwtPrivateKey"),
      { expiresIn: "24h" }
    );

    res.send({
      token,
      user: { _id: user._id, email: user.email, rol: user.rol },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: true, message: "Error del servidor" });
  }
});

// GET /auth/create-user
router.post("/create", async (req, res) => {
  const { email, password, rol } = req.body;

  try {
    const newUser = new User({ email, password, rol });
    await newUser.save();

    res.status(201).send({
      success: true,
      message: "Usuario creado correctamente.",
      credentials: {
        email,
        password,
        rol,
      },
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).send({
      success: false,
      message: "Error del servidor al crear usuario.",
    });
  }
});

router.get("/validate", auth, (req, res) => {
  // El middleware ya puso el decoded token en req.user
  const { _id, email, rol } = req.user;
  res.send({ user: { id: _id, email, rol } });
});

module.exports = router;
