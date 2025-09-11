const jwt = require("jsonwebtoken");
const config = require("config");

function auth(req, res, next) {
  console.log("=== MIDDLEWARE AUTH ===");
  console.log("URL:", req.url);
  console.log("Method:", req.method);
  console.log("Headers:", req.headers);
  
  const token = req.header("xAuthToken");
  console.log("Token recibido:", token ? "PRESENTE" : "AUSENTE");
  
  if (!token) {
    console.log("❌ ERROR: No token provided");
    return res
      .status(401)
      .send({ error: true, message: "Acces denied, no token provided." });
  }
  
  console.log("Token:", token);
  try {
    const decoded = jwt.verify(token, config.get("jwtPrivateKey"));
    console.log("✅ Token válido, usuario:", decoded);
    req.user = decoded;
    next();
  } catch (ex) {
    console.log("❌ ERROR: Token inválido:", ex.message);
    res.status(400).send({ error: true, message: ex.message });
  }
}

module.exports = auth;
