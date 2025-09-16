const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = function (req, res, next) {
  const token = req.header("x-auth-token") || req.header("Authorization")?.replace("Bearer ", "");
  
  if (!token) {
    return res.status(401).json({ 
      error: true, 
      message: "Acceso denegado. No se proporcionó token de autenticación para Exodus." 
    });
  }

  try {
    const decoded = jwt.verify(token, config.get("jwtPrivateKey"));
    
    // Verificar que el token sea del sistema Exodus
    if (decoded.system !== "exodus") {
      return res.status(403).json({
        error: true,
        message: "Token no válido para el sistema Exodus"
      });
    }
    
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).json({ 
      error: true, 
      message: "Token de Exodus inválido." 
    });
  }
};
