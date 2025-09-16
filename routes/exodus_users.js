const express = require("express");
const router = express.Router();
const { ExodusUser } = require("../models/ExodusUser");

// GET /exodus/users - Obtener todos los usuarios de Exodus
router.get("/", async (req, res) => {
  try {
    const users = await ExodusUser.find({}).select('-password');
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error("Error al obtener usuarios de Exodus:", error);
    res.status(500).json({
      success: false,
      message: "Error del servidor al obtener usuarios"
    });
  }
});

// GET /exodus/users/:id - Obtener un usuario específico
router.get("/:id", async (req, res) => {
  try {
    const user = await ExodusUser.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario de Exodus no encontrado"
      });
    }
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error("Error al obtener usuario de Exodus:", error);
    res.status(500).json({
      success: false,
      message: "Error del servidor al obtener usuario"
    });
  }
});

// PUT /exodus/users/:id - Actualizar un usuario
router.put("/:id", async (req, res) => {
  try {
    const { email, rol } = req.body;
    
    const user = await ExodusUser.findByIdAndUpdate(
      req.params.id,
      { email, rol },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario de Exodus no encontrado"
      });
    }
    
    res.json({
      success: true,
      message: "Usuario de Exodus actualizado correctamente",
      data: user
    });
  } catch (error) {
    console.error("Error al actualizar usuario de Exodus:", error);
    res.status(500).json({
      success: false,
      message: "Error del servidor al actualizar usuario"
    });
  }
});

// DELETE /exodus/users/:id - Eliminar un usuario
router.delete("/:id", async (req, res) => {
  try {
    const user = await ExodusUser.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario de Exodus no encontrado"
      });
    }
    
    res.json({
      success: true,
      message: "Usuario de Exodus eliminado correctamente",
      data: {
        id: user._id,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Error al eliminar usuario de Exodus:", error);
    res.status(500).json({
      success: false,
      message: "Error del servidor al eliminar usuario"
    });
  }
});

// GET /exodus/users/stats - Obtener estadísticas de usuarios
router.get("/stats/overview", async (req, res) => {
  try {
    const totalUsers = await ExodusUser.countDocuments();
    const adminUsers = await ExodusUser.countDocuments({ rol: "admin" });
    const clientUsers = await ExodusUser.countDocuments({ rol: "client" });
    
    res.json({
      success: true,
      data: {
        total: totalUsers,
        admins: adminUsers,
        clients: clientUsers
      }
    });
  } catch (error) {
    console.error("Error al obtener estadísticas de usuarios de Exodus:", error);
    res.status(500).json({
      success: false,
      message: "Error del servidor al obtener estadísticas"
    });
  }
});

module.exports = router;
